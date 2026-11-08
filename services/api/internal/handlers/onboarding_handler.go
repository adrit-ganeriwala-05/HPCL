package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/auth"
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/services"
	"go.uber.org/zap"
)

type OnboardingHandler struct {
	Service *services.OnboardingService
	Cfg     config.Config
	Log     *zap.Logger
}

type requestEmailOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
}

type verifyEmailOTPRequest struct {
	Email string `json:"email" binding:"required,email"`
	Code  string `json:"code" binding:"required,len=6,numeric"`
}

// RequestEmailOTP is public — anyone can ask for a code. Response is
// identical whether the email is new or already registered (see
// OnboardingService.VerifyEmailOTP's doc comment): revealing that would be
// a user-enumeration leak.
func (h *OnboardingHandler) RequestEmailOTP(c *gin.Context) {
	var req requestEmailOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	err := h.Service.RequestEmailOTP(c.Request.Context(), req.Email, c.ClientIP())
	if err != nil {
		h.respondOTPError(c, err, "request")
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Verification code sent — it expires in 5 minutes."})
}

// VerifyEmailOTP verifies the code and either logs an existing client in or
// registers a new one (see OnboardingService.VerifyEmailOTP) — the two
// cases are indistinguishable from the caller's side by design.
func (h *OnboardingHandler) VerifyEmailOTP(c *gin.Context) {
	var req verifyEmailOTPRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	user, err := h.Service.VerifyEmailOTP(c.Request.Context(), req.Email, req.Code)
	if err != nil {
		h.respondOTPError(c, err, "verify")
		return
	}
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{"error": "this account has been deactivated"})
		return
	}

	token, err := auth.GenerateToken(h.Cfg.JWTSecret, user.ID, user.Role, user.SessionVersion, h.Cfg.JWTTTL)
	if err != nil {
		h.Log.Error("failed to issue token after otp verify", zap.Error(err), zap.Uint("userId", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue token"})
		return
	}

	setAuthCookie(c, h.Cfg, token)
	c.JSON(http.StatusOK, authResponse{User: toPublic(*user)})
}

// respondOTPError maps the service's sentinel errors to the right HTTP
// status — kept in one place so RequestEmailOTP/VerifyEmailOTP fail the
// same way for the same condition instead of drifting.
func (h *OnboardingHandler) respondOTPError(c *gin.Context, err error, stage string) {
	switch {
	case errors.Is(err, services.ErrRateLimited):
		c.JSON(http.StatusTooManyRequests, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrNoActiveCode):
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrCodeLocked):
		c.JSON(http.StatusLocked, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrInvalidCode):
		c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
	case errors.Is(err, services.ErrUserInactive):
		c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
	default:
		h.Log.Error("otp "+stage+" failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "something went wrong — please try again"})
	}
}
