package middleware

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"

	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/crypto"
)

const ctxSessionToken = "rt_session_token"
const ctxTokenHash    = "rt_token_hash"

func RuntimeHMACVerify(masterKey []byte) fiber.Handler {
	return func(c *fiber.Ctx) error {
		sessionToken := c.Get("X-Session-Token")
		sig          := c.Get("X-Signature")
		ts           := c.Get("X-Timestamp")
		nonce        := c.Get("X-Nonce")

		if sessionToken == "" || sig == "" || ts == "" || nonce == "" {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing headers"})
		}

		tokenHash  := crypto.HashSHA256Hex([]byte(sessionToken))
		sessionKey := crypto.DeriveKey(masterKey, "sk:"+tokenHash)

		payload := fmt.Sprintf("%s\n%s\n%s\n%s\n%s",
			c.Method(),
			c.Path(),
			ts,
			nonce,
			string(c.Body()),
		)

		mac := hmac.New(sha256.New, sessionKey)
		mac.Write([]byte(payload))
		expected := hex.EncodeToString(mac.Sum(nil))

		if !hmac.Equal([]byte(sig), []byte(expected)) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid signature"})
		}

		c.Locals(ctxSessionToken, sessionToken)
		c.Locals(ctxTokenHash, tokenHash)
		return c.Next()
	}
}

func RuntimeSessionTokenKey() string { return ctxSessionToken }