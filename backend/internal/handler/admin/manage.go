package admin

import (
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/internal/crypto"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/token"
)

type ManageHandler struct {
	db *pgxpool.Pool
}

func NewManageHandler(db *pgxpool.Pool) *ManageHandler {
	return &ManageHandler{db: db}
}

func claims(c *fiber.Ctx) *token.Claims {
	v, _ := c.Locals(middleware.ClaimsKey()).(*token.Claims)
	return v
}

// ── Stats ─────────────────────────────────────────────────────────────────────

func (h *ManageHandler) Stats(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var totalUsers, activeLicenses, activeSessions, recentReg int
	var totalRevenue float64

	_ = h.db.QueryRow(c.Context(), fmt.Sprintf(`SELECT COUNT(*) FROM %s.users`, s)).Scan(&totalUsers)
	_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT COUNT(*) FROM %s.licenses WHERE status = 'active' AND expires_at > NOW()`, s),
	).Scan(&activeLicenses)
	_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT COUNT(*) FROM %s.sessions WHERE is_revoked = false AND expires_at > NOW()`, s),
	).Scan(&activeSessions)
	_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT COUNT(*) FROM %s.users WHERE created_at > NOW() - INTERVAL '7 days'`, s),
	).Scan(&recentReg)
	_ = h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT COALESCE(SUM(amount),0) FROM %s.payments WHERE status = 'completed'`, s),
	).Scan(&totalRevenue)

	return c.JSON(fiber.Map{
		"total_users":          totalUsers,
		"active_licenses":      activeLicenses,
		"active_sessions":      activeSessions,
		"recent_registrations": recentReg,
		"total_revenue":        totalRevenue,
	})
}

// ── Users ─────────────────────────────────────────────────────────────────────

func (h *ManageHandler) ListUsers(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	page := maxInt(1, c.QueryInt("page", 1))
	limit := 50
	offset := (page - 1) * limit

	search := c.Query("q")
	where := ""
	args := []any{limit, offset}
	if search != "" {
		where = "WHERE username ILIKE $3 OR email ILIKE $3"
		args = append(args, "%"+search+"%")
	}

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT id, username, email, role, hwid, last_seen_at, created_at
		 FROM %s.users %s ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		s, where,
	), args...)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error: " + err.Error()})
	}
	defer rows.Close()

	type UserRow struct {
		ID        string  `json:"id"`
		Username  string  `json:"username"`
		Email     string  `json:"email"`
		Role      string  `json:"role"`
		HWID      *string `json:"hwid"`
		LastSeen  *string `json:"last_seen_at"`
		CreatedAt string  `json:"created_at"`
	}

	var users []UserRow
	for rows.Next() {
		var u UserRow
		var ca time.Time
		var lsPtr *time.Time
		if err := rows.Scan(&u.ID, &u.Username, &u.Email, &u.Role,
			&u.HWID, &lsPtr, &ca); err != nil {
			continue
		}
		u.CreatedAt = ca.Format(time.RFC3339)
		if lsPtr != nil {
			t := lsPtr.Format(time.RFC3339)
			u.LastSeen = &t
		}
		users = append(users, u)
	}
	if users == nil {
		users = []UserRow{}
	}
	return c.JSON(fiber.Map{"users": users})
}

func (h *ManageHandler) BanUser(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	userID := c.Params("id")

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.users SET role = 'banned' WHERE id = $1`, s), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.sessions SET is_revoked = true WHERE user_id = $1`, s), userID)
	return c.JSON(fiber.Map{"ok": true})
}

func (h *ManageHandler) UnbanUser(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	userID := c.Params("id")

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.users SET role = 'user' WHERE id = $1 AND role = 'banned'`, s), userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *ManageHandler) SetRole(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	userID := c.Params("id")

	var body struct {
		Role string `json:"role"`
	}
	if err := c.BodyParser(&body); err != nil || body.Role == "" {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.users SET role = $1 WHERE id = $2`, s), body.Role, userID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *ManageHandler) ResetHWID(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	userID := c.Params("id")

	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.users SET hwid = NULL, hwid_locked_at = NULL WHERE id = $1`, s), userID)
	_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.licenses SET hwid_snapshot = NULL WHERE user_id = $1`, s), userID)
	return c.JSON(fiber.Map{"ok": true})
}

