package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/auth"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// EmployeeHandler is admin-only end to end (wired that way in routes.go) —
// staff accounts and their permissions are the owner's call alone, never
// delegated to another employee.
type EmployeeHandler struct {
	DB  *gorm.DB
	Log *zap.Logger
}

type createEmployeeRequest struct {
	Name                 string `json:"name" binding:"required"`
	Email                string `json:"email" binding:"required,email"`
	Password             string `json:"password" binding:"required,min=8"`
	CanCreateOrders      bool   `json:"canCreateOrders"`
	CanManageOrderStatus bool   `json:"canManageOrderStatus"`
	CanManageProducts    bool   `json:"canManageProducts"`
	CanViewLeads         bool   `json:"canViewLeads"`
	CanManageInventory   bool   `json:"canManageInventory"`
}

type updatePermissionsRequest struct {
	CanCreateOrders      bool `json:"canCreateOrders"`
	CanManageOrderStatus bool `json:"canManageOrderStatus"`
	CanManageProducts    bool `json:"canManageProducts"`
	CanViewLeads         bool `json:"canViewLeads"`
	CanManageInventory   bool `json:"canManageInventory"`
}

type setActiveRequest struct {
	IsActive bool `json:"isActive"`
}

func (h *EmployeeHandler) Create(c *gin.Context) {
	var req createEmployeeRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not process password"})
		return
	}

	employee := models.User{
		Name:                 req.Name,
		Email:                req.Email,
		PasswordHash:         hash,
		Role:                 models.RoleEmployee,
		CanCreateOrders:      req.CanCreateOrders,
		CanManageOrderStatus: req.CanManageOrderStatus,
		CanManageProducts:    req.CanManageProducts,
		CanViewLeads:         req.CanViewLeads,
		CanManageInventory:   req.CanManageInventory,
	}

	if err := h.DB.Create(&employee).Error; err != nil {
		if isUniqueViolation(err) {
			c.JSON(http.StatusConflict, gin.H{"error": "an account with that email already exists"})
			return
		}
		h.Log.Error("failed to create employee", zap.Error(err), zap.String("email", req.Email))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create employee"})
		return
	}

	c.JSON(http.StatusCreated, employee)
}

func (h *EmployeeHandler) List(c *gin.Context) {
	var employees []models.User
	if err := h.DB.Where("role = ?", models.RoleEmployee).Order("name").Find(&employees).Error; err != nil {
		h.Log.Error("failed to list employees", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list employees"})
		return
	}
	c.JSON(http.StatusOK, employees)
}

func (h *EmployeeHandler) UpdatePermissions(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid employee id"})
		return
	}

	var req updatePermissionsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var employee models.User
	if err := h.DB.Where("role = ?", models.RoleEmployee).First(&employee, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		return
	}

	employee.CanCreateOrders = req.CanCreateOrders
	employee.CanManageOrderStatus = req.CanManageOrderStatus
	employee.CanManageProducts = req.CanManageProducts
	employee.CanViewLeads = req.CanViewLeads
	employee.CanManageInventory = req.CanManageInventory

	if err := h.DB.Save(&employee).Error; err != nil {
		h.Log.Error("failed to update employee permissions", zap.Error(err), zap.Uint("employeeId", employee.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update permissions"})
		return
	}
	c.JSON(http.StatusOK, employee)
}

// SetActive is "remove employee" (IsActive=false) and its undo
// (IsActive=true) — a deactivated employee can't log in, and RequireAuth
// kills their existing session on their very next request, not just their
// next login attempt.
func (h *EmployeeHandler) SetActive(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid employee id"})
		return
	}

	var req setActiveRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var employee models.User
	if err := h.DB.Where("role = ?", models.RoleEmployee).First(&employee, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "employee not found"})
		return
	}

	employee.IsActive = req.IsActive
	if err := h.DB.Save(&employee).Error; err != nil {
		h.Log.Error("failed to update employee status", zap.Error(err), zap.Uint("employeeId", employee.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update employee status"})
		return
	}
	c.JSON(http.StatusOK, employee)
}
