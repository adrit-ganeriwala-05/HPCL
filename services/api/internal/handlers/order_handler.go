package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"sort"
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

// errPendingApproval signals UpdateStatus's transaction that the order is
// still awaiting admin approval — distinct from gorm.ErrRecordNotFound so
// the HTTP layer can tell "no such order" (404) apart from "found it, but
// it's not eligible for this transition yet" (409).
var errPendingApproval = errors.New("order is pending approval")

// errInvalidTransition signals UpdateStatus's transaction that the requested
// status isn't a legal next step from the order's current status (409).
var errInvalidTransition = errors.New("invalid status transition")

// errInsufficientStock signals that a dispatch was refused because a line
// item's (product, size) balance is too low — an expected business outcome
// (409), not a server fault, so it must not be logged as an error.
var errInsufficientStock = errors.New("insufficient stock")

type OrderHandler struct {
	DB  *gorm.DB
	Log *zap.Logger
}

type orderItemRequest struct {
	ProductID    uint    `json:"productId" binding:"required"`
	SizeInLiters float64 `json:"sizeInLiters" binding:"required,gt=0"`
	Quantity     int     `json:"quantity" binding:"required,min=1"`
	Rate         float64 `json:"rate" binding:"gte=0"`
}

type createOrderRequest struct {
	ClientID uint               `json:"clientId"` // required for admin/employee on-behalf orders; ignored for client self-service
	Items    []orderItemRequest `json:"items" binding:"required,min=1,dive"`
}

type updateStatusRequest struct {
	Status models.OrderStatus `json:"status" binding:"required"`
}

type addNoteRequest struct {
	Text string `json:"text" binding:"required"`
}

var validStatuses = map[models.OrderStatus]bool{
	models.OrderStatusNew:        true,
	models.OrderStatusQuoteSent:  true,
	models.OrderStatusDispatched: true,
	models.OrderStatusDelivered:  true,
}

// allowedTransitions lists every status change UpdateStatus accepts. Only
// forward moves: going backwards (or out of Delivered) would let an order
// re-enter Dispatched and deduct stock a second time. Pending Approval has
// no entry — it's only ever exited through Approve. The admin UI mirrors
// this map in client/src/lib/orderStatus.js (STATUS_TRANSITIONS).
var allowedTransitions = map[string]map[string]bool{
	string(models.OrderStatusNew):        {string(models.OrderStatusQuoteSent): true, string(models.OrderStatusDispatched): true},
	string(models.OrderStatusQuoteSent):  {string(models.OrderStatusDispatched): true},
	string(models.OrderStatusDispatched): {string(models.OrderStatusDelivered): true},
}

// isAllowedTransition reports whether an order may move from one status to
// another via UpdateStatus. Same-status is not a transition (returns false);
// UpdateStatus treats it as a no-op before calling this.
func isAllowedTransition(from, to string) bool {
	return allowedTransitions[from][to]
}

const preloadForResponse = "Items.Product"

// redactNotes blanks InternalNotes for clients — it's CRM-internal (pricing
// negotiation, staff remarks about the client) and a customer viewing their
// own order must never see it. Staff (employee/admin) always see it.
func redactNotes(c *gin.Context, order *models.Order) *models.Order {
	if middleware.CurrentRole(c) == models.RoleClient {
		order.InternalNotes = ""
	}
	return order
}

func redactNotesSlice(c *gin.Context, orders []models.Order) []models.Order {
	if middleware.CurrentRole(c) == models.RoleClient {
		for i := range orders {
			orders[i].InternalNotes = ""
		}
	}
	return orders
}