func (h *ManageHandler) GiveSubscription(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	userID := c.Params("id")

	var body struct {
		PlanID    string `json:"plan_id"`
		TierID    string `json:"tier_id"`
		ExpiresAt string `json:"expires_at"`
	}
	if err := c.BodyParser(&body); err != nil || body.PlanID == "" {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}

	expAt, err := time.Parse(time.RFC3339, body.ExpiresAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid expires_at"})
	}

	licKey, _ := crypto.RandomHex(16)
	secret, _ := crypto.RandomHex(32)

	var tierID *string
	if body.TierID != "" {
		tierID = &body.TierID
	}

	_, err = h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.licenses (user_id, plan_id, tier_id, license_key, secret_key, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		s,
	), userID, body.PlanID, tierID, licKey, secret, expAt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error: " + err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"license_key": licKey})
}

// ── Licenses ──────────────────────────────────────────────────────────────────

func (h *ManageHandler) ListLicenses(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	page := maxInt(1, c.QueryInt("page", 1))
	limit := 50
	offset := (page - 1) * limit

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT l.id, u.username, sp.display_name, l.status, l.expires_at, l.license_key, l.created_at
		 FROM %s.licenses l
		 JOIN %s.users u ON u.id = l.user_id
		 JOIN %s.subscription_plans sp ON sp.id = l.plan_id
		 ORDER BY l.created_at DESC LIMIT $1 OFFSET $2`,
		s, s, s,
	), limit, offset)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	type LicRow struct {
		ID         string `json:"id"`
		Username   string `json:"username"`
		PlanName   string `json:"plan_name"`
		Status     string `json:"status"`
		ExpiresAt  string `json:"expires_at"`
		LicenseKey string `json:"license_key"`
		CreatedAt  string `json:"created_at"`
	}

	var list []LicRow
	for rows.Next() {
		var r LicRow
		var exp, ca time.Time
		if err := rows.Scan(&r.ID, &r.Username, &r.PlanName, &r.Status, &exp, &r.LicenseKey, &ca); err != nil {
			continue
		}
		r.ExpiresAt = exp.Format(time.RFC3339)
		r.CreatedAt = ca.Format(time.RFC3339)
		list = append(list, r)
	}
	if list == nil {
		list = []LicRow{}
	}
	return c.JSON(fiber.Map{"licenses": list})
}

func (h *ManageHandler) RevokeLicense(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.licenses SET status = 'banned' WHERE id = $1`, s), c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// UnlockLicense — разблокировать лицензию (banned → active)
func (h *ManageHandler) UnlockLicense(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.licenses SET status = 'active', ban_reason = NULL WHERE id = $1`, s), c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// UpdateLicenseExpiry — изменить дату окончания подписки
func (h *ManageHandler) UpdateLicenseExpiry(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		ExpiresAt string `json:"expires_at"`
	}
	if err := c.BodyParser(&body); err != nil || body.ExpiresAt == "" {
		return c.Status(400).JSON(fiber.Map{"error": "expires_at required"})
	}

	expAt, err := time.Parse(time.RFC3339, body.ExpiresAt)
	if err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "invalid expires_at format, use RFC3339"})
	}

	_, err = h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.licenses SET expires_at = $1 WHERE id = $2`, s), expAt, c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ── Plans CRUD ────────────────────────────────────────────────────────────────

