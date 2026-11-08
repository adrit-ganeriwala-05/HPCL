package handlers

import (
	"net/http"
	"regexp"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type LeadHandler struct {
	DB  *gorm.DB
	Log *zap.Logger
}

var phoneRe = regexp.MustCompile(`^[0-9+\-\s()]{7,15}$`)
var emailRe = regexp.MustCompile(`^[^\s@]+@[^\s@]+\.[^\s@]+$`)

var validEnquiryTypes = map[string]bool{
	"dealer":      true,
	"order-stock": true,
	"institution": true,
	"general":     true,
}

type leadRequest struct {
	Name            string `json:"name" binding:"required"`
	Company         string `json:"company"`
	CompanyAddress  string `json:"companyAddress"`
	Phone           string `json:"phone" binding:"required"`
	Email           string `json:"email"`
	Location        string `json:"location"`
	EnquiryType     string `json:"enquiryType"`
	ProductInterest string `json:"productInterest"`
	Details         string `json:"details"`
}

// Create is public — no auth. Anyone can submit a contact-form enquiry.
func (h *LeadHandler) Create(c *gin.Context) {
	var req leadRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !phoneRe.MatchString(req.Phone) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "a valid phone number is required"})
		return
	}
	if req.Email != "" && !emailRe.MatchString(req.Email) {
		c.JSON(http.StatusBadRequest, gin.H{"error": "enter a valid email address, or leave it blank"})
		return
	}
	if req.EnquiryType == "" || !validEnquiryTypes[req.EnquiryType] {
		req.EnquiryType = "general"
	}

	lead := models.Lead{
		Name:            req.Name,
		Company:         req.Company,
		CompanyAddress:  req.CompanyAddress,
		Phone:           req.Phone,
		Email:           req.Email,
		Location:        req.Location,
		EnquiryType:     req.EnquiryType,
		ProductInterest: req.ProductInterest,
		Details:         req.Details,
	}
	if err := h.DB.Create(&lead).Error; err != nil {
		h.Log.Error("failed to save lead", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save enquiry"})
		return
	}
	c.JSON(http.StatusCreated, gin.H{"message": "Enquiry noted. We'll call you back shortly.", "lead": lead})
}

// List is admin-only — feeds the CRM dashboard's incoming-leads view.
func (h *LeadHandler) List(c *gin.Context) {
	var leads []models.Lead
	if err := h.DB.Order("created_at desc").Find(&leads).Error; err != nil {
		h.Log.Error("failed to list leads", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list leads"})
		return
	}
	c.JSON(http.StatusOK, leads)
}
