package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

type ProductHandler struct {
	DB  *gorm.DB
	Log *zap.Logger
}

type productRequest struct {
	Name            string `json:"name" binding:"required"`
	Category        string `json:"category" binding:"required"`
	Description     string `json:"description"`
	ViscosityGrade  string `json:"viscosityGrade"`
	ApplicationArea string `json:"applicationArea"`
}

// List is public — the marketing site's recommendation wizard reads the
// live catalog without needing a session.
func (h *ProductHandler) List(c *gin.Context) {
	var products []models.Product
	query := h.DB.Order("category, name")
	if c.Query("category") != "" {
		query = query.Where("category = ?", c.Query("category"))
	}
	if c.Query("includeInactive") != "true" {
		query = query.Where("is_active = ?", true)
	}
	if err := query.Find(&products).Error; err != nil {
		h.Log.Error("failed to list products", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list products"})
		return
	}
	c.JSON(http.StatusOK, products)
}

func (h *ProductHandler) Get(c *gin.Context) {
	product, err := h.findByParam(c)
	if err != nil {
		return
	}
	c.JSON(http.StatusOK, product)
}

func (h *ProductHandler) Create(c *gin.Context) {
	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product := models.Product{
		Name:            req.Name,
		Category:        req.Category,
		Description:     req.Description,
		ViscosityGrade:  req.ViscosityGrade,
		ApplicationArea: req.ApplicationArea,
		IsActive:        true,
	}
	if err := h.DB.Create(&product).Error; err != nil {
		h.Log.Error("failed to create product", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create product"})
		return
	}
	c.JSON(http.StatusCreated, product)
}

func (h *ProductHandler) Update(c *gin.Context) {
	product, err := h.findByParam(c)
	if err != nil {
		return
	}

	var req productRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	product.Name = req.Name
	product.Category = req.Category
	product.Description = req.Description
	product.ViscosityGrade = req.ViscosityGrade
	product.ApplicationArea = req.ApplicationArea

	if err := h.DB.Save(product).Error; err != nil {
		h.Log.Error("failed to update product", zap.Error(err), zap.Uint("productId", product.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update product"})
		return
	}
	c.JSON(http.StatusOK, product)
}

// Delete soft-deletes (gorm.Model DeletedAt) and flips IsActive off so it
// drops out of catalog listings immediately, independent of the delete hook.
func (h *ProductHandler) Delete(c *gin.Context) {
	product, err := h.findByParam(c)
	if err != nil {
		return
	}
	product.IsActive = false
	h.DB.Save(product)

	if err := h.DB.Delete(product).Error; err != nil {
		h.Log.Error("failed to delete product", zap.Error(err), zap.Uint("productId", product.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete product"})
		return
	}
	c.Status(http.StatusNoContent)
}

func (h *ProductHandler) findByParam(c *gin.Context) (*models.Product, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid product id"})
		return nil, err
	}

	var product models.Product
	if err := h.DB.First(&product, uint(id)).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "product not found"})
		} else {
			h.Log.Error("failed to load product", zap.Error(err), zap.Uint64("productId", id))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load product"})
		}
		return nil, err
	}
	return &product, nil
}
