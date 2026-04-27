package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

func AntiReplay(rdb *redis.Client, driftSec int64, nonceTTL int) fiber.Handler {
	return func(c *fiber.Ctx) error {
		ts := c.GetReqHeaders()["X-Timestamp"]
		nonce := c.Get("X-Nonce")

		if len(ts) == 0 || nonce == "" {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing replay headers"})
		}

		var tsVal int64
		fmt.Sscanf(ts[0], "%d", &tsVal)
		diff := time.Now().Unix() - tsVal
		if diff > driftSec || diff < -driftSec {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "timestamp drift"})
		}

		key := fmt.Sprintf("nonce:%s", nonce)
		ctx := context.Background()
		set, err := rdb.SetNX(ctx, key, 1, time.Duration(nonceTTL)*time.Second).Result()
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
		}
		if !set {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "replay detected"})
		}

		return c.Next()
	}
}