// Create places a new order. A client places it for themself, status New.
// An admin or an employee with CanCreateOrders places it on behalf of a
// given clientId — status starts at Pending Approval for employees (an
// admin still has to approve it before it enters the normal pipeline),
// but New immediately for admin-created orders (the owner's own authority
// doesn't need the owner's own approval).
func (h *OrderHandler) Create(c *gin.Context) {
	var req createOrderRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	callerID := middleware.CurrentUserID(c)
	role := middleware.CurrentRole(c)

	var clientID uint
	var initialStatus models.OrderStatus

	switch role {
	case models.RoleClient:
		clientID = callerID
		initialStatus = models.OrderStatusNew

	case models.RoleAdmin:
		if req.ClientID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "clientId is required"})
			return
		}
		clientID = req.ClientID
		initialStatus = models.OrderStatusNew

	case models.RoleEmployee:
		var employee models.User
		if err := h.DB.First(&employee, callerID).Error; err != nil || !employee.CanCreateOrders {
			c.JSON(http.StatusForbidden, gin.H{"error": "you don't have permission to create orders"})
			return
		}
		if req.ClientID == 0 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "clientId is required"})
			return
		}
		clientID = req.ClientID
		initialStatus = models.OrderStatusPendingApproval

	default:
		c.JSON(http.StatusForbidden, gin.H{"error": "insufficient permissions"})
		return
	}

	if role != models.RoleClient {
		var client models.User
		if err := h.DB.First(&client, clientID).Error; err != nil || client.Role != models.RoleClient {
			c.JSON(http.StatusBadRequest, gin.H{"error": "clientId does not refer to a client account"})
			return
		}
	}

	order, err := h.buildOrder(clientID, callerID, initialStatus, role, req.Items)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	if err := h.DB.Create(order).Error; err != nil {
		h.Log.Error("failed to create order", zap.Error(err), zap.Uint("clientId", clientID), zap.Uint("createdById", callerID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create order"})
		return
	}

	h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").First(order, order.ID)
	c.JSON(http.StatusCreated, redactNotes(c, order))
}

// buildOrder validates that every referenced product exists and is active,
// then assembles (but does not save) the Order + OrderItems.
//
// Rate is only ever taken from the request for staff (admin/employee) —
// pricing a bulk industrial-lubricant order is a quoted, negotiated number,
// never something a client sets themselves. A client-submitted rate is
// silently zeroed here rather than trusted; staff fill in the real number
// at the Quote Sent stage. Without this, any authenticated client could
// submit an arbitrary low rate and have it become the order's TotalAmount
// verbatim — this function is the one place that must never skip that
// check, so the role check lives here, not scattered across call sites.
func (h *OrderHandler) buildOrder(clientID, createdByID uint, status models.OrderStatus, role models.Role, items []orderItemRequest) (*models.Order, error) {
	order := &models.Order{ClientID: clientID, CreatedByID: createdByID, Status: status}

	ids := make([]uint, len(items))
	for i, item := range items {
		ids[i] = item.ProductID
	}

	var products []models.Product
	if err := h.DB.Where("id IN ?", ids).Find(&products).Error; err != nil {
		h.Log.Error("failed to load products for order", zap.Error(err))
		return nil, fmt.Errorf("could not validate order items")
	}
	productByID := make(map[uint]models.Product, len(products))
	for _, p := range products {
		productByID[p.ID] = p
	}

	var totalVolume, totalAmount float64
	for _, item := range items {
		product, ok := productByID[item.ProductID]
		if !ok {
			return nil, fmt.Errorf("product %d not found", item.ProductID)
		}
		if !product.IsActive {
			return nil, fmt.Errorf("product %d is not currently available", item.ProductID)
		}

		rate := item.Rate
		if role == models.RoleClient {
			rate = 0
		}

		order.Items = append(order.Items, models.OrderItem{ProductID: item.ProductID, SizeInLiters: item.SizeInLiters, Quantity: item.Quantity, Rate: rate})
		totalVolume += float64(item.Quantity)
		totalAmount += rate * float64(item.Quantity)
	}
	order.TotalVolume = totalVolume
	order.TotalAmount = totalAmount

	return order, nil
}

// List returns the caller's own orders for clients, or every order for
// staff (employee/admin) — optionally narrowed with ?status=.
func (h *OrderHandler) List(c *gin.Context) {
	query := h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").Preload("ApprovedBy").Order("created_at desc")

	if middleware.CurrentRole(c) == models.RoleClient {
		query = query.Where("client_id = ?", middleware.CurrentUserID(c))
	}
	if status := c.Query("status"); status != "" {
		query = query.Where("status = ?", status)
	}

	var orders []models.Order
	if err := query.Find(&orders).Error; err != nil {
		h.Log.Error("failed to list orders", zap.Error(err))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not list orders"})
		return
	}
	c.JSON(http.StatusOK, redactNotesSlice(c, orders))
}

func (h *OrderHandler) Get(c *gin.Context) {
	order, err := h.findOwnedOrder(c)
	if err != nil {
		return
	}
	c.JSON(http.StatusOK, redactNotes(c, order))
}

// ConfirmDelivery is the client-side counterpart to staff moving an order
// to Dispatched — the client is the one person who actually knows the
// consignment arrived, so this is the one status transition they can make
// themselves rather than waiting on staff to update it. Route is
// client-only (see routes.go); findOwnedOrder already restricts a client
// to their own orders. Only legal from Dispatched, matching the "for the
// client, only once dispatched" requirement — a client can't jump straight
// from New/Quote Sent to Delivered, and can't re-confirm an already
// Delivered order.
func (h *OrderHandler) ConfirmDelivery(c *gin.Context) {
	order, err := h.findOwnedOrder(c)
	if err != nil {
		return
	}
	if order.Status != models.OrderStatusDispatched {
		c.JSON(http.StatusConflict, gin.H{"error": "delivery can only be confirmed once the order has been dispatched"})
		return
	}

	order.Status = models.OrderStatusDelivered
	if err := h.DB.Save(order).Error; err != nil {
		h.Log.Error("failed to confirm delivery", zap.Error(err), zap.Uint("orderId", order.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not confirm delivery"})
		return
	}
	h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").Preload("ApprovedBy").Preload("DeliveryLogs").First(order, order.ID)
	c.JSON(http.StatusOK, redactNotes(c, order))
}

// UpdateStatus is gated by CanManageOrderStatus (admin always allowed). It
// refuses to move a Pending Approval order — that transition only happens
// through Approve, so an employee with status-change rights still can't
// rubber-stamp their own pending order into the pipeline.
//
// Moving a non-Dispatched order to Dispatched atomically deducts warehouse
// stock for every line item and writes a matching outward
// InventoryTransaction, in the same DB transaction as the status write — if
// any line item is short on stock, the whole update (status included) rolls
// back rather than leaving the order half-dispatched against a partial
// deduction. Only the forward moves in allowedTransitions are accepted
// (409 otherwise), so an order can reach Dispatched at most once and stock
// is deducted at most once. Setting the status the order already has is a
// no-op 200 with no stock change.
func (h *OrderHandler) UpdateStatus(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var req updateStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	if !validStatuses[req.Status] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "unrecognized status"})
		return
	}

	staffID := middleware.CurrentUserID(c)

	err = h.DB.Transaction(func(tx *gorm.DB) error {
		var order models.Order
		if err := tx.Clauses(clause.Locking{Strength: "UPDATE"}).Preload("Items").First(&order, uint(id)).Error; err != nil {
			return err
		}
		if order.Status == models.OrderStatusPendingApproval {
			return errPendingApproval
		}
		// Checked against the row we just locked, so two concurrent requests
		// can't both see the old status and both pass.
		if order.Status == req.Status {
			return nil // nothing to change, and no stock movement
		}
		if !isAllowedTransition(string(order.Status), string(req.Status)) {
			return fmt.Errorf("%w: cannot move an order from %s to %s", errInvalidTransition, order.Status, req.Status)
		}

		dispatching := req.Status == models.OrderStatusDispatched && order.Status != models.OrderStatusDispatched
		order.Status = req.Status
		if err := tx.Save(&order).Error; err != nil {
			return err
		}

		if !dispatching {
			return nil
		}

		// Fixed lock order (by ProductID, SizeInLiters) across every line —
		// avoids deadlocks when two orders being dispatched concurrently
		// share a grade/size.
		items := append([]models.OrderItem(nil), order.Items...)
		sort.Slice(items, func(i, j int) bool {
			if items[i].ProductID != items[j].ProductID {
				return items[i].ProductID < items[j].ProductID
			}
			return items[i].SizeInLiters < items[j].SizeInLiters
		})

		for _, item := range items {
			// Guarded UPDATE, not SELECT-then-UPDATE: the WHERE clause
			// re-checks quantity_units at the exact moment of the write, so
			// two staff dispatching overlapping orders concurrently can't
			// both succeed against the same insufficient balance.
			res := tx.Exec(`
				UPDATE inventory_stocks
				SET quantity_units = quantity_units - ?, updated_at = now()
				WHERE product_id = ? AND size_in_liters = ? AND quantity_units >= ?
			`, item.Quantity, item.ProductID, item.SizeInLiters, item.Quantity)
			if res.Error != nil {
				return res.Error
			}
			if res.RowsAffected == 0 {
				return fmt.Errorf("%w for product %d @ %.0fL (need %d)", errInsufficientStock, item.ProductID, item.SizeInLiters, item.Quantity)
			}

			if err := tx.Create(&models.InventoryTransaction{
				ProductID:     item.ProductID,
				SizeInLiters:  item.SizeInLiters,
				TxnType:       models.InventoryTxnOutward,
				QuantityUnits: item.Quantity,
				EntryDate:     time.Now().UTC(),
				EnteredByID:   staffID,
				OrderID:       &order.ID,
				ClientTxnID:   uuid.New(), // server-originated — no offline client to dedup against
			}).Error; err != nil {
				return err
			}
		}
		return nil
	})

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
			return
		}
		if errors.Is(err, errPendingApproval) {
			c.JSON(http.StatusConflict, gin.H{"error": "order is pending approval — approve it first"})
			return
		}
		if errors.Is(err, errInvalidTransition) {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		if errors.Is(err, errInsufficientStock) {
			// Expected outcome (also how the loser of two concurrent
			// dispatches ends up) — Info, not Error, so log alerting
			// only fires on real faults.
			h.Log.Info("dispatch refused: insufficient stock", zap.Uint64("orderId", id), zap.String("detail", err.Error()))
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
			return
		}
		// Anything left is a genuine server/DB fault: log it, and don't
		// echo raw database errors back to the caller.
		h.Log.Error("failed to update order status", zap.Error(err), zap.Uint64("orderId", id))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not update order status"})
		return
	}

	var order models.Order
	h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").Preload("ApprovedBy").Preload("DeliveryLogs").First(&order, uint(id))
	c.JSON(http.StatusOK, redactNotes(c, &order))
}

