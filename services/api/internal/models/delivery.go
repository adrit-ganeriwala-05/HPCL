package models

import "time"

// DeliveryLog is an append-only tracking ping for an order in transit —
// written by the dispatch/WebSocket pipeline, never updated or soft-deleted.
type DeliveryLog struct {
	ID           uint      `json:"id" gorm:"primaryKey"`
	OrderID      uint      `json:"orderId" gorm:"not null;index:idx_delivery_order_time,priority:1"`
	Latitude     float64   `json:"latitude" gorm:"not null"`
	Longitude    float64   `json:"longitude" gorm:"not null"`
	StatusUpdate string    `json:"statusUpdate" gorm:"type:varchar(120);not null"`
	UpdatedAt    time.Time `json:"updatedAt" gorm:"not null;default:now();index:idx_delivery_order_time,priority:2"`
}
