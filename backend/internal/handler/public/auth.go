package public

import (
	"errors"
	"fmt"
	"log"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/email"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/service"
	"github.com/ps/backend/internal/token"
	"golang.org/x/crypto/bcrypt"
)

type AuthHandler struct {
	svc    *service.AuthService
	db     *pgxpool.Pool
	mailer *email.Client
}

func NewAuthHandler(svc *service.AuthService, db *pgxpool.Pool) *AuthHandler {
	return &AuthHandler{svc: svc, db: db}
}

// SetMailer — вызывается из main после создания handler'а
func (h *AuthHandler) SetMailer(cfg *config.Config) {
	h.mailer = email.New(cfg.ResendAPIKey, cfg.ResendFrom, cfg.AppName, cfg.SiteURL)
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}
	if body.Username == "" || body.Email == "" || len(body.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid fields"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)
	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	user, err := h.svc.Register(c.Context(), schema, body.Username, body.Email, body.Password, c.IP())
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) || errors.Is(err, service.ErrUsernameTaken) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		log.Printf("[Register] schema=%s err=%v", schema, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	pair, err := h.svc.Login(c.Context(), schema, tenant.ID, body.Email, body.Password, c.IP())
	if err != nil {
		log.Printf("[Register/Login] schema=%s err=%v", schema, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	s, _ := safeSchema(schema)
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.audit_log (user_id, event_type, severity, ip_address, payload)
		 VALUES ($1, 'user_registered', 'info', $2, $3)`, s),
		user.ID, c.IP(), fmt.Sprintf(`{"username":"%s","email":"%s"}`, user.Username, user.Email))

	setAuthCookies(c, pair)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var body struct {
		Identifier string `json:"email"` // accepts email OR username
		Password   string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)
	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	var pair *service.TokenPair
	var err error
	if strings.Contains(body.Identifier, "@") {
		pair, err = h.svc.Login(c.Context(), schema, tenant.ID, body.Identifier, body.Password, c.IP())
	} else {
		pair, err = h.svc.LoginByUsername(c.Context(), schema, tenant.ID, body.Identifier, body.Password, c.IP())
	}

	if err != nil {
		if errors.Is(err, service.ErrBadCredentials) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
		}
		if errors.Is(err, service.ErrUserBanned) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "banned"})
		}
		log.Printf("[Login] schema=%s err=%v", schema, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}

	setAuthCookies(c, pair)
	return c.JSON(fiber.Map{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	raw := c.Cookies("refresh_token")
	if raw == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing refresh token"})
	}

	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	pair, err := h.svc.Refresh(c.Context(), raw, tenant.ID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	setAuthCookies(c, pair)
	return c.JSON(fiber.Map{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{Name: "access_token", Value: "", MaxAge: -1, HTTPOnly: true})
	c.Cookie(&fiber.Cookie{Name: "refresh_token", Value: "", MaxAge: -1, HTTPOnly: true})
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	claims := c.Locals(middleware.ClaimsKey()).(*token.Claims)
	schema := c.Locals(middleware.SchemaKey()).(string)

	user, err := h.svc.GetUserByID(c.Context(), schema, claims.UserID)
	if err != nil {
		log.Printf("[Me] schema=%s user_id=%s err=%v", schema, claims.UserID, err)
		return c.JSON(fiber.Map{
			"id":        claims.UserID,
			"username":  "",
			"email":     "",
			"role":      claims.Role,
			"tenant_id": claims.TenantID,
		})
	}

	return c.JSON(fiber.Map{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"role":      user.Role,
		"tenant_id": claims.TenantID,
	})
}

func (h *AuthHandler) ChangePassword(c *fiber.Ctx) error {
	claims := c.Locals(middleware.ClaimsKey()).(*token.Claims)
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		OldPassword string `json:"old_password"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&body); err != nil || body.OldPassword == "" || len(body.NewPassword) < 8 {
		return c.Status(400).JSON(fiber.Map{"error": "new password must be at least 8 characters"})
	}

	var currentHash string
	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT password_hash FROM %s.users WHERE id = $1`, s), claims.UserID,
	).Scan(&currentHash)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "user not found"})
	}

	if err := bcrypt.CompareHashAndPassword([]byte(currentHash), []byte(body.OldPassword)); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "current password is incorrect"})
	}

	newHash, err := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "internal"})
	}

	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.users SET password_hash = $1 WHERE id = $2`, s), string(newHash), claims.UserID)

	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.audit_log (user_id, event_type, severity, ip_address, payload)
		 VALUES ($1, 'password_changed', 'info', $2, '{}')`, s),
		claims.UserID, c.IP())

	return c.JSON(fiber.Map{"ok": true})
}

func (h *AuthHandler) RequestPasswordReset(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		Email string `json:"email"`
	}
	if err := c.BodyParser(&body); err != nil || body.Email == "" {
		return c.Status(400).JSON(fiber.Map{"error": "email required"})
	}

	var userID string
	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT id FROM %s.users WHERE email = $1`, s), body.Email,
	).Scan(&userID)
	if err != nil {
		// Не раскрываем существование email
		return c.JSON(fiber.Map{"ok": true})
	}

	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.reset_tokens (user_id, token, expires_at)
		 VALUES ($1, gen_random_uuid()::text, NOW() + INTERVAL '1 hour')
		 ON CONFLICT (user_id) DO UPDATE
		   SET token = gen_random_uuid()::text,
		       expires_at = NOW() + INTERVAL '1 hour',
		       created_at = NOW()`, s), userID)

	var resetToken string
	_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT token FROM %s.reset_tokens WHERE user_id = $1`, s), userID,
	).Scan(&resetToken)

	// Отправляем письмо
	if h.mailer != nil {
		if err := h.mailer.SendPasswordReset(body.Email, resetToken); err != nil {
			log.Printf("[PasswordReset] email send error: %v", err)
		}
	}
	log.Printf("[PasswordReset] user=%s token=%s", userID, resetToken)

	return c.JSON(fiber.Map{"ok": true})
}

func (h *AuthHandler) ConfirmPasswordReset(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		Email       string `json:"email"`
		Token       string `json:"token"`
		NewPassword string `json:"new_password"`
	}
	if err := c.BodyParser(&body); err != nil || body.Token == "" || len(body.NewPassword) < 8 {
		return c.Status(400).JSON(fiber.Map{"error": "invalid request"})
	}

	var userID string
	var expires time.Time
	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT rt.user_id, rt.expires_at FROM %s.reset_tokens rt
		 JOIN %s.users u ON u.id = rt.user_id
		 WHERE u.email = $1 AND rt.token = $2`, s, s),
		body.Email, body.Token,
	).Scan(&userID, &expires)

	if err != nil || time.Now().After(expires) {
		return c.Status(400).JSON(fiber.Map{"error": "invalid or expired token"})
	}

	newHash, _ := bcrypt.GenerateFromPassword([]byte(body.NewPassword), bcrypt.DefaultCost)
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.users SET password_hash = $1 WHERE id = $2`, s), string(newHash), userID)
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`DELETE FROM %s.reset_tokens WHERE user_id = $1`, s), userID)
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.audit_log (user_id, event_type, severity, ip_address, payload)
		 VALUES ($1, 'password_reset', 'info', $2, '{}')`, s),
		userID, c.IP())

	return c.JSON(fiber.Map{"ok": true})
}

func setAuthCookies(c *fiber.Ctx, pair *service.TokenPair) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    pair.AccessToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    pair.RefreshToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		MaxAge:   int(pair.ExpiresAt.Unix()),
	})
}
