package handlers

import (
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/auth"
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/services"
	"go.uber.org/zap"
	"google.golang.org/api/idtoken"
)

type GoogleAuthHandler struct {
	Service *services.OnboardingService
	Cfg     config.Config
	Log     *zap.Logger
}

type googleSignInRequest struct {
	// Credential is the raw ID token JWT Google's SDK hands back on the
	// frontend after the user completes the popup — NOT an access token,
	// NOT an authorization code. It's what idtoken.Validate verifies below.
	Credential string `json:"credential" binding:"required"`
}

// SignIn verifies a Google ID token and logs the user in, provisioning a
// new client account on first sign-in — the same "prove you own this
// email, we'll find-or-create the account" contract as email OTP (see
// services.OnboardingService.FindOrCreateByVerifiedEmail), just proved by
// Google instead of a code we emailed. One endpoint serves both signup and
// login for the same reason OTP does: from the caller's side they're the
// same fact.
func (h *GoogleAuthHandler) SignIn(c *gin.Context) {
	if h.Cfg.GoogleClientID == "" {
		h.Log.Error("google sign-in attempted but GOOGLE_CLIENT_ID is not configured")
		c.JSON(http.StatusServiceUnavailable, gin.H{"error": "Google sign-in is not available right now"})
		return
	}

	var req googleSignInRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// idtoken.Validate does the actual cryptographic work: fetches
	// Google's current public signing keys, verifies the JWT's RS256
	// signature against them, and checks `iss` (issuer is accounts.google.com
	// or https://accounts.google.com) and `exp` (not expired) itself. We
	// pass our own Client ID as the expected `aud` claim — without this,
	// a token minted for a *different* Google OAuth app would still pass
	// signature verification (Google signed it, just not for us) and let
	// an attacker log into this app using a token meant for some other
	// site entirely.
	payload, err := idtoken.Validate(c.Request.Context(), req.Credential, h.Cfg.GoogleClientID)
	if err != nil {
		// Deliberately generic — the real reason (expired, wrong
		// audience, bad signature, malformed) is logged, not handed to
		// the client, which would help someone probe the verification
		// logic.
		h.Log.Info("google id token failed verification", zap.Error(err))
		c.JSON(http.StatusUnauthorized, gin.H{"error": "could not verify Google sign-in"})
		return
	}

	email, _ := payload.Claims["email"].(string)
	emailVerified, _ := payload.Claims["email_verified"].(bool)

	// Google issues ID tokens for accounts that haven't confirmed their
	// email (e.g. a freshly-created Workspace account pending admin
	// verification). email_verified=false there is Google's own signal
	// not to trust the address — checked explicitly rather than assuming
	// "token verified" implies "email verified"; they're different claims.
	if email == "" || !emailVerified {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Google account email is not verified"})
		return
	}

	user, err := h.Service.FindOrCreateByVerifiedEmail(c.Request.Context(), email)
	if err != nil {
		if errors.Is(err, services.ErrUserInactive) {
			c.JSON(http.StatusForbidden, gin.H{"error": "this account has been deactivated"})
			return
		}
		h.Log.Error("google sign-in: find-or-create user failed", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not sign you in"})
		return
	}

	token, err := auth.GenerateToken(h.Cfg.JWTSecret, user.ID, user.Role, user.SessionVersion, h.Cfg.JWTTTL)
	if err != nil {
		h.Log.Error("failed to issue token after google sign-in", zap.Error(err), zap.Uint("userId", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not issue token"})
		return
	}

	// Same cookie, same helper, same session shape as password login and
	// OTP login — see setAuthCookie's doc comment in auth_handler.go.
	setAuthCookie(c, h.Cfg, token)
	c.JSON(http.StatusOK, authResponse{User: toPublic(*user)})
}
