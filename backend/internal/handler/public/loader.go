package public

import (
	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/service"
)

type LoaderHandler struct {
	svc *service.LoaderService
}

func NewLoaderHandler(svc *service.LoaderService) *LoaderHandler {
	return &LoaderHandler{svc: svc}
}

func (h *LoaderHandler) Challenge(c *fiber.Ctx) error {
	var body struct {
		LicenseKey string `json:"license_key"`
		HWID       string `json:"hwid"`
	}
	if err := c.BodyParser(&body); err != nil || body.LicenseKey == "" || body.HWID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)

	result, err := h.svc.GenerateChallenge(c.Context(), schema, body.LicenseKey, body.HWID)
	if err != nil {
		return loaderError(c, err)
	}
	return c.JSON(result)
}

func (h *LoaderHandler) Auth(c *fiber.Ctx) error {
	var body struct {
		LicenseKey    string `json:"license_key"`
		HWID          string `json:"hwid"`
		Challenge     string `json:"challenge"`
		Response      string `json:"response"`
		LoaderVersion string `json:"loader_version"`
		MCVersion     string `json:"mc_version"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}
	if body.LicenseKey == "" || body.HWID == "" || body.Challenge == "" || body.Response == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "missing fields"})
	}
	if body.MCVersion != string(model.MCVersion1165) && body.MCVersion != string(model.MCVersion1214) {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unsupported mc_version"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)
	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	result, err := h.svc.Authenticate(
		c.Context(),
		schema, tenant.Slug,
		body.LicenseKey, body.HWID,
		body.Challenge, body.Response,
		body.LoaderVersion, body.MCVersion,
	)
	if err != nil {
		return loaderError(c, err)
	}
	return c.JSON(result)
}

func (h *LoaderHandler) Payload(c *fiber.Ctx) error {
	raw := c.Get("X-Session-Token")
	if raw == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing session token"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)
	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	c.Set("Content-Type", "application/octet-stream")
	c.Set("Transfer-Encoding", "chunked")
	c.Set("Cache-Control", "no-store")

	c.Context().SetBodyStreamWriter(func(w *bufio.Writer) {
		if err := h.svc.StreamPayload(c.Context(), schema, tenant.Slug, raw, w); err != nil {
			// Stream already started — cannot send JSON error, just close
			_ = err
		}
	})
	return nil
}

func (h *LoaderHandler) Heartbeat(c *fiber.Ctx) error {
	raw := c.Get("X-Session-Token")
	if raw == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing session token"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)

	if err := h.svc.Heartbeat(c.Context(), schema, raw); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "session invalid"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *LoaderHandler) Revoke(c *fiber.Ctx) error {
	raw := c.Get("X-Session-Token")
	if raw == "" {
		return c.SendStatus(fiber.StatusNoContent)
	}

	schema := c.Locals(middleware.SchemaKey()).(string)

	_ = h.svc.Revoke(c.Context(), schema, raw)
	return c.SendStatus(fiber.StatusNoContent)
}

func loaderError(c *fiber.Ctx, err error) error {
	switch err {
	case service.ErrLicenseNotFound, service.ErrBadResponse:
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	case service.ErrLicenseInactive:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "license inactive"})
	case service.ErrLicenseExpired:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "license expired"})
	case service.ErrHWIDMismatch:
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "hwid mismatch"})
	case service.ErrChallengeExpired:
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "challenge expired"})
	case service.ErrNoPayload:
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{"error": "payload not found"})
	case service.ErrSessionNotFound:
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "session invalid"})
	default:
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}
}