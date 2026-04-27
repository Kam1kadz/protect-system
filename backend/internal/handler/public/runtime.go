package public

import (
	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/service"
)

type RuntimeHandler struct {
	svc *service.RuntimeService
}

func NewRuntimeHandler(svc *service.RuntimeService) *RuntimeHandler {
	return &RuntimeHandler{svc: svc}
}

func (h *RuntimeHandler) Init(c *fiber.Ctx) error {
	var body struct {
		HWID           string `json:"hwid"`
		LauncherToken  string `json:"launcher_token"`
		IntegrityProof string `json:"integrity_proof"`
	}
	if err := c.BodyParser(&body); err != nil || body.HWID == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	schema       := c.Locals(middleware.SchemaKey()).(string)
	sessionToken := c.Locals(middleware.RuntimeSessionTokenKey()).(string)

	if err := h.svc.Init(c.Context(), schema, sessionToken,
		body.HWID, body.LauncherToken, body.IntegrityProof,
	); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}

	return c.JSON(fiber.Map{"status": "ok"})
}

func (h *RuntimeHandler) Heartbeat(c *fiber.Ctx) error {
	schema       := c.Locals(middleware.SchemaKey()).(string)
	sessionToken := c.Locals(middleware.RuntimeSessionTokenKey()).(string)

	if err := h.svc.Heartbeat(c.Context(), schema, sessionToken); err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *RuntimeHandler) GetUser(c *fiber.Ctx) error {
	schema       := c.Locals(middleware.SchemaKey()).(string)
	sessionToken := c.Locals(middleware.RuntimeSessionTokenKey()).(string)

	info, err := h.svc.GetUser(c.Context(), schema, sessionToken)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "unauthorized"})
	}
	return c.JSON(info)
}

func (h *RuntimeHandler) ReportEvent(c *fiber.Ctx) error {
	var body struct {
		EventType string         `json:"event_type"`
		Payload   map[string]any `json:"payload"`
	}
	if err := c.BodyParser(&body); err != nil || body.EventType == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	allowed := map[string]bool{
		"debugger_detected":   true,
		"jvmti_dump_attempt":  true,
		"integrity_failure":   true,
		"profiler_detected":   true,
		"hwid_mismatch":       true,
		"launcher_check_failed": true,
		"jvm_agent_detected":  true,
	}
	if !allowed[body.EventType] {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "unknown event type"})
	}

	schema       := c.Locals(middleware.SchemaKey()).(string)
	sessionToken := c.Locals(middleware.RuntimeSessionTokenKey()).(string)

	_ = h.svc.ReportEvent(c.Context(), schema, sessionToken, body.EventType, c.IP(), body.Payload)
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *RuntimeHandler) Terminate(c *fiber.Ctx) error {
	schema       := c.Locals(middleware.SchemaKey()).(string)
	sessionToken := c.Locals(middleware.RuntimeSessionTokenKey()).(string)

	_ = h.svc.Terminate(c.Context(), schema, sessionToken)
	return c.SendStatus(fiber.StatusNoContent)
}

// Ensure model import is used somewhere in package
var _ = model.LicenseActive