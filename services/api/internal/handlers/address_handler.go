package handlers

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/middleware"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"github.com/jpganeriwala-hpcl/services/api/internal/repository"
	"go.uber.org/zap"
)

type AddressHandler struct {
	Addresses repository.AddressRepository
	Log       *zap.Logger
}

type addressRequest struct {
	Label     string `json:"label" binding:"required"`
	Line1     string `json:"line1" binding:"required"`
	Line2     string `json:"line2"`
	City      string `json:"city" binding:"required"`
	State     string `json:"state" binding:"required"`
	Pincode   string `json:"pincode" binding:"required"`
	IsDefault bool   `json:"isDefault"`
}

func (h *AddressHandler) List(c *gin.Context) {
	addrs, err := h.Addresses.ListByUser(c.Request.Context(), middleware.CurrentUserID(c))
	if err != nil {
		h.Log.Error("failed to list addresses", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list addresses"})
		return
	}
	c.JSON(http.StatusOK, addrs)
}

func (h *AddressHandler) Create(c *gin.Context) {
	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	userID := middleware.CurrentUserID(c)
	addr := &models.Address{
		UserID:    userID,
		Label:     req.Label,
		Line1:     req.Line1,
		Line2:     req.Line2,
		City:      req.City,
		State:     req.State,
		Pincode:   req.Pincode,
		IsDefault: req.IsDefault,
	}

	if err := h.Addresses.Create(c.Request.Context(), addr); err != nil {
		h.Log.Error("failed to create address", zap.Error(err), zap.Uint("userId", userID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save address"})
		return
	}

	if addr.IsDefault {
		if err := h.Addresses.ClearDefaultForUser(c.Request.Context(), userID, addr.ID); err != nil {
			h.Log.Error("failed to clear previous default address", zap.Error(err), zap.Uint("userId", userID))
		}
	}

	c.JSON(http.StatusCreated, addr)
}

func (h *AddressHandler) Update(c *gin.Context) {
	addr, err := h.findOwned(c)
	if err != nil {
		return
	}

	var req addressRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	addr.Label = req.Label
	addr.Line1 = req.Line1
	addr.Line2 = req.Line2
	addr.City = req.City
	addr.State = req.State
	addr.Pincode = req.Pincode
	addr.IsDefault = req.IsDefault

	if err := h.Addresses.Update(c.Request.Context(), addr); err != nil {
		h.Log.Error("failed to update address", zap.Error(err), zap.Uint("addressId", addr.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update address"})
		return
	}

	if addr.IsDefault {
		if err := h.Addresses.ClearDefaultForUser(c.Request.Context(), addr.UserID, addr.ID); err != nil {
			h.Log.Error("failed to clear previous default address", zap.Error(err), zap.Uint("userId", addr.UserID))
		}
	}

	c.JSON(http.StatusOK, addr)
}

func (h *AddressHandler) Delete(c *gin.Context) {
	addr, err := h.findOwned(c)
	if err != nil {
		return
	}
	if err := h.Addresses.Delete(c.Request.Context(), addr); err != nil {
		h.Log.Error("failed to delete address", zap.Error(err), zap.Uint("addressId", addr.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not delete address"})
		return
	}
	c.Status(http.StatusNoContent)
}

// findOwned loads :id and enforces it belongs to the caller — a client can
// never read, edit, or delete another client's address, full stop. Writes
// the HTTP response itself on failure so callers just need to bail on error.
func (h *AddressHandler) findOwned(c *gin.Context) (*models.Address, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid address id"})
		return nil, err
	}

	addr, err := h.Addresses.FindByIDAndUser(c.Request.Context(), uint(id), middleware.CurrentUserID(c))
	if errors.Is(err, repository.ErrNotFound) {
		c.JSON(http.StatusNotFound, gin.H{"error": "address not found"})
		return nil, err
	}
	if err != nil {
		h.Log.Error("failed to load address", zap.Error(err), zap.Uint64("addressId", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load address"})
		return nil, err
	}
	return addr, nil
}
