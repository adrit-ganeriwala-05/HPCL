package models

import (
	"time"

	"gorm.io/gorm"
)

// Base replaces gorm.Model across our tables so JSON output is consistently
// camelCase — gorm.Model's exported fields (ID, CreatedAt, ...) can't be
// retagged since they're defined in the gorm package itself.
type Base struct {
	ID        uint           `json:"id" gorm:"primaryKey"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}
