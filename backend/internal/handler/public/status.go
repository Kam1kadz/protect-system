package public

import (
	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
	"context"
	"time"
)

type StatusHandler struct {
	db  *pgxpool.Pool
	rdb *redis.Client
}

func NewStatusHandler(db *pgxpool.Pool, rdb *redis.Client) *StatusHandler {
	return &StatusHandler{db: db, rdb: rdb}
}

func (h *StatusHandler) Health(c *fiber.Ctx) error {
	ctx, cancel := context.WithTimeout(c.Context(), 2*time.Second)
	defer cancel()

	dbOk := true
	if err := h.db.Ping(ctx); err != nil {
		dbOk = false
	}

	redisOk := true
	if err := h.rdb.Ping(ctx).Err(); err != nil {
		redisOk = false
	}

	status := fiber.StatusOK
	if !dbOk || !redisOk {
		status = fiber.StatusServiceUnavailable
	}

	return c.Status(status).JSON(fiber.Map{
		"db":    dbOk,
		"redis": redisOk,
		"time":  time.Now().UTC(),
	})
}