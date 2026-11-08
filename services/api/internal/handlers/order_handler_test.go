package handlers

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func testHandler(t *testing.T) *OrderHandler {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory test db: %v", err)
	}
	if err := db.AutoMigrate(&models.Product{}); err != nil {
		t.Fatalf("failed to migrate test schema: %v", err)
	}
	return &OrderHandler{DB: db, Log: zap.NewNop()}
}

func seedProduct(t *testing.T, db *gorm.DB, isActive bool) models.Product {
	t.Helper()
	p := models.Product{Name: "Test Grade", Category: models.CategoryHydraulic, IsActive: true}
	if err := db.Create(&p).Error; err != nil {
		t.Fatalf("failed to seed product: %v", err)
	}
	// Can't pass IsActive: false to Create above and have it stick — GORM's
	// `gorm:"default:true"` tag treats an explicit `false` the same as "not
	// set" (false is also bool's zero value), so it silently falls back to
	// the column default on insert. A real Update bypasses that: default-tag
	// fallback only applies on Create, not Update.
	if !isActive {
		if err := db.Model(&p).Update("is_active", false).Error; err != nil {
			t.Fatalf("failed to deactivate seeded product: %v", err)
		}
		p.IsActive = false
	}
	return p
}

// This is the regression test for the price-manipulation fix: a client
// submitting their own `rate` must never have it honored. Bulk industrial
// lubricant pricing is quoted by staff, not self-selected by whoever's
// placing the order — see buildOrder's doc comment for the full reasoning.
func TestBuildOrder_ClientCannotSetOwnRate(t *testing.T) {
	h := testHandler(t)
	product := seedProduct(t, h.DB, true)

	items := []orderItemRequest{{ProductID: product.ID, Quantity: 500, Rate: 0.01}}
	order, err := h.buildOrder(1, 1, models.OrderStatusNew, models.RoleClient, items)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if got := order.Items[0].Rate; got != 0 {
		t.Errorf("client-submitted rate was not zeroed: got %v, want 0", got)
	}
	if order.TotalAmount != 0 {
		t.Errorf("TotalAmount computed from a client-submitted rate: got %v, want 0", order.TotalAmount)
	}
}

func TestBuildOrder_StaffRateIsHonored(t *testing.T) {
	h := testHandler(t)
	product := seedProduct(t, h.DB, true)

	items := []orderItemRequest{{ProductID: product.ID, Quantity: 10, Rate: 250.50}}

	for _, role := range []models.Role{models.RoleAdmin, models.RoleEmployee} {
		order, err := h.buildOrder(1, 2, models.OrderStatusNew, role, items)
		if err != nil {
			t.Fatalf("role=%s: unexpected error: %v", role, err)
		}
		if got, want := order.Items[0].Rate, 250.50; got != want {
			t.Errorf("role=%s: rate = %v, want %v", role, got, want)
		}
		if got, want := order.TotalAmount, 2505.0; got != want {
			t.Errorf("role=%s: TotalAmount = %v, want %v", role, got, want)
		}
	}
}

func TestBuildOrder_RejectsInactiveProduct(t *testing.T) {
	h := testHandler(t)
	product := seedProduct(t, h.DB, false)

	items := []orderItemRequest{{ProductID: product.ID, Quantity: 1, Rate: 10}}
	if _, err := h.buildOrder(1, 1, models.OrderStatusNew, models.RoleAdmin, items); err == nil {
		t.Error("expected an error for an inactive product, got nil")
	}
}

func TestBuildOrder_RejectsMissingProduct(t *testing.T) {
	h := testHandler(t)

	items := []orderItemRequest{{ProductID: 9999, Quantity: 1, Rate: 10}}
	if _, err := h.buildOrder(1, 1, models.OrderStatusNew, models.RoleAdmin, items); err == nil {
		t.Error("expected an error for a nonexistent product, got nil")
	}
}

// Multiple line items must each resolve to their own product — this is the
// behavior the batched `WHERE id IN (...)` fetch has to preserve; it's easy
// to get subtly wrong (e.g. every item silently getting the same product)
// when converting a per-item query loop into a single batched lookup.
func TestBuildOrder_MultipleItemsResolveIndependently(t *testing.T) {
	h := testHandler(t)
	productA := seedProduct(t, h.DB, true)
	productB := models.Product{Name: "Other Grade", Category: models.CategoryGrease, IsActive: true}
	if err := h.DB.Create(&productB).Error; err != nil {
		t.Fatalf("failed to seed second product: %v", err)
	}

	items := []orderItemRequest{
		{ProductID: productA.ID, Quantity: 2, Rate: 100},
		{ProductID: productB.ID, Quantity: 3, Rate: 200},
	}
	order, err := h.buildOrder(1, 1, models.OrderStatusNew, models.RoleAdmin, items)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(order.Items) != 2 {
		t.Fatalf("expected 2 order items, got %d", len(order.Items))
	}
	if order.Items[0].ProductID != productA.ID || order.Items[1].ProductID != productB.ID {
		t.Error("order items resolved to the wrong products")
	}
	if got, want := order.TotalAmount, 2*100.0+3*200.0; got != want {
		t.Errorf("TotalAmount = %v, want %v", got, want)
	}
}

