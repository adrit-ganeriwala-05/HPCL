package middleware

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"gorm.io/gorm"
)

// RequirePermission 403s clients outright, lets admins through unconditionally,
// and for employees loads the fresh User row and checks the given flag — a
// DB hit per request, but it means revoking an employee's permission takes
// effect on their very next request, not just their next login.
func RequirePermission(db *gorm.DB, check func(models.User) bool) gin.HandlerFunc {
	return func(c *gin.Context) {
		role := CurrentRole(c)
		if role == models.RoleAdmin {
			c.Next()
			return
		}
		if role != models.RoleEmployee {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}

		var user models.User
		if err := db.First(&user, CurrentUserID(c)).Error; err != nil || !check(user) {
			c.AbortWithStatusJSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
			return
		}
		c.Next()
	}
}
