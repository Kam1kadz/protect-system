package service

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/repo"
	"github.com/ps/backend/internal/storage"
)

var (
	ErrLicenseNotFound   = errors.New("license not found")
	ErrLicenseInactive   = errors.New("license inactive")
	ErrLicenseExpired    = errors.New("license expired")
	ErrHWIDMismatch      = errors.New("hwid mismatch")
	ErrChallengeExpired  = errors.New("challenge expired or not found")
	ErrBadResponse       = errors.New("invalid challenge response")
	ErrNoPayload         = errors.New("payload not found for this version")
	ErrSessionNotFound   = errors.New("session not found")
)

type LoaderService struct {
	licenses *repo.LicenseRepo
	users    *repo.UserRepo
	rdb      *redis.Client
	store    *storage.MinioClient
	cfg      *config.Config
}

func NewLoaderService(
	licenses *repo.LicenseRepo,
	users *repo.UserRepo,
	rdb *redis.Client,
	store *storage.MinioClient,
	cfg *config.Config,
) *LoaderService {
	return &LoaderService{
		licenses: licenses,
		users:    users,
		rdb:      rdb,
		store:    store,
		cfg:      cfg,
	}
}

type ChallengeResult struct {
	Challenge string `json:"challenge"`
}

type AuthResult struct {
    SessionToken  string    `json:"session_token"`
    SessionKey    string    `json:"session_key"`
    LauncherToken string    `json:"launcher_token"`
    ExpiresAt     time.Time `json:"expires_at"`
    Username      string    `json:"username"`
    PlanName      string    `json:"plan_name"`
}

// GenerateChallenge verifies the license exists and returns a challenge.
func (s *LoaderService) GenerateChallenge(ctx context.Context, schema, licenseKey, hwid string) (*ChallengeResult, error) {
	lic, err := s.licenses.FindByKey(ctx, schema, licenseKey)
	if err != nil {
		return nil, ErrLicenseNotFound
	}
	if lic.Status != model.LicenseActive {
		return nil, ErrLicenseInactive
	}
	if lic.ExpiresAt.Before(time.Now()) {
		return nil, ErrLicenseExpired
	}
	if lic.HWIDSnapshot != nil && *lic.HWIDSnapshot != "" && *lic.HWIDSnapshot != hwid {
		return nil, ErrHWIDMismatch
	}

	challenge, err := crypto.RandomHex(32)
	if err != nil {
		return nil, fmt.Errorf("gen challenge: %w", err)
	}

	rkey := challengeRedisKey(schema, licenseKey)
	if err := s.rdb.Set(ctx, rkey, challenge, 30*time.Second).Err(); err != nil {
		return nil, fmt.Errorf("store challenge: %w", err)
	}

	return &ChallengeResult{Challenge: challenge}, nil
}