func (h *ManageHandler) ListPlans(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT sp.id, sp.name, sp.display_name, sp.is_active, sp.sort_order,
		        pt.id, pt.duration_days, pt.price, pt.currency
		 FROM %s.subscription_plans sp
		 LEFT JOIN %s.plan_tiers pt ON pt.plan_id = sp.id AND pt.is_active = true
		 ORDER BY sp.sort_order, pt.duration_days`, s, s))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error: " + err.Error()})
	}
	defer rows.Close()

	type Tier struct {
		ID           string  `json:"id"`
		DurationDays int     `json:"duration_days"`
		Price        float64 `json:"price"`
		Currency     string  `json:"currency"`
	}
	type Plan struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
		IsActive    bool   `json:"is_active"`
		SortOrder   int    `json:"sort_order"`
		Tiers       []Tier `json:"tiers"`
	}

	plansMap := map[string]*Plan{}
	var order []string
	for rows.Next() {
		var pID, pName, pDisplay string
		var pActive bool
		var pSort int
		var tID *string
		var tDays *int
		var tPrice *float64
		var tCur *string
		if err := rows.Scan(&pID, &pName, &pDisplay, &pActive, &pSort, &tID, &tDays, &tPrice, &tCur); err != nil {
			continue
		}
		if _, ok := plansMap[pID]; !ok {
			plansMap[pID] = &Plan{ID: pID, Name: pName, DisplayName: pDisplay, IsActive: pActive, SortOrder: pSort, Tiers: []Tier{}}
			order = append(order, pID)
		}
		if tID != nil {
			plansMap[pID].Tiers = append(plansMap[pID].Tiers, Tier{ID: *tID, DurationDays: *tDays, Price: *tPrice, Currency: *tCur})
		}
	}

	result := make([]*Plan, 0, len(order))
	for _, id := range order {
		result = append(result, plansMap[id])
	}
	return c.JSON(fiber.Map{"plans": result})
}

func (h *ManageHandler) CreatePlan(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
		SortOrder   int    `json:"sort_order"`
		ProductType string `json:"product_type"`
	}
	if err := c.BodyParser(&body); err != nil || body.Name == "" || body.DisplayName == "" {
		return c.Status(400).JSON(fiber.Map{"error": "name and display_name required"})
	}
	if body.ProductType == "" {
		body.ProductType = "subscription"
	}

	var id string
	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.subscription_plans (id, name, display_name, sort_order, is_active, product_type)
		 VALUES (gen_random_uuid(), $1, $2, $3, true, $4) RETURNING id`, s),
		body.Name, body.DisplayName, body.SortOrder, body.ProductType,
	).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error: " + err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"id": id, "name": body.Name, "display_name": body.DisplayName})
}

func (h *ManageHandler) UpdatePlan(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	planID := c.Params("id")

	var body struct {
		DisplayName string `json:"display_name"`
		IsActive    *bool  `json:"is_active"`
		SortOrder   *int   `json:"sort_order"`
		ProductType string `json:"product_type"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.subscription_plans
		 SET display_name  = COALESCE(NULLIF($1,''), display_name),
		     is_active     = COALESCE($2, is_active),
		     sort_order    = COALESCE($3, sort_order),
		     product_type  = COALESCE(NULLIF($4,''), product_type),
		     updated_at    = NOW()
		 WHERE id = $5`, s),
		body.DisplayName, body.IsActive, body.SortOrder, body.ProductType, planID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

func (h *ManageHandler) DeletePlan(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	planID := c.Params("id")

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`DELETE FROM %s.subscription_plans WHERE id = $1`, s), planID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.SendStatus(204)
}

