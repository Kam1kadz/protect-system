package model

import (
	"time"
)

type TenantStatus string

const (
	TenantActive    TenantStatus = "active"
	TenantSuspended TenantStatus = "suspended"
	TenantDeleted   TenantStatus = "deleted"
)

type Tenant struct {
	ID            string       `db:"id"`
	Slug          string       `db:"slug"`
	DisplayName   string       `db:"display_name"`
	OwnerEmail    string       `db:"owner_email"`
	SigningKeyEnc string       `db:"signing_key_enc"`
	CertPin       string       `db:"cert_pin"`
	Status        TenantStatus `db:"status"`
	CustomDomain  *string      `db:"custom_domain"`
	CreatedAt     time.Time    `db:"created_at"`
	UpdatedAt     time.Time    `db:"updated_at"`
}

type UserRole string

const (
	RoleUser   UserRole = "user"
	RoleAdmin  UserRole = "admin"
	RoleBanned UserRole = "banned"
)

type User struct {
	ID           string     `db:"id"`
	UID          int        `db:"uid"`
	Username     string     `db:"username"`
	Email        string     `db:"email"`
	PasswordHash string     `db:"password_hash"`
	Role         UserRole   `db:"role"`
	HWID         *string    `db:"hwid"`
	HWIDLockedAt *time.Time `db:"hwid_locked_at"`
	IPRegistered *string    `db:"ip_registered"`
	IPLast       *string    `db:"ip_last"`
	LastSeenAt   *time.Time `db:"last_seen_at"`
	CreatedAt    time.Time  `db:"created_at"`
}

type Session struct {
	ID               string     `db:"id"`
	UserID           string     `db:"user_id"`
	LicenseID        string     `db:"license_id"`
	TokenHash        string     `db:"token_hash"`
	HWID             string     `db:"hwid"`
	IPAddress        string     `db:"ip_address"`
	LoaderVersion    *string    `db:"loader_version"`
	MinecraftVersion *string    `db:"minecraft_version"`
	LastHeartbeatAt  time.Time  `db:"last_heartbeat_at"`
	ExpiresAt        time.Time  `db:"expires_at"`
	IsRevoked        bool       `db:"is_revoked"`
	CreatedAt        time.Time  `db:"created_at"`
}

type LicenseStatus string

const (
	LicenseActive  LicenseStatus = "active"
	LicensePaused  LicenseStatus = "paused"
	LicenseExpired LicenseStatus = "expired"
	LicenseBanned  LicenseStatus = "banned"
)

type License struct {
	ID           string        `db:"id"`
	UserID       string        `db:"user_id"`
	PlanID       string        `db:"plan_id"`
	TierID       *string       `db:"tier_id"`
	HWIDSnapshot *string       `db:"hwid_snapshot"`
	Status       LicenseStatus `db:"status"`
	ExpiresAt    time.Time     `db:"expires_at"`
	PausedAt     *time.Time    `db:"paused_at"`
	PauseReason  *string       `db:"pause_reason"`
	BanReason    *string       `db:"ban_reason"`
	LicenseKey   *string       `db:"license_key"`
	SecretKey    *string       `db:"secret_key"`
	CreatedAt    time.Time     `db:"created_at"`
}

type MCVersion string

const (
	MCVersion1165 MCVersion = "1.16.5"
	MCVersion1194 MCVersion = "1.19.4"
)

// ProductType — тип товара в магазине
type ProductType string

const (
	ProductSubscription ProductType = "subscription"
	ProductHWIDReset    ProductType = "hwid_reset"
	ProductConfig       ProductType = "config"
)

type SubscriptionPlan struct {
	ID            string      `db:"id"`
	Name          string      `db:"name"`
	DisplayName   string      `db:"display_name"`
	JarStorageKey *string     `db:"jar_storage_key"`
	ProductType   ProductType `db:"product_type"`
	ConfigFileKey *string     `db:"config_file_key"`
	IsActive      bool        `db:"is_active"`
	SortOrder     int         `db:"sort_order"`
	CreatedAt     time.Time   `db:"created_at"`
	UpdatedAt     time.Time   `db:"updated_at"`
}