// Regression test for the Reorder pack-size bug: Reorder used to drop
// SizeInLiters when copying line items, so it reached the DB as 0, GORM
// omitted it (zero value + `default:210` tag), and a 20 L line silently
// came back as a 210 L drum on the new order.
func TestReorder_KeepsPackSize(t *testing.T) {
	h := testHandler(t)
	if err := h.DB.AutoMigrate(&models.User{}, &models.Order{}, &models.OrderItem{}); err != nil {
		t.Fatalf("failed to migrate order tables: %v", err)
	}
	// DeliveryLog's `default:now()` is Postgres-only SQL, so AutoMigrate
	// can't create it on SQLite. findOwnedOrder preloads DeliveryLogs, so the
	// table just has to exist; a minimal hand-written one is enough.
	if err := h.DB.Exec(`CREATE TABLE delivery_logs (id integer PRIMARY KEY, order_id integer, latitude real, longitude real, status_update text, updated_at datetime)`).Error; err != nil {
		t.Fatalf("failed to create delivery_logs table: %v", err)
	}
	product := seedProduct(t, h.DB, true)

	client := models.User{Name: "Test Client", Email: "client@example.com", Role: models.RoleClient}
	if err := h.DB.Create(&client).Error; err != nil {
		t.Fatalf("failed to seed client: %v", err)
	}
	source := models.Order{
		ClientID:    client.ID,
		CreatedByID: client.ID,
		Status:      models.OrderStatusDelivered,
		Items:       []models.OrderItem{{ProductID: product.ID, SizeInLiters: 20, Quantity: 3, Rate: 100}},
	}
	if err := h.DB.Create(&source).Error; err != nil {
		t.Fatalf("failed to seed source order: %v", err)
	}

	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPost, fmt.Sprintf("/orders/%d/reorder", source.ID), nil)
	c.Params = gin.Params{{Key: "id", Value: strconv.FormatUint(uint64(source.ID), 10)}}
	// Same context keys middleware.RequireAuth sets for a logged-in user.
	c.Set("userID", client.ID)
	c.Set("role", models.RoleClient)

	h.Reorder(c)

	if w.Code != http.StatusCreated {
		t.Fatalf("Reorder status = %d, want %d (body: %s)", w.Code, http.StatusCreated, w.Body.String())
	}

	var newItems []models.OrderItem
	if err := h.DB.Where("order_id <> ?", source.ID).Find(&newItems).Error; err != nil {
		t.Fatalf("failed to load reordered items: %v", err)
	}
	if len(newItems) != 1 {
		t.Fatalf("expected 1 reordered item, got %d", len(newItems))
	}
	if got := newItems[0].SizeInLiters; got != 20 {
		t.Errorf("reordered item SizeInLiters = %v, want 20", got)
	}
}

// Every (from, to) pair of order statuses. Only the four forward moves are
// allowed; everything else (backwards, skipping ahead to Delivered, leaving
// Delivered, anything in or out of Pending Approval, same-status) is not.
// Same-status is false here because it isn't a transition — UpdateStatus
// handles it separately as a no-op before calling isAllowedTransition.
func TestIsAllowedTransition(t *testing.T) {
	const (
		pending    = string(models.OrderStatusPendingApproval)
		newStatus  = string(models.OrderStatusNew)
		quoteSent  = string(models.OrderStatusQuoteSent)
		dispatched = string(models.OrderStatusDispatched)
		delivered  = string(models.OrderStatusDelivered)
	)

	tests := []struct {
		from, to string
		want     bool
	}{
		{pending, pending, false},
		{pending, newStatus, false},
		{pending, quoteSent, false},
		{pending, dispatched, false},
		{pending, delivered, false},

		{newStatus, pending, false},
		{newStatus, newStatus, false},
		{newStatus, quoteSent, true},
		{newStatus, dispatched, true},
		{newStatus, delivered, false},

		{quoteSent, pending, false},
		{quoteSent, newStatus, false},
		{quoteSent, quoteSent, false},
		{quoteSent, dispatched, true},
		{quoteSent, delivered, false},

		{dispatched, pending, false},
		{dispatched, newStatus, false},
		{dispatched, quoteSent, false},
		{dispatched, dispatched, false},
		{dispatched, delivered, true},

		{delivered, pending, false},
		{delivered, newStatus, false},
		{delivered, quoteSent, false},
		{delivered, dispatched, false},
		{delivered, delivered, false},
	}

	if len(tests) != 5*5 {
		t.Fatalf("table has %d cases, want %d (every pair of 5 statuses)", len(tests), 5*5)
	}

	for _, tt := range tests {
		if got := isAllowedTransition(tt.from, tt.to); got != tt.want {
			t.Errorf("isAllowedTransition(%q, %q) = %v, want %v", tt.from, tt.to, got, tt.want)
		}
	}
}
