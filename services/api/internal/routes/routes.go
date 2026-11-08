package routes

import (
	"net/http"
	"sync"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/handlers"
	"github.com/jpganeriwala-hpcl/services/api/internal/middleware"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"github.com/jpganeriwala-hpcl/services/api/internal/notify"
	"github.com/jpganeriwala-hpcl/services/api/internal/repository"
	"github.com/jpganeriwala-hpcl/services/api/internal/services"
	"go.uber.org/zap"
	"golang.org/x/time/rate"
	"gorm.io/gorm"
)

func cors(clientOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", clientOrigin)
		// Credentials required so the browser attaches/accepts the httpOnly
		// auth cookie on cross-origin requests (frontend and API run on
		// different ports/hosts) — must pair with a fetch() call that sets
		// credentials: 'include', and can never be combined with a wildcard
		// Allow-Origin (browsers reject that combination outright).
		c.Header("Access-Control-Allow-Credentials", "true")
		c.Header("Access-Control-Allow-Methods", "GET,POST,PUT,PATCH,DELETE,OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type,Authorization")
		if c.Request.Method == http.MethodOptions {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	}
}

// securityHeaders adds the standard defense-in-depth headers a browser-facing
// API should always send. CSP is deliberately narrow — this API only ever
// returns JSON, it never serves HTML that would need script/style sources.
func securityHeaders() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("X-Content-Type-Options", "nosniff")
		c.Header("X-Frame-Options", "DENY")
		c.Header("Referrer-Policy", "strict-origin-when-cross-origin")
		c.Header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'")
		c.Header("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		c.Next()
	}
}

// csrfOriginCheck rejects state-changing requests whose Origin header
// doesn't match the configured frontend — a second, independent layer on
// top of the auth cookie's SameSite=Lax, since Lax alone still allows
// cross-site *top-level navigations* (e.g. a malicious link that
// auto-submits a GET-based form) and some older browsers don't enforce
// SameSite at all. Bearer-token APIs don't need this (no ambient
// credential for a forged cross-site request to ride on); a cookie-based
// one does.
func csrfOriginCheck(clientOrigin string) gin.HandlerFunc {
	return func(c *gin.Context) {
		switch c.Request.Method {
		case http.MethodGet, http.MethodHead, http.MethodOptions:
			c.Next()
			return
		}
		origin := c.GetHeader("Origin")
		if origin != "" && origin != clientOrigin {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "cross-site request blocked"})
			return
		}
		c.Next()
	}
}

// rateLimit is a simple per-IP token bucket. In-memory, so it resets on
// restart and doesn't share state across instances — fine for a single Gin
// process; swap for a Redis-backed limiter before running more than one.
func rateLimit(rps float64, burst int) gin.HandlerFunc {
	var mu sync.Mutex
	limiters := make(map[string]*rate.Limiter)

	return func(c *gin.Context) {
		ip := c.ClientIP()

		mu.Lock()
		limiter, ok := limiters[ip]
		if !ok {
			limiter = rate.NewLimiter(rate.Limit(rps), burst)
			limiters[ip] = limiter
		}
		mu.Unlock()

		if !limiter.Allow() {
			c.AbortWithStatusJSON(http.StatusTooManyRequests, gin.H{"error": "too many requests — please wait and try again"})
			return
		}
		c.Next()
	}
}

