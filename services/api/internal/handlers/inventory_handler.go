package handlers

import (
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/jpganeriwala-hpcl/services/api/internal/middleware"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type InventoryHandler struct {
	DB  *gorm.DB
	Log *zap.Logger
}

// Dashboard returns the current stock holding for every (grade, pack size)
// combination that has ever had a transaction — the live warehouse balance.
func (h *InventoryHandler) Dashboard(c *gin.Context) {
	var stock []models.InventoryStock
	if err := h.DB.Preload("Product").Order("product_id, size_in_liters").Find(&stock).Error; err != nil {
		h.Log.Error("failed to load inventory dashboard", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load inventory"})
		return
	}
	c.JSON(http.StatusOK, stock)
}

type inwardEntryRequest struct {
	ClientTxnID   uuid.UUID `json:"clientTxnId" binding:"required"`
	ProductID     uint      `json:"productId" binding:"required"`
	SizeInLiters  float64   `json:"sizeInLiters" binding:"required,gt=0"`
	QuantityUnits int       `json:"quantityUnits" binding:"required,gt=0"`
	EntryDate     string    `json:"entryDate" binding:"required"` // "2026-07-26"
}

type syncInwardRequest struct {
	Entries []inwardEntryRequest `json:"entries" binding:"required,min=1,dive"`
}

type syncResult struct {
	ClientTxnID uuid.UUID `json:"clientTxnId"`
	Status      string    `json:"status"` // "ok" | "error"
	Error       string    `json:"error,omitempty"`
}

// SyncInward is the one write path for stock inward — used for both a
// normal online entry (a single-item batch) and flushing an offline-queued
// batch once connectivity returns. Every entry carries a client-generated
// ClientTxnID; the unique constraint on that column makes replaying an
// already-applied entry (a retried request, a delayed sync) a no-op instead
// of double-counting stock. entered_by is always the authenticated caller,
// never client-supplied — that's the accountability guarantee, and it can't
// be forged by an offline entry queued under someone else's session because
// there is no "who entered this" field in the request at all.
func (h *InventoryHandler) SyncInward(c *gin.Context) {
	userID := middleware.CurrentUserID(c)

	var req syncInwardRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	results := make([]syncResult, 0, len(req.Entries))

	for _, e := range req.Entries {
		entryDate, err := time.Parse("2006-01-02", e.EntryDate)
		if err != nil {
			results = append(results, syncResult{ClientTxnID: e.ClientTxnID, Status: "error", Error: "entryDate must be YYYY-MM-DD"})
			continue
		}

		txnErr := h.DB.Transaction(func(tx *gorm.DB) error {
			txn := models.InventoryTransaction{
				ProductID:     e.ProductID,
				SizeInLiters:  e.SizeInLiters,
				TxnType:       models.InventoryTxnInward,
				QuantityUnits: e.QuantityUnits,
				EntryDate:     entryDate,
				EnteredByID:   userID,
				ClientTxnID:   e.ClientTxnID,
			}

			res := tx.Clauses(clause.OnConflict{
				Columns:   []clause.Column{{Name: "client_txn_id"}},
				DoNothing: true,
			}).Create(&txn)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return nil // already synced by an earlier attempt — not an error, just nothing new to apply
			}

			return tx.Exec(`
				INSERT INTO inventory_stocks (product_id, size_in_liters, quantity_units, updated_at)
				VALUES (?, ?, ?, now())
				ON CONFLICT (product_id, size_in_liters)
				DO UPDATE SET quantity_units = inventory_stocks.quantity_units + EXCLUDED.quantity_units,
				              updated_at = now()
			`, e.ProductID, e.SizeInLiters, e.QuantityUnits).Error
		})

		if txnErr != nil {
			h.Log.Error("inward sync entry failed", zap.String("clientTxnId", e.ClientTxnID.String()), zap.Error(txnErr))
			results = append(results, syncResult{ClientTxnID: e.ClientTxnID, Status: "error", Error: "could not save this entry"})
			continue
		}
		results = append(results, syncResult{ClientTxnID: e.ClientTxnID, Status: "ok"})
	}

	c.JSON(http.StatusOK, gin.H{"results": results})
}

// ListTransactions is the audit log — admin-only (see routes.go). Every
// inward and outward movement, oldest-hidden-first, who entered it and
// which order (if any) an outward row belongs to.
func (h *InventoryHandler) ListTransactions(c *gin.Context) {
	query := h.DB.Preload("Product").Preload("EnteredBy").Order("created_at desc").Limit(500)
	if productID := c.Query("productId"); productID != "" {
		query = query.Where("product_id = ?", productID)
	}

	var transactions []models.InventoryTransaction
	if err := query.Find(&transactions).Error; err != nil {
		h.Log.Error("failed to list inventory transactions", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list transactions"})
		return
	}
	c.JSON(http.StatusOK, transactions)
}

type updateTransactionRequest struct {
	QuantityUnits int    `json:"quantityUnits" binding:"required,gt=0"`
	EntryDate     string `json:"entryDate" binding:"required"`
}

// UpdateTransaction is the one and only way an existing ledger row can
// change, and it's admin-only end to end (see routes.go — mirrors the exact
// same RequireRole(RoleAdmin) gate every other admin-only mutation in this
// codebase uses, nothing new invented here). Staff who entered a row can
// never edit or delete it once submitted, per the access-control brief.
//
// Correcting a quantity re-applies just the delta to inventory_stocks
// (not the full new value) in the same transaction as the ledger row
// update, so the running balance never drifts out of sync with the ledger
// it's derived from — and the guard rejects a correction that would push
// the balance negative (e.g. shrinking an inward entry after some of that
// stock has already been dispatched out).
func (h *InventoryHandler) UpdateTransaction(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid transaction id"})
		return
	}

	var req updateTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	entryDate, err := time.Parse("2006-01-02", req.EntryDate)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "entryDate must be YYYY-MM-DD"})
		return
	}

	err = h.DB.Transaction(func(tx *gorm.DB) error {
		var txn models.InventoryTransaction
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).First(&txn, uint(id)).Error; err != nil {
			return err
		}

		delta := req.QuantityUnits - txn.QuantityUnits
		// Inward growing stock: +delta. Outward growing (a bigger dispatched
		// quantity) shrinks stock further, so the sign flips for outward rows.
		stockDelta := delta
		if txn.TxnType == models.InventoryTxnOutward {
			stockDelta = -delta
		}

		res := tx.Exec(`
			UPDATE inventory_stocks
			SET quantity_units = quantity_units + ?, updated_at = now()
			WHERE product_id = ? AND size_in_liters = ? AND quantity_units + ? >= 0
		`, stockDelta, txn.ProductID, txn.SizeInLiters, stockDelta)
		if res.Error != nil {
			return res.Error
		}
		if res.RowsAffected == 0 {
			return errNegativeStock
		}

		txn.QuantityUnits = req.QuantityUnits
		txn.EntryDate = entryDate
		return tx.Save(&txn).Error
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "transaction not found"})
			return
		}
		if errors.Is(err, errNegativeStock) {
			c.JSON(http.StatusConflict, gin.H{"error": "that correction would drive stock below zero"})
			return
		}
		h.Log.Error("failed to update inventory transaction", zap.Error(err), zap.Uint64("transactionId", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update transaction"})
		return
	}

	var txn models.InventoryTransaction
	h.DB.Preload("Product").Preload("EnteredBy").First(&txn, uint(id))
	c.JSON(http.StatusOK, txn)
}

var errNegativeStock = errors.New("correction would drive stock negative")
