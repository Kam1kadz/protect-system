package admin

import (
	"context"
	"runtime"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"
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

	dbOk := h.db.Ping(ctx) == nil
	redisOk := h.rdb.Ping(ctx).Err() == nil

	dbStat := h.db.Stat()

	var mem runtime.MemStats
	runtime.ReadMemStats(&mem)

	status := fiber.StatusOK
	if !dbOk || !redisOk {
		status = fiber.StatusServiceUnavailable
	}

	return c.Status(status).JSON(fiber.Map{
		"db":    dbOk,
		"redis": redisOk,
		"pool": fiber.Map{
			"total":    dbStat.TotalConns(),
			"idle":     dbStat.IdleConns(),
			"acquired": dbStat.AcquiredConns(),
		},
		"memory": fiber.Map{
			"alloc_mb":   mem.Alloc / 1024 / 1024,
			"sys_mb":     mem.Sys / 1024 / 1024,
			"goroutines": runtime.NumGoroutine(),
		},
		"time": time.Now().UTC(),
	})
}