func (h *ManageHandler) AddTier(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	planID := c.Params("id")

	var body struct {
		DurationDays int     `json:"duration_days"`
		Price        float64 `json:"price"`
		Currency     string  `json:"currency"`
	}
	if err := c.BodyParser(&body); err != nil || body.DurationDays <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}
	if body.Currency == "" {
		body.Currency = "USD"
	}

	var id string
	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.plan_tiers (id, plan_id, duration_days, price, currency, is_active)
		 VALUES (gen_random_uuid(), $1, $2, $3, $4, true) RETURNING id`, s),
		planID, body.DurationDays, body.Price, body.Currency,
	).Scan(&id)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error: " + err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"id": id})
}

func (h *ManageHandler) DeleteTier(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`DELETE FROM %s.plan_tiers WHERE id = $1`, s), c.Params("tier_id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.SendStatus(204)
}

// ── Keys ──────────────────────────────────────────────────────────────────────

func (h *ManageHandler) ListKeys(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT k.id, k.key_value, sp.display_name, k.is_used,
		        u.username, k.used_at, k.created_at,
		        COALESCE(k.duration_days, 30)
		 FROM %s.loader_keys k
		 JOIN %s.subscription_plans sp ON sp.id = k.plan_id
		 LEFT JOIN %s.users u ON u.id = k.used_by
		 ORDER BY k.created_at DESC LIMIT 200`,
		s, s, s,
	))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	type KeyRow struct {
		ID           string  `json:"id"`
		KeyValue     string  `json:"key_value"`
		PlanName     string  `json:"plan_name"`
		IsUsed       bool    `json:"is_used"`
		UsedBy       *string `json:"used_by"`
		UsedAt       *string `json:"used_at"`
		CreatedAt    string  `json:"created_at"`
		DurationDays int     `json:"duration_days"`
	}

	var list []KeyRow
	for rows.Next() {
		var r KeyRow
		var ca time.Time
		var ua *time.Time
		if err := rows.Scan(&r.ID, &r.KeyValue, &r.PlanName, &r.IsUsed,
			&r.UsedBy, &ua, &ca, &r.DurationDays); err != nil {
			continue
		}
		r.CreatedAt = ca.Format(time.RFC3339)
		if ua != nil {
			t := ua.Format(time.RFC3339)
			r.UsedAt = &t
		}
		list = append(list, r)
	}
	if list == nil {
		list = []KeyRow{}
	}
	return c.JSON(fiber.Map{"keys": list})
}

func (h *ManageHandler) GenerateKeys(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	cl := claims(c)
	var adminID string
	if cl != nil {
		adminID = cl.UserID
	}

	var body struct {
		PlanID       string `json:"plan_id"`
		TierID       string `json:"tier_id"`
		Count        int    `json:"count"`
		DurationDays int    `json:"duration_days"`
	}
	if err := c.BodyParser(&body); err != nil || body.PlanID == "" || body.Count <= 0 {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}
	if body.Count > 100 {
		return c.Status(400).JSON(fiber.Map{"error": "max 100 keys at once"})
	}

	var tierID *string
	if body.TierID != "" {
		tierID = &body.TierID
	}
	var durationDays *int
	if body.DurationDays > 0 {
		durationDays = &body.DurationDays
	}

	keys := make([]string, 0, body.Count)
	for i := 0; i < body.Count; i++ {
		kv, _ := crypto.RandomHex(16)
		key := fmt.Sprintf("KMG-%s-%s-%s-%s",
			kv[:4], kv[4:8], kv[8:12], kv[12:16])
		keys = append(keys, key)
		_, _ = h.db.Exec(c.Context(), fmt.Sprintf(
			`INSERT INTO %s.loader_keys (key_value, plan_id, tier_id, created_by, duration_days)
			 VALUES ($1, $2, $3, $4, $5)`, s),
			key, body.PlanID, tierID, adminID, durationDays)
	}

	return c.Status(201).JSON(fiber.Map{"keys": keys, "count": len(keys)})
}

func (h *ManageHandler) DeleteKey(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`DELETE FROM %s.loader_keys WHERE id = $1 AND is_used = false`, s), c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.SendStatus(204)
}

// ── Promo codes ───────────────────────────────────────────────────────────────

