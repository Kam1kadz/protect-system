package main

import (
	"context"
	"log"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/compress"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/ps/backend/config"
	"github.com/ps/backend/internal/db"
	handlerAdmin  "github.com/ps/backend/internal/handler/admin"
	handlerPublic "github.com/ps/backend/internal/handler/public"
	"github.com/ps/backend/internal/middleware"
	"github.com/ps/backend/internal/rdb"
	"github.com/ps/backend/internal/repo"
	"github.com/ps/backend/internal/service"
	"github.com/ps/backend/internal/storage"
)

func main() {
	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	if err := db.RunPublicMigrations(cfg.DatabaseURL); err != nil {
		log.Fatalf("migrate: %v", err)
	}

	pool, err := db.NewPool(context.Background(), cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("db: %v", err)
	}
	defer pool.Close()

	redisClient, err := rdb.New(cfg.RedisURL)
	if err != nil {
		log.Fatalf("redis: %v", err)
	}
	defer redisClient.Close()

	minioClient, err := storage.NewMinioClient(
		cfg.MinioEndpoint, cfg.MinioAccessKey,
		cfg.MinioSecretKey, cfg.MinioBucket, cfg.MinioUseSSL,
	)
	if err != nil {
		log.Fatalf("minio: %v", err)
	}
	if err := minioClient.EnsureBucket(context.Background()); err != nil {
		log.Fatalf("minio bucket: %v", err)
	}

	tenantRepo  := repo.NewTenantRepo(pool)
	userRepo    := repo.NewUserRepo(pool)
	licenseRepo := repo.NewLicenseRepo(pool)
	runtimeRepo := repo.NewRuntimeRepo(pool)

	authSvc    := service.NewAuthService(userRepo, cfg)
	loaderSvc  := service.NewLoaderService(licenseRepo, userRepo, redisClient, minioClient, cfg)
	runtimeSvc := service.NewRuntimeService(runtimeRepo, userRepo, licenseRepo, cfg)

	authH    := handlerPublic.NewAuthHandler(authSvc)
	loaderH  := handlerPublic.NewLoaderHandler(loaderSvc)
	runtimeH := handlerPublic.NewRuntimeHandler(runtimeSvc)
	statusH  := handlerPublic.NewStatusHandler(pool, redisClient)

	payloadH := handlerAdmin.NewPayloadHandler(tenantRepo, licenseRepo, minioClient, pool, cfg)
	manageH  := handlerAdmin.NewManageHandler(pool)

	app := fiber.New(fiber.Config{
		ReadTimeout:  10 * time.Second,
		WriteTimeout: 60 * time.Second,
		BodyLimit:    200 * 1024 * 1024,
	})

	app.Use(recover.New())
	app.Use(compress.New())
	app.Use(cors.New(cors.Config{
		AllowOriginsFunc: func(origin string) bool { return true },
		AllowHeaders:     "Origin, Content-Type, Accept, Authorization, X-Tenant-ID, X-Request-ID, X-HMAC-Signature, X-Timestamp, X-Nonce",
		AllowMethods:     "GET, POST, PUT, PATCH, DELETE, OPTIONS",
		AllowCredentials: true,
		MaxAge:           3600,
	}))
	app.Use(middleware.TenantResolver(tenantRepo))
	app.Use(middleware.RateLimit(redisClient, "pub", 120, time.Minute))

	app.Get("/health", statusH.Health)

	v1 := app.Group("/api/v1")

	// ── Auth ────────────────────────────────────────────────────────────────────────────
	auth := v1.Group("/auth")
	auth.Use(middleware.RateLimit(redisClient, "auth", 10, time.Minute))
	auth.Post("/register", authH.Register)
	auth.Post("/login",    authH.Login)
	auth.Post("/refresh",  authH.Refresh)
	auth.Post("/logout",   authH.Logout)
	auth.Get("/me",
		middleware.JWTAuth(cfg.JWTAccessSecret, "access"),
		authH.Me,
	)

	plansH := handlerPublic.NewPlansHandler(pool)
	v1.Get("/auth/plans", plansH.List)

	storeH := handlerPublic.NewStoreHandler(pool)

	store := v1.Group("/store")
	store.Use(middleware.MaintenanceGuard(pool))
	store.Get("/promo/:code",
		middleware.JWTAuth(cfg.JWTAccessSecret, "access"),
		storeH.ValidatePromo,
	)
	store.Post("/activate",
		middleware.JWTAuth(cfg.JWTAccessSecret, "access"),
		middleware.RateLimit(redisClient, "store", 5, time.Minute),
		storeH.Activate,
	)

	// ── Loader (protected by maintenance) ─────────────────────────────────────────
	loader := v1.Group("/loader")
	loader.Use(middleware.MaintenanceGuard(pool))
	loader.Use(middleware.RateLimit(redisClient, "loader", 30, time.Minute))
	loader.Use(middleware.RateLimitHWID(redisClient, "loader", 20, time.Minute))
	loader.Use(middleware.AntiReplay(redisClient, cfg.HMACDrift, cfg.NonceTTL))
	loader.Post("/challenge", loaderH.Challenge)
	loader.Post("/auth",      loaderH.Auth)
	loader.Get("/payload",    loaderH.Payload)
	loader.Post("/heartbeat", loaderH.Heartbeat)
	loader.Post("/revoke",    loaderH.Revoke)

	// ── Runtime (protected by maintenance) ─────────────────────────────────────────
	rt := v1.Group("/runtime")
	rt.Use(middleware.MaintenanceGuard(pool))
	rt.Use(middleware.RateLimit(redisClient, "runtime", 60, time.Minute))
	rt.Use(middleware.AntiReplay(redisClient, cfg.HMACDrift, cfg.NonceTTL))
	rt.Use(middleware.RuntimeHMACVerify(cfg.MasterKey))
	rt.Post("/init",      runtimeH.Init)
	rt.Post("/heartbeat", runtimeH.Heartbeat)
	rt.Get("/user",       runtimeH.GetUser)
	rt.Post("/event",     runtimeH.ReportEvent)
	rt.Post("/terminate", runtimeH.Terminate)

	// ── Admin API ───────────────────────────────────────────────────────────────────
	adm := v1.Group("/admin")
	adm.Use(middleware.JWTAuth(cfg.JWTAccessSecret, "access"))
	adm.Use(middleware.RequireRoles("admin", "support"))

	adm.Get("/stats",      manageH.Stats)
	adm.Get("/config",     manageH.GetConfig)
	adm.Get("/roles",      manageH.ListRoles)
	adm.Post("/roles",     middleware.RequireRoles("admin"), manageH.UpsertRole)

	adm.Post("/maintenance",
		middleware.RequireRoles("admin"),
		manageH.SetMaintenance,
	)

	users := adm.Group("/users")
	users.Get("/",                  manageH.ListUsers)
	users.Post("/:id/ban",          manageH.BanUser)
	users.Post("/:id/unban",        manageH.UnbanUser)
	users.Post("/:id/role",         middleware.RequireRoles("admin"), manageH.SetRole)
	users.Post("/:id/hwid-reset",   manageH.ResetHWID)
	users.Post("/:id/subscription", middleware.RequireRoles("admin"), manageH.GiveSubscription)

	lics := adm.Group("/licenses")
	lics.Get("/",       manageH.ListLicenses)
	lics.Delete("/:id", manageH.RevokeLicense)

	keys := adm.Group("/keys")
	keys.Get("/",       manageH.ListKeys)
	keys.Post("/",      middleware.RequireRoles("admin"), manageH.GenerateKeys)
	keys.Delete("/:id", middleware.RequireRoles("admin"), manageH.DeleteKey)

	promo := adm.Group("/promo")
	promo.Get("/",       manageH.ListPromo)
	promo.Post("/",      middleware.RequireRoles("admin"), manageH.CreatePromo)
	promo.Delete("/:id", middleware.RequireRoles("admin"), manageH.DeletePromo)

	adm.Get("/events",            manageH.ListEvents)
	adm.Get("/transactions",      manageH.ListTransactions)
	adm.Get("/earnings",          manageH.ListEarnings)
	adm.Post("/earnings/:id/pay", middleware.RequireRoles("admin"), manageH.MarkEarningPaid)
	adm.Get("/logs",              manageH.ListLogs)

	payload := adm.Group("/payload")
	payload.Use(middleware.RequireRoles("admin"))
	payload.Post("/:plan_id",   payloadH.Upload)
	payload.Get("/:plan_id",    payloadH.Check)
	payload.Delete("/:plan_id", payloadH.Delete)

	log.Printf("public server on %s", cfg.PublicAddr)
	if err := app.Listen(cfg.PublicAddr); err != nil {
		log.Fatalf("listen: %v", err)
	}
}
