package public

import (
	"fmt"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgtype"
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
		TierID    string `json:"tier_id"`
		PromoCode string `json:"promo_code"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}
	body.Key = strings.TrimSpace(body.Key)
	body.TierID = strings.TrimSpace(body.TierID)
	if body.Key == "" && body.TierID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "key or tier_id required"})
	}

	var (
		keyID  *string
		planID string
		tierID *string
		isUsed bool
	)

	if body.Key != "" {
		var kid, pid string
		err := h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT id, plan_id, tier_id, is_used
			 FROM %s.loader_keys WHERE key_value = $1`, s),
			body.Key,
		).Scan(&kid, &pid, &tierID, &isUsed)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "invalid key"})
		}
		if isUsed {
			return c.Status(400).JSON(fiber.Map{"error": "key already used"})
		}
		keyID = &kid
		planID = pid
	} else {
		// активация по tier_id (покупка плана)
		tierID = &body.TierID
		err := h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT plan_id FROM %s.plan_tiers WHERE id = $1 AND is_active = true`, s),
			body.TierID,
		).Scan(&planID)
		if err != nil {
			return c.Status(404).JSON(fiber.Map{"error": "tier not found"})
		}
	}

	durationDays := 30
	if tierID != nil {
		_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT duration_days FROM %s.plan_tiers WHERE id = $1`, s),
			*tierID,
		).Scan(&durationDays)
	} else if keyID != nil {
		// попробуем взять duration_days прямо из ключа (если задано при генерации)
		var keyDays pgtype.Int4
		_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
			`SELECT duration_days FROM %s.loader_keys WHERE id = $1`, s), *keyID,
		).Scan(&keyDays)
		if keyDays.Valid && keyDays.Int32 > 0 {
			durationDays = int(keyDays.Int32)
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

	// Определяем тип товара
	var productType string
	var configFileKey *string
	_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT COALESCE(product_type,'subscription'), config_file_key
		 FROM %s.subscription_plans WHERE id = $1`, s),
		planID,
	).Scan(&productType, &configFileKey)

	if productType == "hwid_reset" {
		// сброс HWID (как услуга)
		_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
			`UPDATE %s.users SET hwid = NULL, hwid_locked_at = NULL WHERE id = $1`, s), userID)
		_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
			`UPDATE %s.licenses SET hwid_snapshot = NULL WHERE user_id = $1`, s), userID)
		_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
			`INSERT INTO %s.hwid_records (user_id, hwid_old, hwid_new, reason)
			 VALUES ($1, NULL, '', 'reset_purchase')`, s), userID)

		if keyID != nil {
			_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
				`UPDATE %s.loader_keys SET is_used = true, used_by = $1, used_at = NOW() WHERE id = $2`, s),
				userID, *keyID)
		}

		return c.Status(201).JSON(fiber.Map{"ok": true, "product_type": "hwid_reset"})
	}

	if productType == "config" {
		if keyID != nil {
			_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
				`UPDATE %s.loader_keys SET is_used = true, used_by = $1, used_at = NOW() WHERE id = $2`, s),
				userID, *keyID)
		}
		return c.Status(201).JSON(fiber.Map{
			"ok":             true,
			"product_type":   "config",
			"config_file_key": configFileKey,
		})
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
		_, errUpd := h.db.Exec(c.Context(), fmt.Sprintf(
			`UPDATE %s.licenses SET expires_at = $1, status = 'active' WHERE id = $2`, s),
			finalExpires, existingLicID,
		)
		if errUpd != nil {
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

		errIns := h.db.QueryRow(c.Context(), fmt.Sprintf(
			`INSERT INTO %s.licenses
			 (user_id, plan_id, tier_id, license_key, secret_key, expires_at)
			 VALUES ($1, $2, $3, $4, $5, $6)
			 RETURNING id`, s),
			userID, planID, tierID, newKey, secretKey, finalExpires,
		).Scan(&licenseID)

		if errIns != nil {
			return c.Status(500).JSON(fiber.Map{"error": "failed to create license: " + errIns.Error()})
		}
	}

	if keyID != nil {
		_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
			`UPDATE %s.loader_keys
			 SET is_used = true, used_by = $1, used_at = NOW()
			 WHERE id = $2`, s),
			userID, *keyID)
	}

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

// ResetHWID — покупка услуги "сброс HWID" (упрощённая выдача без провайдера оплаты)
func (h *StoreHandler) ResetHWID(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	cl := storeClaims(c)
	if cl == nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}
	userID := cl.UserID

	// Сбрасываем HWID у пользователя и снепшоты у лицензий
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.users SET hwid = NULL, hwid_locked_at = NULL WHERE id = $1`, s), userID)
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.licenses SET hwid_snapshot = NULL WHERE user_id = $1`, s), userID)

	// Пишем историю (если таблица есть)
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.hwid_records (user_id, hwid_old, hwid_new, reason)
		 VALUES ($1, NULL, '', 'reset_purchase')`, s), userID)

	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.audit_log (user_id, event_type, severity, ip_address, payload)
		 VALUES ($1, 'hwid_reset_purchased', 'info', $2, '{}')`, s),
		userID, c.IP())

	return c.JSON(fiber.Map{"ok": true})
}
