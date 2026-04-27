package config

import (
	"fmt"
	"os"
	"strconv"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	PublicAddr  string
	AdminAddr   string
	DatabaseURL string
	RedisURL    string

	JWTAccessSecret  []byte
	JWTRefreshSecret []byte
	JWTAccessTTL     time.Duration
	JWTRefreshTTL    time.Duration

	MasterKey []byte

	MinioEndpoint  string
	MinioAccessKey string
	MinioSecretKey string
	MinioBucket    string
	MinioUseSSL    bool

	AdminSecret      string
	HMACDrift        int64
	NonceTTL         int
}

func Load() (*Config, error) {
	_ = godotenv.Load()

	masterHex := mustEnv("MASTER_KEY")
	if len(masterHex) != 64 {
		return nil, fmt.Errorf("MASTER_KEY must be 64 hex chars")
	}
	masterKey, err := hexDecode(masterHex)
	if err != nil {
		return nil, fmt.Errorf("MASTER_KEY: %w", err)
	}

	accessTTL, err := time.ParseDuration(getEnv("JWT_ACCESS_TTL", "15m"))
	if err != nil {
		return nil, fmt.Errorf("JWT_ACCESS_TTL: %w", err)
	}
	refreshTTL, err := time.ParseDuration(getEnv("JWT_REFRESH_TTL", "720h"))
	if err != nil {
		return nil, fmt.Errorf("JWT_REFRESH_TTL: %w", err)
	}

	drift, _ := strconv.ParseInt(getEnv("HMAC_TIMESTAMP_DRIFT", "30"), 10, 64)
	nonceTTL, _ := strconv.Atoi(getEnv("NONCE_TTL", "120"))

	return &Config{
		PublicAddr:       getEnv("PUBLIC_ADDR", ":8080"),
		AdminAddr:        getEnv("ADMIN_ADDR", ":8081"),
		DatabaseURL:      mustEnv("DATABASE_URL"),
		RedisURL:         mustEnv("REDIS_URL"),
		JWTAccessSecret:  []byte(mustEnv("JWT_ACCESS_SECRET")),
		JWTRefreshSecret: []byte(mustEnv("JWT_REFRESH_SECRET")),
		JWTAccessTTL:     accessTTL,
		JWTRefreshTTL:    refreshTTL,
		MasterKey:        masterKey,
		MinioEndpoint:    mustEnv("MINIO_ENDPOINT"),
		MinioAccessKey:   mustEnv("MINIO_ACCESS_KEY"),
		MinioSecretKey:   mustEnv("MINIO_SECRET_KEY"),
		MinioBucket:      getEnv("MINIO_BUCKET", "payloads"),
		MinioUseSSL:      getEnv("MINIO_USE_SSL", "false") == "true",
		AdminSecret:      mustEnv("ADMIN_SECRET"),
		HMACDrift:        drift,
		NonceTTL:         nonceTTL,
	}, nil
}

func mustEnv(k string) string {
	v := os.Getenv(k)
	if v == "" {
		panic(fmt.Sprintf("required env %s is not set", k))
	}
	return v
}

func getEnv(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func hexDecode(s string) ([]byte, error) {
	b := make([]byte, len(s)/2)
	_, err := fmt.Sscanf(s, "%x", &b)
	if err != nil {
		return nil, err
	}
	return b, nil
}