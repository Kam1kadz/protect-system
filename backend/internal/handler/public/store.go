package public

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/token"
)

type StoreHandler struct {
	db *pgxpool.Pool
}

func NewStoreHandler(db *pgxpool.Pool) *StoreHandler {
	return &StoreHandler{db: db}
}

func storeClaims(c *fiber.Ctx) *token.Claims {
	v, _ := c.Locals(middleware.ClaimsKey()).(*token.Claims)
	return v
}

func (h *StoreHandler) ValidatePromo(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	code := c.Params("code")

	var id string
	var discountPct int
	var partnerPct int
	var usesMax *int
	var usesTotal int
	var expiresAt *time.Time

	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT id, discount_pct, partner_pct, uses_max, uses_total, expires_at
		 FROM %s.promo_codes
		 WHERE code = $1 AND is_active = true`, s),
		code,
	).Scan(&id, &discountPct, &partnerPct, &usesMax, &usesTotal, &expiresAt)

	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "promo code not found or inactive"})
	}

	if expiresAt != nil && time.Now().After(*expiresAt) {
		return c.Status(400).JSON(fiber.Map{"error": "promo code expired"})
	}

	if usesMax != nil && usesTotal >= *usesMax {
		return c.Status(400).JSON(fiber.Map{"error": "promo code usage limit reached"})
	}

	return c.JSON(fiber.Map{
		"valid":        true,
		"discount_pct": discountPct,
		"partner_pct":  partnerPct,
	})
}

func (h *StoreHandler) Activate(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	// Fix: use JWT claims instead of local user_id
	cl := storeClaims(c)
	if cl == nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID := cl.UserID

	var body struct {
		Key       string `json:"key"`
		PromoCode string `json:"promo_code"`
	}
	if err := c.BodyParser(&body); err != nil || body.Key == "" {
		return c.Status(400).JSON(fiber.Map{"error": "key required"})
	}

	var keyID, planID string
	var tierID *string
	var isUsed bool

	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT id, plan_id, tier_id, is_used
		 FROM %s.loader_keys WHERE key_value = $1`, s),
		body.Key,
	).Scan(&keyID, &planID, &tierID, &isUsed)

	if err != nil {
		return c.Status(404).JSON(fiber.Map{"error": "invalid key"})
	}
	if isUsed {
		return c.Status(400).JSON(fiber.Map{"error": "key already used"})
	}

	durationDays := 30
	if tierID != nil {
		_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT duration_days FROM %s.plan_tiers WHERE id = $1`, s),
			*tierID,
		).Scan(&durationDays)
	} else {
		// попробуем взять duration_days прямо из ключа (если задано при генерации)
		var keyDays *int
		_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT duration_days FROM %s.loader_keys WHERE id = $1`, s), keyID,
		).Scan(&keyDays)
		if keyDays != nil && *keyDays > 0 {
			durationDays = *keyDays
		}
	}

	var promoID *string
	if body.PromoCode != "" {
		var pid, partnerUserID string
		var partnerPct int
		var usesMax *int
		var usesTotal int
		var expiresAt *time.Time

		err := h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT id, COALESCE(partner_id::text,''), partner_pct,
			        uses_max, uses_total, expires_at
			 FROM %s.promo_codes
			 WHERE code = $1 AND is_active = true`, s),
			body.PromoCode,
		).Scan(&pid, &partnerUserID, &partnerPct, &usesMax, &usesTotal, &expiresAt)

		if err == nil &&
			(expiresAt == nil || time.Now().Before(*expiresAt)) &&
			(usesMax == nil || usesTotal < *usesMax) {

			promoID = &pid

			if partnerPct > 0 && partnerUserID != "" && tierID != nil {
				var price float64
				_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
					`SELECT price FROM %s.plan_tiers WHERE id = $1`, s), *tierID,
				).Scan(&price)

				if price > 0 {
					earning := price * float64(partnerPct) / 100
					_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
						`INSERT INTO %s.partner_earnings
						 (partner_id, promo_id, amount, currency)
						 VALUES ($1, $2, $3, 'USD')`, s),
						partnerUserID, pid, earning)
				}
			}

			_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
				`UPDATE %s.promo_codes SET uses_total = uses_total + 1 WHERE id = $1`, s), pid)
		}
	}

	// Проверяем: есть ли уже активная незаблокированная лицензия на этот план?
	var existingLicID string
	var existingExpires time.Time
	existingErr := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT id, expires_at FROM %s.licenses
		 WHERE user_id = $1 AND plan_id = $2
		   AND status NOT IN ('banned')
		 ORDER BY expires_at DESC LIMIT 1`, s),
		userID, planID,
	).Scan(&existingLicID, &existingExpires)

	var licenseID string
	var licKey string
	var finalExpires time.Time

	if existingErr == nil && existingLicID != "" {
		// Расширяем существующую подписку
		base := existingExpires
		if base.Before(time.Now()) {
			base = time.Now()
		}
		finalExpires = base.AddDate(0, 0, durationDays)
		_, err = h.db.Exec(c.Context(), fmt.Sprintf(
			`UPDATE %s.licenses SET expires_at = $1, status = 'active' WHERE id = $2`, s),
			finalExpires, existingLicID,
		)
		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to extend license"})
		}
		licenseID = existingLicID
		// получаем ключ существующей лицензии
		_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT COALESCE(license_key,'') FROM %s.licenses WHERE id = $1`, s), existingLicID,
		).Scan(&licKey)
	} else {
		// Создаём новую лицензию
		var newKey, secretKey string
		newKey, _ = crypto.RandomHex(16)
		secretKey, _ = crypto.RandomHex(32)
		finalExpires = time.Now().AddDate(0, 0, durationDays)
		licKey = newKey

		err = h.db.QueryRow(c.Context(), fmt.Sprintf(
			`INSERT INTO %s.licenses
			 (user_id, plan_id, tier_id, license_key, secret_key, expires_at)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id`, s),
			userID, planID, tierID, newKey, secretKey, finalExpires,
		).Scan(&licenseID)

		if err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to create license: " + err.Error()})
		}
	}

	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.loader_keys
		 SET is_used = true, used_by = $1, used_at = NOW()
		 WHERE id = $2`, s),
		userID, keyID)

	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.audit_log (user_id, event_type, severity, ip_address, payload)
		 VALUES ($1, 'key_activated', 'info', $2, $3)`, s),
		userID,
		c.IP(),
		fmt.Sprintf(`{"license_id":"%s","plan_id":"%s","promo_id":"%v"}`,
			licenseID, planID, promoID),
	)

	return c.Status(201).JSON(fiber.Map{
		"license_id":  licenseID,
		"license_key": licKey,
		"expires_at":  finalExpires.Format(time.RFC3339),
		"plan_id":     planID,
	})
}
