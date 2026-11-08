package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
)

// RequireRole must run after RequireAuth. It 403s any caller whose token
// role isn't in the allowed set — e.g. RequireRole(models.RoleAdmin) for
// CRM-only endpoints.
func RequireRole(roles ...models.Role) gin.HandlerFunc {
	allowed := make(map[models.Role]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(c *gin.Context) {
		role, ok := c.Get(ctxRole)
		if !ok || !allowed[role.(models.Role)] {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}

// CurrentUserID reads the authenticated user's ID out of context. Panics if
// called without RequireAuth in the chain first — that's a programmer error,
// not a runtime condition to handle gracefully.
func CurrentUserID(c *gin.Context) uint {
	return c.MustGet(ctxUserID).(uint)
}

func CurrentRole(c *gin.Context) models.Role {
	return c.MustGet(ctxRole).(models.Role)
}
