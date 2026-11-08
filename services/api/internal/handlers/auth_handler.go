package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/auth"
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/middleware"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type AuthHandler struct {
	DB  *gorm.DB
	Cfg config.Config
	Log *zap.Logger
}

// setAuthCookie is the only place a JWT is ever written to the response.
// httpOnly means client-side JS (and therefore any XSS payload) can never
// read it — a strictly better posture than the old Authorization-header /
// localStorage approach, which handed the token to any script running on
// the page. SameSite=Lax covers same-site deployments (frontend/backend on
// the same registrable domain, e.g. app.example.com + api.example.com) and
// still blocks the cross-site POST forgeries SameSite exists to stop;
// routes.go additionally checks Origin on state-changing requests as a
// second layer, since SameSite alone doesn't defend older browsers.
//
// Package-level (not a method) so both AuthHandler and OnboardingHandler
// issue sessions through the exact same code path — the OTP-verified login
// in onboarding_handler.go must end up with an identical cookie to a
// password login, not a parallel implementation that could quietly drift.
func setAuthCookie(c *gin.Context, cfg config.Config, token string) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(middleware.CookieName, token, int(cfg.JWTTTL.Seconds()), "/", "", cfg.IsProduction(), true)
}

func clearAuthCookie(c *gin.Context, cfg config.Config) {
	c.SetSameSite(http.SameSiteLaxMode)
	c.SetCookie(middleware.CookieName, "", -1, "/", "", cfg.IsProduction(), true)
}

type registerRequest struct {
	Name        string `json:"name" binding:"required"`
	Email       string `json:"email" binding:"required,email"`
	Password    string `json:"password" binding:"required,min=8"`
	CompanyName string `json:"companyName"`
	Phone       string `json:"phone"` // optional at sign-up
}

type loginRequest struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

type authResponse struct {
	User userPublic `json:"user"`
}

type userPublic struct {
	ID                   uint        `json:"id"`
	Name                 string      `json:"name"`
	Email                string      `json:"email"`
	CompanyName          string      `json:"companyName"`
	ContactPerson        string      `json:"contactPerson"`
	Phone                string      `json:"phone"`
	Role                 models.Role `json:"role"`
	CanCreateOrders      bool        `json:"canCreateOrders"`
	CanManageOrderStatus bool        `json:"canManageOrderStatus"`
	CanManageProducts    bool        `json:"canManageProducts"`
	CanViewLeads         bool        `json:"canViewLeads"`
	CanManageInventory   bool        `json:"canManageInventory"`
}

func toPublic(u models.User) userPublic {
	return userPublic{
		ID:                   u.ID,
		Name:                 u.Name,
		Email:                u.Email,
		CompanyName:          u.CompanyName,
		ContactPerson:        u.ContactPerson,
		Phone:                u.Phone,
		Role:                 u.Role,
		CanCreateOrders:      u.CanCreateOrders,
		CanManageOrderStatus: u.CanManageOrderStatus,
		CanManageProducts:    u.CanManageProducts,
		CanViewLeads:         u.CanViewLeads,
		CanManageInventory:   u.CanManageInventory,
	}
}

// Register always creates a 'client' account. Admin accounts are provisioned
// out-of-band (cmd/seed) — a public endpoint must never be able to mint admins.
func (h *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	phone, ok := normalizeOptionalPhone(req.Phone)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidPhoneMsg})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not process password"})
		return
	}

	user := models.User{
		Name:         req.Name,
		Email:        req.Email,
		PasswordHash: hash,
		CompanyName:  req.CompanyName,
		Phone:        phone,
		Role:         models.RoleClient,
	}

	if err := h.DB.Create(&user).Error; err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "an account with that email already exists"})
			return
		}
		h.Log.Error("failed to create user account", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create account"})
		return
	}

	token, err := auth.GenerateToken(h.Cfg.JWTSecret, user.ID, user.Role, user.SessionVersion, h.Cfg.JWTTTL)
	if err != nil {
		h.Log.Error("failed to issue token on register", zap.Error(err), zap.Uint("userId", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue token"})
		return
	}

	setAuthCookie(c, h.Cfg, token)
	c.JSON(http.StatusCreated, authResponse{User: toPublic(user)})
}

func (h *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var user models.User
	err := h.DB.Where("email = ?", req.Email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) || !auth.CheckPassword(user.PasswordHash, req.Password) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid email or password"})
		return
	}
	if err != nil {
		h.Log.Error("failed to look up user during login", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not process login"})
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "this account has been deactivated"})
		return
	}

	token, err := auth.GenerateToken(h.Cfg.JWTSecret, user.ID, user.Role, user.SessionVersion, h.Cfg.JWTTTL)
	if err != nil {
		h.Log.Error("failed to issue token on login", zap.Error(err), zap.Uint("userId", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue token"})
		return
	}

	setAuthCookie(c, h.Cfg, token)
	c.JSON(http.StatusOK, authResponse{User: toPublic(user)})
}

// Logout clears the auth cookie AND revokes the token server-side: it bumps
// the user's session_version, so RequireAuth rejects this token (and every
// other token that user was issued, on any device) from now on — a copy of
// the cookie taken before logout is useless afterwards. The WHERE on the
// current version makes replaying an already-revoked token here a no-op.
// No valid token (already logged out, expired, garbage) = just clear the
// cookie; logout must always succeed from the user's point of view.
func (h *AuthHandler) Logout(c *gin.Context) {
	if tokenString, err := c.Cookie(middleware.CookieName); err == nil && tokenString != "" {
		if claims, err := auth.ParseToken(h.Cfg.JWTSecret, tokenString); err == nil {
			err := h.DB.Model(&models.User{}).
				Where("id = ? AND session_version = ?", claims.UserID, claims.SessionVersion).
				UpdateColumn("session_version", gorm.Expr("session_version + 1")).Error
			if err != nil {
				h.Log.Error("failed to revoke sessions on logout", zap.Error(err), zap.Uint("userId", claims.UserID))
				c.JSON(http.StatusInternalServerError, gin.H{"error": "could not sign out — please try again"})
				return
			}
		}
	}
	clearAuthCookie(c, h.Cfg)
	c.JSON(http.StatusOK, gin.H{"message": "signed out"})
}

func (h *AuthHandler) Me(c *gin.Context) {
	var user models.User
	if err := h.DB.First(&user, middleware.CurrentUserID(c)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}
	c.JSON(http.StatusOK, toPublic(user))
}
