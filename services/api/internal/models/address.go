package models

// Address is one delivery/shipment location for a client — a client can
// have several (site office, warehouse gate, a mine's stores department,
// ...); orders reference one at dispatch time. Deliberately its own table
// rather than flat columns on User: "multiple delivery shipment addresses"
// is a one-to-many relationship, not a single mailing address.
type Address struct {
	Base

	UserID uint `json:"userId" gorm:"not null;index"`
	User   User `json:"-" gorm:"foreignKey:UserID;constraint:OnUpdate:CASCADE,OnDelete:CASCADE"`

	// Label is how the client tells their own addresses apart in a
	// dropdown — "Main Warehouse", "Site Office — Andal", free text.
	Label string `json:"label" gorm:"type:varchar(80);not null"`

	Line1   string `json:"line1" gorm:"type:varchar(200);not null"`
	Line2   string `json:"line2" gorm:"type:varchar(200)"`
	City    string `json:"city" gorm:"type:varchar(100);not null"`
	State   string `json:"state" gorm:"type:varchar(100);not null"`
	Pincode string `json:"pincode" gorm:"type:varchar(10);not null"`

	// IsDefault marks the address pre-selected on a new order. Exactly one
	// per user in practice — enforced in the service layer (set-default
	// clears any other default on that user in the same transaction),
	// not at the DB level, since GORM/Postgres partial unique indexes
	// aren't worth the migration complexity for a single boolean.
	IsDefault bool `json:"isDefault" gorm:"not null;default:false"`
}
