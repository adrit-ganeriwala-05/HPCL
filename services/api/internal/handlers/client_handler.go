package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// ClientHandler backs the client picker used when an admin/employee places
// an order on a client's behalf, and the staff Clients page. Gated by
// CanCreateOrders (see routes.go), not a general staff-directory endpoint.
type ClientHandler struct {
	DB  *gorm.DB
	Log *zap.Logger
}

func (h *ClientHandler) List(c *gin.Context) {
	var clients []models.User
	if err := h.DB.Where("role = ?", models.RoleClient).Order("name").Find(&clients).Error; err != nil {
		h.Log.Error("failed to list clients", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list clients"})
		return
	}
	c.JSON(http.StatusOK, clients)
}

// updateClientRequest is the contact details staff may correct on a
// client's behalf. Email is deliberately absent: it's the account's login
// identifier (password, OTP and Google sign-in all look accounts up by it),
// so changing it from here could lock the client out.
type updateClientRequest struct {
	Name          string `json:"name" binding:"required"`
	ContactPerson string `json:"contactPerson"`
	CompanyName   string `json:"companyName"`
	Phone         string `json:"phone"` // optional; empty clears it
}

// Update lets staff edit a client's contact details. Only ever touches an
// account whose role is client — an id belonging to staff is a 404, so this
// can't be used to rename an admin or an employee.
func (h *ClientHandler) Update(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid client id"})
		return
	}

	var req updateClientRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	name := strings.TrimSpace(req.Name)
	if name == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "name is required"})
		return
	}
	phone, ok := normalizeOptionalPhone(req.Phone)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": errInvalidPhoneMsg})
		return
	}

	var client models.User
	err = h.DB.Where("id = ? AND role = ?", uint(id), models.RoleClient).First(&client).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "client not found"})
		return
	}
	if err != nil {
		h.Log.Error("failed to load client", zap.Error(err), zap.Uint64("clientId", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load client"})
		return
	}

	client.Name = name
	client.ContactPerson = strings.TrimSpace(req.ContactPerson)
	client.CompanyName = strings.TrimSpace(req.CompanyName)
	client.Phone = phone

	if err := h.DB.Save(&client).Error; err != nil {
		h.Log.Error("failed to update client", zap.Error(err), zap.Uint("clientId", client.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update client"})
		return
	}
	c.JSON(http.StatusOK, client)
}