// Authenticate verifies the HMAC response and creates a loader session.
func (s *LoaderService) Authenticate(
	ctx context.Context,
	schema, tenantSlug, licenseKey, hwid, challenge, response, loaderVersion, mcVersion string,
) (*AuthResult, error) {
	rkey := challengeRedisKey(schema, licenseKey)
	stored, err := s.rdb.GetDel(ctx, rkey).Result()
	if err != nil {
		return nil, ErrChallengeExpired
	}
	if stored != challenge {
		return nil, ErrChallengeExpired
	}

	lic, err := s.licenses.FindByKey(ctx, schema, licenseKey)
	if err != nil {
		return nil, ErrLicenseNotFound
	}
	if lic.Status != model.LicenseActive || lic.ExpiresAt.Before(time.Now()) {
		return nil, ErrLicenseInactive
	}
	if lic.SecretKey == nil || *lic.SecretKey == "" {
		return nil, ErrLicenseNotFound
	}

	expected := computeHMAC(*lic.SecretKey, challenge+"|"+hwid)
	if !hmac.Equal([]byte(response), []byte(expected)) {
		return nil, ErrBadResponse
	}

	if lic.HWIDSnapshot == nil || *lic.HWIDSnapshot == "" {
		_ = s.licenses.SetHWID(ctx, schema, lic.ID, hwid)
	}

	user, err := s.users.FindByID(ctx, schema, lic.UserID)
	if err != nil {
		return nil, fmt.Errorf("load user: %w", err)
	}

	plan, err := s.licenses.FindPlan(ctx, schema, lic.PlanID)
	if err != nil {
		return nil, fmt.Errorf("load plan: %w", err)
	}

	tokenRaw, err := crypto.RandomHex(32)
	if err != nil {
		return nil, fmt.Errorf("gen token: %w", err)
	}
	tokenHash := crypto.HashSHA256Hex([]byte(tokenRaw))

	mcv := model.MCVersion(mcVersion)
	exp := time.Now().Add(8 * time.Hour)

	sess := &model.Session{
		UserID:           user.ID,
		LicenseID:        lic.ID,
		TokenHash:        tokenHash,
		HWID:             hwid,
		IPAddress:        "",
		LoaderVersion:    &loaderVersion,
		MinecraftVersion: (*string)(&mcv),
		ExpiresAt:        exp,
	}
	if err := s.users.CreateSession(ctx, schema, sess); err != nil {
		return nil, fmt.Errorf("create session: %w", err)
	}

	sessionID := tokenHash
	sessionKey := hex.EncodeToString(crypto.DeriveKey(s.cfg.MasterKey, "sk:"+sessionID))

	_ = s.rdb.Set(ctx, sessionRedisKey(schema, tokenHash), lic.PlanID+":"+mcVersion, exp.Sub(time.Now()))

	launcherToken := LauncherTokenFor(s.cfg.MasterKey, tokenHash, tokenRaw)

	return &AuthResult{
        SessionToken:  tokenRaw,
        SessionKey:    sessionKey,
        LauncherToken: launcherToken,
        ExpiresAt:     exp,
        Username:      user.Username,
        PlanName:      plan.DisplayName,
    }, nil
}

// StreamPayload fetches the encrypted PSPL from MinIO,
// transcodes it under session_key and streams it to w.
func (s *LoaderService) StreamPayload(ctx context.Context, schema, tenantSlug, sessionToken string, w io.Writer) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))

	cached, err := s.rdb.Get(ctx, sessionRedisKey(schema, tokenHash)).Result()
	if err != nil {
		return ErrSessionNotFound
	}

	var planID, mcVersion string
	fmt.Sscanf(cached, "%36s:%s", &planID, &mcVersion)

	plan, err := s.licenses.FindPlan(ctx, schema, planID)
	if err != nil || plan.JarStorageKey == nil {
		return ErrNoPayload
	}

	objKey := storage.PayloadKey(tenantSlug, *plan.JarStorageKey, mcVersion)
	rc, _, err := s.store.Get(ctx, objKey)
	if err != nil {
		return ErrNoPayload
	}
	defer rc.Close()

	jarKey := crypto.DeriveKey(s.cfg.MasterKey, "jar:"+planID)
	sessionKey := crypto.DeriveKey(s.cfg.MasterKey, "sk:"+tokenHash)

	return storage.Transcode(w, rc, jarKey, sessionKey)
}

// Heartbeat refreshes last_heartbeat_at in the session.
func (s *LoaderService) Heartbeat(ctx context.Context, schema, sessionToken string) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	sess, err := s.users.FindSession(ctx, schema, tokenHash)
	if err != nil {
		return ErrSessionNotFound
	}
	if sess.IsRevoked || sess.ExpiresAt.Before(time.Now()) {
		return ErrSessionNotFound
	}
	return s.users.HeartbeatSession(ctx, schema, sess.ID)
}

// Revoke marks the session as revoked.
func (s *LoaderService) Revoke(ctx context.Context, schema, sessionToken string) error {
	tokenHash := crypto.HashSHA256Hex([]byte(sessionToken))
	return s.users.RevokeSession(ctx, schema, tokenHash)
}

func computeHMAC(secretKey, data string) string {
	mac := hmac.New(sha256.New, []byte(secretKey))
	mac.Write([]byte(data))
	return hex.EncodeToString(mac.Sum(nil))
}

func challengeRedisKey(schema, licenseKey string) string {
	return fmt.Sprintf("chl:%s:%s", schema, crypto.HashSHA256Hex([]byte(licenseKey)))
}

func sessionRedisKey(schema, tokenHash string) string {
	return fmt.Sprintf("lsess:%s:%s", schema, tokenHash)
}