func (h *ManageHandler) ListPromo(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT p.id, p.code, u.username, p.discount_pct, p.partner_pct,
		        p.uses_total, p.uses_max, p.is_active, p.expires_at, p.created_at
		 FROM %s.promo_codes p
		 LEFT JOIN %s.users u ON u.id = p.partner_id
		 ORDER BY p.created_at DESC`,
		s, s,
	))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	type PromoRow struct {
		ID          string  `json:"id"`
		Code        string  `json:"code"`
		Partner     *string `json:"partner"`
		DiscountPct int     `json:"discount_pct"`
		PartnerPct  int     `json:"partner_pct"`
		UsesTotal   int     `json:"uses_total"`
		UsesMax     *int    `json:"uses_max"`
		IsActive    bool    `json:"is_active"`
		ExpiresAt   *string `json:"expires_at"`
		CreatedAt   string  `json:"created_at"`
	}

	var list []PromoRow
	for rows.Next() {
		var r PromoRow
		var ca time.Time
		var ea *time.Time
		if err := rows.Scan(&r.ID, &r.Code, &r.Partner, &r.DiscountPct, &r.PartnerPct,
			&r.UsesTotal, &r.UsesMax, &r.IsActive, &ea, &ca); err != nil {
			continue
		}
		r.CreatedAt = ca.Format(time.RFC3339)
		if ea != nil {
			t := ea.Format(time.RFC3339)
			r.ExpiresAt = &t
		}
		list = append(list, r)
	}
	if list == nil {
		list = []PromoRow{}
	}
	return c.JSON(fiber.Map{"promos": list})
}

func (h *ManageHandler) CreatePromo(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		Code        string `json:"code"`
		PartnerID   string `json:"partner_id"`
		DiscountPct int    `json:"discount_pct"`
		PartnerPct  int    `json:"partner_pct"`
		UsesMax     *int   `json:"uses_max"`
		ExpiresAt   string `json:"expires_at"`
	}
	if err := c.BodyParser(&body); err != nil || body.Code == "" {
		return c.Status(400).JSON(fiber.Map{"error": "code required"})
	}

	var partnerID *string
	if body.PartnerID != "" {
		partnerID = &body.PartnerID
	}
	var expiresAt *time.Time
	if body.ExpiresAt != "" {
		t, err := time.Parse(time.RFC3339, body.ExpiresAt)
		if err == nil {
			expiresAt = &t
		}
	}

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.promo_codes (code, partner_id, discount_pct, partner_pct, uses_max, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`, s),
		body.Code, partnerID, body.DiscountPct, body.PartnerPct, body.UsesMax, expiresAt)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "code already exists or db error: " + err.Error()})
	}
	return c.Status(201).JSON(fiber.Map{"ok": true})
}

func (h *ManageHandler) DeletePromo(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`DELETE FROM %s.promo_codes WHERE id = $1`, s), c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.SendStatus(204)
}

// ── Runtime events ────────────────────────────────────────────────────────────

func (h *ManageHandler) ListEvents(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT re.id, u.username, re.event_type, re.severity,
		        re.payload, re.ip_address, re.created_at
		 FROM %s.runtime_events re
		 LEFT JOIN %s.users u ON u.id = re.user_id
		 ORDER BY re.created_at DESC LIMIT 200`,
		s, s,
	))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var id int64
		var username *string
		var eventType, severity string
		var payload []byte
		var ip *string
		var ca time.Time
		if err := rows.Scan(&id, &username, &eventType, &severity, &payload, &ip, &ca); err != nil {
			continue
		}
		list = append(list, fiber.Map{
			"id": id, "username": username, "event_type": eventType,
			"severity": severity, "payload": string(payload),
			"ip_address": ip, "created_at": ca.Format(time.RFC3339),
		})
	}
	if list == nil {
		list = []fiber.Map{}
	}
	return c.JSON(fiber.Map{"events": list})
}

// ── Transactions & Earnings ───────────────────────────────────────────────────

func (h *ManageHandler) ListTransactions(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT p.id, u.username, p.amount, p.currency, p.status, p.created_at, p.completed_at
		 FROM %s.payments p JOIN %s.users u ON u.id = p.user_id
		 ORDER BY p.created_at DESC LIMIT 200`,
		s, s,
	))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var id, username, currency, status string
		var amount float64
		var ca time.Time
		var comp *time.Time
		if err := rows.Scan(&id, &username, &amount, &currency, &status, &ca, &comp); err != nil {
			continue
		}
		m := fiber.Map{
			"id": id, "username": username, "amount": amount,
			"currency": currency, "status": status,
			"created_at": ca.Format(time.RFC3339),
		}
		if comp != nil {
			m["completed_at"] = comp.Format(time.RFC3339)
		}
		list = append(list, m)
	}
	if list == nil {
		list = []fiber.Map{}
	}
	return c.JSON(fiber.Map{"transactions": list})
}