func Setup(db *gorm.DB, cfg config.Config, logger *zap.Logger) *gin.Engine {
	router := gin.Default()
	router.Use(securityHeaders())
	router.Use(cors(cfg.ClientOrigin))
	router.Use(csrfOriginCheck(cfg.ClientOrigin))

	authRequired := middleware.RequireAuth(db, cfg.JWTSecret)
	adminOnly := middleware.RequireRole(models.RoleAdmin)

	// Employee permission gates — admin always passes; employee needs the
	// specific flag, checked fresh from the DB (see middleware/permission.go).
	canCreateOrders := middleware.RequirePermission(db, func(u models.User) bool { return u.CanCreateOrders })
	canManageOrderStatus := middleware.RequirePermission(db, func(u models.User) bool { return u.CanManageOrderStatus })
	canManageProducts := middleware.RequirePermission(db, func(u models.User) bool { return u.CanManageProducts })
	canViewLeads := middleware.RequirePermission(db, func(u models.User) bool { return u.CanViewLeads })
	canManageInventory := middleware.RequirePermission(db, func(u models.User) bool { return u.CanManageInventory })

	router.GET("/api/health", func(c *gin.Context) {
		sqlDB, _ := db.DB()
		status := "ok"
		if sqlDB.Ping() != nil {
			status = "degraded"
		}
		c.JSON(http.StatusOK, gin.H{"status": status})
	})

	authH := &handlers.AuthHandler{DB: db, Cfg: cfg, Log: logger}

	onboardingService := &services.OnboardingService{
		Users: repository.NewUserRepository(db),
		OTPs:  repository.NewOTPRepository(db),
		Notifier: notify.New(notify.Config{
			GmailSMTPUser:        cfg.GmailSMTPUser,
			GmailSMTPAppPassword: cfg.GmailSMTPAppPassword,
			EmailFromName:        cfg.EmailFromName,
		}, logger),
		Pepper: cfg.OTPPepper,
	}
	onboardingH := &handlers.OnboardingHandler{Service: onboardingService, Cfg: cfg, Log: logger}
	googleAuthH := &handlers.GoogleAuthHandler{Service: onboardingService, Cfg: cfg, Log: logger}
	profileH := &handlers.ProfileHandler{DB: db, Log: logger}
	addressH := &handlers.AddressHandler{Addresses: repository.NewAddressRepository(db), Log: logger}

	api := router.Group("/api")
	{
		auth := api.Group("/auth")
		// Login/register are the brute-force/credential-stuffing surface —
		// tight bucket. Logout and /me aren't sensitive the same way.
		auth.POST("/login", rateLimit(0.5, 5), authH.Login)
		auth.POST("/register", rateLimit(0.2, 3), authH.Register)
		auth.POST("/logout", authH.Logout)
		auth.GET("/me", authRequired, authH.Me)

		// OTP-based client onboarding/login — the per-identifier and
		// per-IP hourly cap lives inside OnboardingService itself (a DB
		// count, precise and durable across restarts); this IP-bucket
		// rate limiter is just the same cheap first line of defense the
		// rest of the public endpoints get.
		auth.POST("/otp/request", rateLimit(0.5, 5), onboardingH.RequestEmailOTP)
		auth.POST("/otp/verify", rateLimit(0.5, 5), onboardingH.VerifyEmailOTP)

		// Google Sign-In — token verification itself is the security
		// boundary here (see GoogleAuthHandler.SignIn), not this rate
		// limit; it's the same cheap first line of defense as the rest of
		// the public auth endpoints.
		auth.POST("/google", rateLimit(0.5, 5), googleAuthH.SignIn)

		profile := api.Group("/profile", authRequired)
		// Same handler as GET /auth/me — both return the caller's own
		// account (see AuthHandler.Me), kept as one implementation rather
		// than two copies of the same DB lookup under different names.
		profile.GET("", authH.Me)
		profile.PUT("", profileH.UpdateProfile)

		addresses := profile.Group("/addresses")
		addresses.GET("", addressH.List)
		addresses.POST("", addressH.Create)
		addresses.PUT("/:id", addressH.Update)
		addresses.DELETE("/:id", addressH.Delete)

		productH := &handlers.ProductHandler{DB: db, Log: logger}
		products := api.Group("/products")
		products.GET("", productH.List)
		products.GET("/:id", productH.Get)
		products.POST("", authRequired, canManageProducts, productH.Create)
		products.PUT("/:id", authRequired, canManageProducts, productH.Update)
		products.DELETE("/:id", authRequired, canManageProducts, productH.Delete)

		// Create is role-branching inside the handler (client self-service vs.
		// admin/employee on-behalf), so only authRequired gates it at the
		// route level — the employee CanCreateOrders check happens in-handler
		// because it's conditional on role, not a blanket requirement.
		orderH := &handlers.OrderHandler{DB: db, Log: logger}
		orders := api.Group("/orders", authRequired)
		orders.POST("", orderH.Create)
		orders.GET("", orderH.List)
		orders.GET("/:id", orderH.Get)
		orders.POST("/:id/reorder", middleware.RequireRole(models.RoleClient), orderH.Reorder)
		orders.POST("/:id/confirm-delivery", middleware.RequireRole(models.RoleClient), orderH.ConfirmDelivery)
		orders.PATCH("/:id/status", canManageOrderStatus, orderH.UpdateStatus)
		orders.POST("/:id/notes", canManageOrderStatus, orderH.AddNote)
		orders.POST("/:id/approve", adminOnly, orderH.Approve)

		leadH := &handlers.LeadHandler{DB: db, Log: logger}
		leads := api.Group("/leads")
		// Public + unauthenticated — the contact form's abuse surface.
		leads.POST("", rateLimit(0.5, 5), leadH.Create)
		leads.GET("", authRequired, canViewLeads, leadH.List)

		// Staff management — strictly admin-only, no employee override ever.
		// An employee must never be able to create staff or grant itself
		// (or a peer) more permissions than the owner set.
		employeeH := &handlers.EmployeeHandler{DB: db, Log: logger}
		employees := api.Group("/employees", authRequired, adminOnly)
		employees.POST("", employeeH.Create)
		employees.GET("", employeeH.List)
		employees.PATCH("/:id/permissions", employeeH.UpdatePermissions)
		employees.PATCH("/:id/status", employeeH.SetActive)

		clientH := &handlers.ClientHandler{DB: db, Log: logger}
		api.GET("/clients", authRequired, canCreateOrders, clientH.List)
		// Same gate as the list: whoever can pick a client for an order can
		// also correct that client's contact details (never their email).
		api.PUT("/clients/:id", authRequired, canCreateOrders, clientH.Update)

		// Inventory: dashboard + inward sync open to admin or a flagged
		// employee; the raw audit ledger and any correction to it are
		// admin-only, full stop — mirrors the same RequireRole(RoleAdmin)
		// gate used everywhere else in this file, nothing new invented for
		// the "only admin can edit an existing stock entry" requirement.
		inventoryH := &handlers.InventoryHandler{DB: db, Log: logger}
		inventory := api.Group("/inventory", authRequired)
		inventory.GET("", canManageInventory, inventoryH.Dashboard)
		inventory.POST("/inward/sync", canManageInventory, inventoryH.SyncInward)
		inventory.GET("/transactions", adminOnly, inventoryH.ListTransactions)
		inventory.PATCH("/transactions/:id", adminOnly, inventoryH.UpdateTransaction)
	}

	return router
}
