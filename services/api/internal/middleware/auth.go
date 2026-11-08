package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/auth"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"gorm.io/gorm"
)

const (
	ctxUserID = "userID"
	ctxRole   = "role"

	// CookieName is the httpOnly cookie carrying the JWT. Not readable from
	// JS by design — see auth_handler.go's setAuthCookie/clearAuthCookie,
	// the only two places that should ever touch this cookie directly.
	CookieName = "token"
)

// RequireAuth validates the JWT from the httpOnly auth cookie, then checks
// IsActive fresh from the DB on every request — a deactivated employee's
// existing session stops working immediately, not just at their next
// login. This is deliberately not JWT-embedded state (same reasoning as
// permission flags — see permission.go): revocation needs to be instant,
// not "eventually, once the old token expires."
func RequireAuth(db *gorm.DB, jwtSecret string) gin.HandlerFunc {
	return func(c *gin.Context) {
		tokenString, err := c.Cookie(CookieName)
		if err != nil || tokenString == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "not signed in"})
			return
		}

		claims, err := auth.ParseToken(jwtSecret, tokenString)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "invalid or expired session"})
			return
		}

		var user models.User
		if err := db.Select("is_active", "session_version").First(&user, claims.UserID).Error; err != nil || !user.IsActive {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "account is deactivated"})
			return
		}
		// The user has logged out since this token was issued (Logout bumps
		// session_version), so the token is dead even though it's unexpired.
		if claims.SessionVersion != user.SessionVersion {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "session has ended — please sign in again"})
			return
		}

		c.Set(ctxUserID, claims.UserID)
		c.Set(ctxRole, claims.Role)
		c.Next()
	}
}
