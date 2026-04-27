package public

import (
	"context"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/ps/backend/internal/middleware"
)

type PlansHandler struct{ db *pgxpool.Pool }

func NewPlansHandler(db *pgxpool.Pool) *PlansHandler {
	return &PlansHandler{db: db}
}

func (h *PlansHandler) List(c *fiber.Ctx) error {
	schema := c.Locals(middleware.SchemaKey()).(string)
	s, _ := safeSchema(schema)

	rows, err := h.db.Query(c.Context(), fmt.Sprintf(
		`SELECT id, name, display_name, sort_order
		 FROM %s.subscription_plans
		 WHERE is_active = true ORDER BY sort_order`, s))
	if err != nil {
		return c.Status(500).JSON(fiber.Map{"error": "db error"})
	}
	defer rows.Close()

	type PlanRow struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
		Tiers       []any  `json:"tiers"`
	}

	var plans []PlanRow
	for rows.Next() {
		var p PlanRow
		if err := rows.Scan(&p.ID, &p.Name, &p.DisplayName, new(int)); err != nil {
			continue
		}
		trows, _ := h.db.Query(context.Background(), fmt.Sprintf(
			`SELECT id, duration_days, price, currency
			 FROM %s.plan_tiers WHERE plan_id = $1 AND is_active = true
			 ORDER BY duration_days`, s), p.ID)
		for trows.Next() {
			var tid, currency string
			var days int
			var price float64
			if err := trows.Scan(&tid, &days, &price, &currency); err != nil {
				continue
			}
			p.Tiers = append(p.Tiers, fiber.Map{
				"id": tid, "duration_days": days,
				"price": price, "currency": currency,
			})
		}
		trows.Close()
		plans = append(plans, p)
	}

	return c.JSON(fiber.Map{"plans": plans})
}
