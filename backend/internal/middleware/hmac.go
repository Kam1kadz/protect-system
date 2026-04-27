package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/model"
)

func HMACVerify(cfg interface{ GetSigningKey(enc string) ([]byte, error) }) fiber.Handler {
	return func(c *fiber.Ctx) error {
		tenant, ok := c.Locals(ctxTenant).(*model.Tenant)
		if !ok {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "no tenant"})
		}

		sig := c.Get("X-Signature")
		ts := c.Get("X-Timestamp")
		nonce := c.Get("X-Nonce")

		key, err := cfg.GetSigningKey(tenant.SigningKeyEnc)
		if err != nil {
			return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
		}

		payload := fmt.Sprintf("%s\n%s\n%s\n%s\n%s",
			c.Method(),
			c.Path(),
			ts,
			nonce,
			string(c.Body()),
		)

		mac := hmac.New(sha256.New, key)
		mac.Write([]byte(payload))
		expected := hex.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(sig), []byte(expected)) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
		}

		return c.Next()
	}
}