package models

import "time"

type OrderStatus string

const (
	// OrderStatusPendingApproval is where an employee-created order starts —
	// invisible to the normal pipeline until an admin approves it via
	// POST /orders/:id/approve. Client self-service orders and admin-created
	// orders skip this and start at OrderStatusNew directly.
	OrderStatusPendingApproval OrderStatus = "Pending Approval"
	OrderStatusNew             OrderStatus = "New"
	OrderStatusQuoteSent       OrderStatus = "Quote Sent"
	OrderStatusDispatched      OrderStatus = "Dispatched"
	OrderStatusDelivered       OrderStatus = "Delivered"
)

// Order is a client's bulk lubricant order, tracked through the CFA fulfillment pipeline.
type Order struct {
	Base
	ClientID      uint        `json:"clientId" gorm:"not null;index"`
	Client        User        `json:"client" gorm:"foreignKey:ClientID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	Status        OrderStatus `json:"status" gorm:"type:varchar(20);not null;default:New;check:status IN ('Pending Approval','New','Quote Sent','Dispatched','Delivered');index"`
	TotalVolume   float64     `json:"totalVolume" gorm:"type:numeric(10,2);not null;default:0"`
	TotalAmount   float64     `json:"totalAmount" gorm:"type:numeric(12,2);not null;default:0"`
	InternalNotes string      `json:"internalNotes" gorm:"type:text"`

	// CreatedBy is whoever actually submitted the order — the client
	// themself (self-service), or an admin/employee placing it on the
	// client's behalf. Distinct from ClientID (who the order is *for*).
	// Combined with each OrderItem's Rate, this is the "who created this
	// order at what rate" audit trail.
	CreatedByID uint `json:"createdById" gorm:"not null;index"`
	CreatedBy   User `json:"createdBy" gorm:"foreignKey:CreatedByID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`

	ApprovedByID *uint      `json:"approvedById" gorm:"index"`
	ApprovedBy   *User      `json:"approvedBy" gorm:"foreignKey:ApprovedByID;constraint:OnUpdate:CASCADE,OnDelete:SET NULL"`
	ApprovedAt   *time.Time `json:"approvedAt"`

	Items        []OrderItem   `json:"items" gorm:"foreignKey:OrderID"`
	DeliveryLogs []DeliveryLog `json:"deliveryLogs" gorm:"foreignKey:OrderID"`
}

// OrderItem is a line item on an Order: one product at a given quantity and
// rate. Rate is captured per-item at order-creation time (not read off
// Product) so historical orders keep the rate they were actually placed at
// even if pricing changes later — this is the "for what rate" half of the
// order audit log; CreatedBy on Order is the "who" half.
type OrderItem struct {
	ID      uint    `json:"id" gorm:"primaryKey"`
	OrderID uint    `json:"orderId" gorm:"not null;index"`
	ProductID uint  `json:"productId" gorm:"not null;index"`
	Product Product `json:"product" gorm:"foreignKey:ProductID;constraint:OnUpdate:CASCADE,OnDelete:RESTRICT"`
	// SizeInLiters is the pack size this line is for (e.g. 20, 210) — a
	// Product is a grade, not a SKU, so the (ProductID, SizeInLiters) pair
	// is what actually maps to a warehouse inventory unit. Defaults to 210
	// (the common industrial drum size) purely so AutoMigrate can add this
	// column to any pre-existing rows without violating the check below;
	// every new order line always sets it explicitly (see orderItemRequest).
	SizeInLiters float64 `json:"sizeInLiters" gorm:"type:numeric(8,2);not null;default:210;check:size_in_liters > 0"`
	Quantity     int     `json:"quantity" gorm:"not null;check:quantity > 0"`
	Rate         float64 `json:"rate" gorm:"type:numeric(10,2);not null;default:0;check:rate >= 0"`
}