func (h *ManageHandler) ListEarnings(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT pe.id, u.username, pe.amount, pe.currency,
		        pe.is_paid, pe.paid_at, pe.created_at
		 FROM %s.partner_earnings pe JOIN %s.users u ON u.id = pe.partner_id
		 ORDER BY pe.created_at DESC`,
		s, s,
	))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var id, username, currency string
		var amount float64
		var isPaid bool
		var ca time.Time
		var paid *time.Time
		if err := rows.Scan(&id, &username, &amount, &currency, &isPaid, &paid, &ca); err != nil {
			continue
		}
		m := fiber.Map{
			"id": id, "username": username, "amount": amount,
			"currency": currency, "is_paid": isPaid,
			"created_at": ca.Format(time.RFC3339),
		}
		if paid != nil {
			m["paid_at"] = paid.Format(time.RFC3339)
		}
		list = append(list, m)
	}
	if list == nil {
		list = []fiber.Map{}
	}
	return c.JSON(fiber.Map{"earnings": list})
}

func (h *ManageHandler) MarkEarningPaid(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.partner_earnings SET is_paid = true, paid_at = NOW() WHERE id = $1`, s),
		c.Params("id"))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ── Audit logs ────────────────────────────────────────────────────────────────

func (h *ManageHandler) ListLogs(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT al.id, u.username, al.event_type, al.severity,
		        al.ip_address, al.payload, al.created_at
		 FROM %s.audit_log al LEFT JOIN %s.users u ON u.id = al.user_id
		 ORDER BY al.created_at DESC LIMIT 500`,
		s, s,
	))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var id int64
		var username *string
		var eventType, severity string
		var ip *string
		var payload []byte
		var ca time.Time
		if err := rows.Scan(&id, &username, &eventType, &severity, &ip, &payload, &ca); err != nil {
			continue
		}
		list = append(list, fiber.Map{
			"id": id, "username": username, "event_type": eventType,
			"severity": severity, "ip_address": ip,
			"payload": string(payload), "created_at": ca.Format(time.RFC3339),
		})
	}
	if list == nil {
		list = []fiber.Map{}
	}
	return c.JSON(fiber.Map{"logs": list})
}

// ── Settings & Maintenance ────────────────────────────────────────────────────

func (h *ManageHandler) GetConfig(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var cfg struct {
		DisplayName        string  `json:"display_name"`
		PrimaryColor       string  `json:"primary_color"`
		AccentColor        string  `json:"accent_color"`
		DiscordURL         *string `json:"discord_url"`
		TelegramURL        *string `json:"telegram_url"`
		MaintenanceMode    bool    `json:"maintenance_mode"`
		MaintenanceMessage *string `json:"maintenance_message"`
	}
	err := h.db.QueryRow(c.Context(), fmt.Sprintf(
		`SELECT display_name, primary_color, accent_color, discord_url,
		        telegram_url, maintenance_mode, maintenance_message
		 FROM %s.tenant_config LIMIT 1`, s,
	)).Scan(&cfg.DisplayName, &cfg.PrimaryColor, &cfg.AccentColor,
		&cfg.DiscordURL, &cfg.TelegramURL, &cfg.MaintenanceMode, &cfg.MaintenanceMessage)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(cfg)
}

func (h *ManageHandler) SetMaintenance(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		Enabled bool   `json:"enabled"`
		Message string `json:"message"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`UPDATE %s.tenant_config SET maintenance_mode = $1, maintenance_message = $2`, s),
		body.Enabled, body.Message)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	return c.JSON(fiber.Map{"ok": true, "maintenance": body.Enabled})
}

