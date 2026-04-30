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
	ID            string       `db:"id"             json:"id"`
	Slug          string       `db:"slug"           json:"slug"`
	DisplayName   string       `db:"display_name"   json:"display_name"`
	OwnerEmail    string       `db:"owner_email"    json:"owner_email,omitempty"`
	SigningKeyEnc string       `db:"signing_key_enc" json:"-"`
	CertPin       string       `db:"cert_pin"       json:"-"`
	Status        TenantStatus `db:"status"         json:"status"`
	CustomDomain  *string      `db:"custom_domain"  json:"custom_domain,omitempty"`
	CreatedAt     time.Time    `db:"created_at"     json:"created_at"`
	UpdatedAt     time.Time    `db:"updated_at"     json:"updated_at"`
}

type UserRole string

const (
	RoleUser   UserRole = "user"
	RoleAdmin  UserRole = "admin"
	RoleBanned UserRole = "banned"
)

type User struct {
	ID           string     `db:"id"              json:"id"`
	UID          int        `db:"uid"             json:"uid"`
	Username     string     `db:"username"        json:"username"`
	Email        string     `db:"email"           json:"email"`
	PasswordHash string     `db:"password_hash"   json:"-"`
	Role         UserRole   `db:"role"            json:"role"`
	HWID         *string    `db:"hwid"            json:"hwid,omitempty"`
	HWIDLockedAt *time.Time `db:"hwid_locked_at"  json:"hwid_locked_at,omitempty"`
	IPRegistered *string    `db:"ip_registered"   json:"ip_registered,omitempty"`
	IPLast       *string    `db:"ip_last"         json:"ip_last,omitempty"`
	LastSeenAt   *time.Time `db:"last_seen_at"    json:"last_seen_at,omitempty"`
	CreatedAt    time.Time  `db:"created_at"      json:"created_at"`
}

type Session struct {
	ID               string     `db:"id"                json:"id"`
	UserID           string     `db:"user_id"           json:"user_id"`
	LicenseID        string     `db:"license_id"        json:"license_id"`
	TokenHash        string     `db:"token_hash"        json:"-"`
	HWID             string     `db:"hwid"              json:"hwid"`
	IPAddress        string     `db:"ip_address"        json:"ip_address"`
	LoaderVersion    *string    `db:"loader_version"    json:"loader_version,omitempty"`
	MinecraftVersion *string    `db:"minecraft_version" json:"minecraft_version,omitempty"`
	LastHeartbeatAt  time.Time  `db:"last_heartbeat_at" json:"last_heartbeat_at"`
	ExpiresAt        time.Time  `db:"expires_at"        json:"expires_at"`
	IsRevoked        bool       `db:"is_revoked"        json:"is_revoked"`
	CreatedAt        time.Time  `db:"created_at"        json:"created_at"`
}

type LicenseStatus string

const (
	LicenseActive  LicenseStatus = "active"
	LicensePaused  LicenseStatus = "paused"
	LicenseExpired LicenseStatus = "expired"
	LicenseBanned  LicenseStatus = "banned"
)

type License struct {
	ID           string        `db:"id"            json:"id"`
	UserID       string        `db:"user_id"       json:"user_id"`
	PlanID       string        `db:"plan_id"       json:"plan_id"`
	TierID       *string       `db:"tier_id"       json:"tier_id,omitempty"`
	HWIDSnapshot *string       `db:"hwid_snapshot" json:"hwid_snapshot,omitempty"`
	Status       LicenseStatus `db:"status"        json:"status"`
	ExpiresAt    time.Time     `db:"expires_at"    json:"expires_at"`
	PausedAt     *time.Time    `db:"paused_at"     json:"paused_at,omitempty"`
	PauseReason  *string       `db:"pause_reason"  json:"pause_reason,omitempty"`
	BanReason    *string       `db:"ban_reason"    json:"ban_reason,omitempty"`
	LicenseKey   *string       `db:"license_key"   json:"license_key,omitempty"`
	SecretKey    *string       `db:"secret_key"    json:"-"`
	CreatedAt    time.Time     `db:"created_at"    json:"created_at"`
}

type MCVersion string

const (
	MCVersion1165 MCVersion = "1.16.5"
	MCVersion1194 MCVersion = "1.19.4"
	MCVersion1214 MCVersion = "1.21.4"
)

// ProductType — тип товара в магазине
type ProductType string

const (
	ProductSubscription ProductType = "subscription"
	ProductHWIDReset    ProductType = "hwid_reset"
	ProductConfig       ProductType = "config"
)

type SubscriptionPlan struct {
	ID            string      `db:"id"              json:"id"`
	Name          string      `db:"name"            json:"name"`
	DisplayName   string      `db:"display_name"    json:"display_name"`
	JarStorageKey *string     `db:"jar_storage_key" json:"jar_storage_key,omitempty"`
	ProductType   ProductType `db:"product_type"    json:"product_type"`
	ConfigFileKey *string     `db:"config_file_key" json:"config_file_key,omitempty"`
	IsActive      bool        `db:"is_active"       json:"is_active"`
	SortOrder     int         `db:"sort_order"      json:"sort_order"`
	CreatedAt     time.Time   `db:"created_at"      json:"created_at"`
	UpdatedAt     time.Time   `db:"updated_at"      json:"updated_at"`
}
