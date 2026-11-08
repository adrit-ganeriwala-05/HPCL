package handlers

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/middleware"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// errInvalidPhoneMsg is the one wording used everywhere a user-account
// phone number is rejected (profile, staff client edit, registration).
const errInvalidPhoneMsg = "enter a valid phone number (7–15 digits; +, -, spaces and brackets allowed)"

// normalizeOptionalPhone trims an account phone number and checks it with
// the same rule as the public contact form (phoneRe in lead_handler.go).
// Empty is allowed — the field is optional — and returns ("", true).
func normalizeOptionalPhone(raw string) (string, bool) {
	phone := strings.TrimSpace(raw)
	if phone != "" && !phoneRe.MatchString(phone) {
		return "", false
	}
	return phone, true
}

type ProfileHandler struct {
	DB  *gorm.DB
	Log *zap.Logger
}

type updateProfileRequest struct {
	Name          string `json:"name" binding:"required"`
	ContactPerson string `json:"contactPerson"`
	CompanyName   string `json:"companyName"`
	Phone         string `json:"phone"` // optional; empty clears it
}

// UpdateProfile fills in the fields an OTP-onboarded account starts
// without — VerifyEmailOTP creates a user record with Name defaulted to
// their email address (see OnboardingService.VerifyEmailOTP) purely so
// every other part of the schema that assumes a non-empty Name keeps
// working; this is the endpoint that replaces it with real information.
func (h *ProfileHandler) UpdateProfile(c *gin.Context) {
	var req updateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	phone, ok := normalizeOptionalPhone(req.Phone)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidPhoneMsg})
		return
	}

	var user models.User
	if err := h.DB.First(&user, middleware.CurrentUserID(c)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "user not found"})
		return
	}

	user.Name = req.Name
	user.ContactPerson = req.ContactPerson
	user.CompanyName = req.CompanyName
	user.Phone = phone

	if err := h.DB.Save(&user).Error; err != nil {
		h.Log.Error("failed to update profile", zap.Error(err), zap.Uint("userId", user.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update profile"})
		return
	}
	c.JSON(http.StatusOK, toPublic(user))
}
