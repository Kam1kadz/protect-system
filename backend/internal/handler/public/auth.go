package public

import (
	"errors"
	"log"

	"github.com/gofiber/fiber/v2"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/model"
	"github.com/ps/backend/internal/service"
	"github.com/ps/backend/internal/token"
)

type AuthHandler struct {
	svc *service.AuthService
}

func NewAuthHandler(svc *service.AuthService) *AuthHandler {
	return &AuthHandler{svc: svc}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var body struct {
		Username string `json:"username"`
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}
	if body.Username == "" || body.Email == "" || len(body.Password) < 8 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "invalid fields"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)
	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	user, err := h.svc.Register(c.Context(), schema, body.Username, body.Email, body.Password, c.IP())
	if err != nil {
		if errors.Is(err, service.ErrEmailTaken) || errors.Is(err, service.ErrUsernameTaken) {
			return c.Status(fiber.StatusConflict).JSON(fiber.Map{"error": err.Error()})
		}
		log.Printf("[Register] schema=%s err=%v", schema, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	pair, err := h.svc.Login(c.Context(), schema, tenant.ID, body.Email, body.Password, c.IP())
	if err != nil {
		log.Printf("[Register/Login] schema=%s err=%v", schema, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": err.Error()})
	}

	_ = user
	setAuthCookies(c, pair)
	return c.Status(fiber.StatusCreated).JSON(fiber.Map{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var body struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if err := c.BodyParser(&body); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"error": "bad request"})
	}

	schema := c.Locals(middleware.SchemaKey()).(string)
	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	pair, err := h.svc.Login(c.Context(), schema, tenant.ID, body.Email, body.Password, c.IP())
	if err != nil {
		if errors.Is(err, service.ErrBadCredentials) {
			return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid credentials"})
		}
		if errors.Is(err, service.ErrUserBanned) {
			return c.Status(fiber.StatusForbidden).JSON(fiber.Map{"error": "banned"})
		}
		log.Printf("[Login] schema=%s err=%v", schema, err)
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{"error": "internal"})
	}

	setAuthCookies(c, pair)
	return c.JSON(fiber.Map{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Refresh(c *fiber.Ctx) error {
	raw := c.Cookies("refresh_token")
	if raw == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "missing refresh token"})
	}

	tenant := c.Locals(middleware.TenantKey()).(*model.Tenant)

	pair, err := h.svc.Refresh(c.Context(), raw, tenant.ID)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{"error": "invalid refresh token"})
	}

	setAuthCookies(c, pair)
	return c.JSON(fiber.Map{"access_token": pair.AccessToken})
}

func (h *AuthHandler) Logout(c *fiber.Ctx) error {
	c.Cookie(&fiber.Cookie{Name: "access_token", Value: "", MaxAge: -1, HTTPOnly: true})
	c.Cookie(&fiber.Cookie{Name: "refresh_token", Value: "", MaxAge: -1, HTTPOnly: true})
	return c.SendStatus(fiber.StatusNoContent)
}

func (h *AuthHandler) Me(c *fiber.Ctx) error {
	claims := c.Locals(middleware.ClaimsKey()).(*token.Claims)
	schema := c.Locals(middleware.SchemaKey()).(string)

	user, err := h.svc.GetUserByID(c.Context(), schema, claims.UserID)
	if err != nil {
		log.Printf("[Me] schema=%s user_id=%s err=%v", schema, claims.UserID, err)
		// fallback: вернуть хотя бы данные из claims
		return c.JSON(fiber.Map{
			"id":        claims.UserID,
			"username":  "",
			"email":     "",
			"role":      claims.Role,
			"tenant_id": claims.TenantID,
		})
	}

	return c.JSON(fiber.Map{
		"id":        user.ID,
		"username":  user.Username,
		"email":     user.Email,
		"role":      user.Role,
		"tenant_id": claims.TenantID,
	})
}

func setAuthCookies(c *fiber.Ctx, pair *service.TokenPair) {
	c.Cookie(&fiber.Cookie{
		Name:     "access_token",
		Value:    pair.AccessToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
	})
	c.Cookie(&fiber.Cookie{
		Name:     "refresh_token",
		Value:    pair.RefreshToken,
		HTTPOnly: true,
		Secure:   true,
		SameSite: "Strict",
		MaxAge:   int(pair.ExpiresAt.Unix()),
	})
}
