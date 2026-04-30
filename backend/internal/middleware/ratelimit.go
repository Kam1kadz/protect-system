package middleware

import (
	"context"
	"fmt"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/redis/go-redis/v9"
)

func RateLimit(rdb *redis.Client, prefix string, limit int, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		key := fmt.Sprintf("rl:%s:%s", prefix, c.IP())
		now := time.Now().UnixMilli()
		windowMs := window.Milliseconds()

		ctx := context.Background()
		pipe := rdb.Pipeline()
		pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", now-windowMs))
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
		pipe.ZCard(ctx, key)
		pipe.Expire(ctx, key, window)
		cmds, err := pipe.Exec(ctx)
		if err != nil {
			return c.Next()
		}

		count := cmds[2].(*redis.IntCmd).Val()
		if count > int64(limit) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "rate limit exceeded"})
		}
		return c.Next()
	}
}

func RateLimitHWID(rdb *redis.Client, prefix string, limit int, window time.Duration) fiber.Handler {
	return func(c *fiber.Ctx) error {
		hwid := c.Get("X-HWID")
		if hwid == "" {
			return c.Next()
		}

		key := fmt.Sprintf("rl:%s:hwid:%s", prefix, hwid)
		now := time.Now().UnixMilli()
		windowMs := window.Milliseconds()

		ctx := context.Background()
		pipe := rdb.Pipeline()
		pipe.ZRemRangeByScore(ctx, key, "0", fmt.Sprintf("%d", now-windowMs))
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now), Member: now})
		pipe.ZCard(ctx, key)
		pipe.Expire(ctx, key, window)
		cmds, err := pipe.Exec(ctx)
		if err != nil {
			return c.Next()
		}

		count := cmds[2].(*redis.IntCmd).Val()
		if count > int64(limit) {
			return c.Status(fiber.StatusTooManyRequests).JSON(fiber.Map{"error": "rate limit exceeded"})
		}
		return c.Next()
	}
}