// Approve is admin-only, full stop — never delegable to an employee, no
// matter their other permissions. Moves Pending Approval -> New.
func (h *OrderHandler) Approve(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var order models.Order
	if err := h.DB.First(&order, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}
	if order.Status != models.OrderStatusPendingApproval {
		c.JSON(http.StatusConflict, gin.H{"error": "order is not pending approval"})
		return
	}

	adminID := middleware.CurrentUserID(c)
	now := time.Now().UTC()
	order.Status = models.OrderStatusNew
	order.ApprovedByID = &adminID
	order.ApprovedAt = &now

	if err := h.DB.Save(&order).Error; err != nil {
		h.Log.Error("failed to approve order", zap.Error(err), zap.Uint("orderId", order.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not approve order"})
		return
	}
	h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").Preload("ApprovedBy").First(&order, order.ID)
	c.JSON(http.StatusOK, &order)
}

// AddNote is gated by CanManageOrderStatus (admin always allowed) — bundled
// with status-management duties rather than its own permission flag.
// InternalNotes is a flat text column (Phase 1 schema), so each note is
// appended as a timestamped line rather than stored as a separate row.
func (h *OrderHandler) AddNote(c *gin.Context) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return
	}

	var req addNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	var order models.Order
	if err := h.DB.First(&order, uint(id)).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return
	}

	role := middleware.CurrentRole(c)
	line := fmt.Sprintf("[%s] %s#%d: %s", time.Now().UTC().Format(time.RFC3339), role, middleware.CurrentUserID(c), req.Text)
	if order.InternalNotes != "" {
		order.InternalNotes += "\n" + line
	} else {
		order.InternalNotes = line
	}

	if err := h.DB.Save(&order).Error; err != nil {
		h.Log.Error("failed to save order note", zap.Error(err), zap.Uint("orderId", order.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not save note"})
		return
	}
	h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").Preload("ApprovedBy").Preload("DeliveryLogs").First(&order, order.ID)
	c.JSON(http.StatusOK, redactNotes(c, &order))
}

// Reorder is the portal's "Quick Re-order": clone another order's line
// items (must be owned by the caller, unless staff) into a brand new order.
// Client-initiated reorders start at New like any self-service order.
func (h *OrderHandler) Reorder(c *gin.Context) {
	source, err := h.findOwnedOrder(c)
	if err != nil {
		return
	}

	// Carries over the requested rate from the source order — buildOrder
	// still zeroes it out for a client caller (see buildOrder's doc comment),
	// same as a fresh Create would. A reorder needs re-quoting through Quote
	// Sent just like any other client order; it never reuses a stale
	// client-visible rate without staff re-confirming it.
	role := middleware.CurrentRole(c)
	items := make([]orderItemRequest, len(source.Items))
	for i, item := range source.Items {
		items[i] = orderItemRequest{ProductID: item.ProductID, SizeInLiters: item.SizeInLiters, Quantity: item.Quantity, Rate: item.Rate}
	}

	order, err := h.buildOrder(source.ClientID, middleware.CurrentUserID(c), models.OrderStatusNew, role, items)
	if err != nil {
		c.JSON(http.StatusConflict, gin.H{"error": "one or more products from that order are no longer available: " + err.Error()})
		return
	}

	if err := h.DB.Create(order).Error; err != nil {
		h.Log.Error("failed to create reorder", zap.Error(err), zap.Uint("sourceOrderId", source.ID))
		c.JSON(http.StatusInternalServerError, gin.H{"error": "could not create reorder"})
		return
	}

	h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").First(order, order.ID)
	c.JSON(http.StatusCreated, redactNotes(c, order))
}

// findOwnedOrder loads an order by :id and enforces that clients can only
// touch their own orders; staff (employee/admin) can touch any. Writes the
// HTTP response itself on failure so callers just need to bail on error.
func (h *OrderHandler) findOwnedOrder(c *gin.Context) (*models.Order, error) {
	id, err := strconv.ParseUint(c.Param("id"), 10, 64)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid order id"})
		return nil, err
	}

	var order models.Order
	err = h.DB.Preload(preloadForResponse).Preload("Client").Preload("CreatedBy").Preload("ApprovedBy").Preload("DeliveryLogs").First(&order, uint(id)).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		} else {
			h.Log.Error("failed to load order", zap.Error(err), zap.Uint64("orderId", id))
			c.JSON(http.StatusInternalServerError, gin.H{"error": "could not load order"})
		}
		return nil, err
	}

	if middleware.CurrentRole(c) == models.RoleClient && order.ClientID != middleware.CurrentUserID(c) {
		c.JSON(http.StatusNotFound, gin.H{"error": "order not found"})
		return nil, gorm.ErrRecordNotFound
	}

	return &order, nil
}