// ── Roles ─────────────────────────────────────────────────────────────────────

func (h *ManageHandler) ListRoles(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT role_name, permissions, is_system FROM %s.role_permissions ORDER BY role_name`, s))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var name string
		var perms []byte
		var isSystem bool
		if err := rows.Scan(&name, &perms, &isSystem); err != nil {
			continue
		}
		list = append(list, fiber.Map{
			"role_name": name, "permissions": string(perms), "is_system": isSystem,
		})
	}
	if list == nil {
		list = []fiber.Map{}
	}
	return c.JSON(fiber.Map{"roles": list})
}

func (h *ManageHandler) UpsertRole(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	var body struct {
		RoleName    string `json:"role_name"`
		Permissions string `json:"permissions"`
	}
	if err := c.BodyParser(&body); err != nil || body.RoleName == "" {
		return c.Status(400).JSON(fiber.Map{"error": "bad request"})
	}

	_, err := h.db.Exec(c.Context(), fmt.Sprintf(
		`INSERT INTO %s.role_permissions (role_name, permissions, is_system)
		 VALUES ($1, $2::jsonb, false)
		 ON CONFLICT (role_name) DO UPDATE
		   SET permissions = $2::jsonb, updated_at = NOW()
		   WHERE role_permissions.is_system = false`, s),
		body.RoleName, body.Permissions)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "cannot modify system role or db error"})
	}
	return c.JSON(fiber.Map{"ok": true})
}

// ── Profile (user-facing) ─────────────────────────────────────────────────────

func (h *ManageHandler) ProfileLicenses(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	cl := claims(c)
	if cl == nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT l.id, sp.display_name, sp.name, l.status, l.expires_at, l.license_key, l.created_at
		 FROM %s.licenses l
		 JOIN %s.subscription_plans sp ON sp.id = l.plan_id
		 WHERE l.user_id = $1
		 ORDER BY l.created_at DESC`, s, s), cl.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	type LicRow struct {
		ID          string `json:"id"`
		PlanDisplay string `json:"plan_display"`
		PlanName    string `json:"plan_name"`
		Status      string `json:"status"`
		ExpiresAt   string `json:"expires_at"`
		LicenseKey  string `json:"license_key"`
		CreatedAt   string `json:"created_at"`
	}

	var list []LicRow
	for rows.Next() {
		var r LicRow
		var exp, ca time.Time
		if err := rows.Scan(&r.ID, &r.PlanDisplay, &r.PlanName, &r.Status, &exp, &r.LicenseKey, &ca); err != nil {
			continue
		}
		r.ExpiresAt = exp.Format(time.RFC3339)
		r.CreatedAt = ca.Format(time.RFC3339)
		list = append(list, r)
	}
	if list == nil {
		list = []LicRow{}
	}
	return c.JSON(fiber.Map{"licenses": list})
}

func (h *ManageHandler) ProfileEarnings(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)
	cl := claims(c)
	if cl == nil {
		return c.Status(401).JSON(fiber.Map{"error": "unauthorized"})
	}

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT id, amount, currency, is_paid, paid_at, created_at
		 FROM %s.partner_earnings WHERE partner_id = $1
		 ORDER BY created_at DESC`, s), cl.UserID)
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	var list []fiber.Map
	for rows.Next() {
		var id, currency string
		var amount float64
		var isPaid bool
		var ca time.Time
		var paid *time.Time
		if err := rows.Scan(&id, &amount, &currency, &isPaid, &paid, &ca); err != nil {
			continue
		}
		m := fiber.Map{"id": id, "amount": amount, "currency": currency, "is_paid": isPaid, "created_at": ca.Format(time.RFC3339)}
		if paid != nil {
			m["paid_at"] = paid.Format(time.RFC3339)
		}
		list = append(list, m)
	}
	if list == nil {
		list = []fiber.Map{}
	}
	return c.JSON(fiber.Map{"earnings": list})
}

func maxInt(a, b int) int {
	if a > b {
		return a
	}
	return b
}
