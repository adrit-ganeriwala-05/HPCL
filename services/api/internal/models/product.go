package models

const (
	CategoryEngineAutomotive = "Engine / Automotive Oil"
	CategoryHydraulic        = "Hydraulic / Industrial Oil"
	CategoryGearOil          = "Gear Oil"
	CategoryGrease           = "Grease"
	CategoryCoolant          = "Coolant"
	CategorySpecialty        = "Specialty Industrial Fluid"
)

// Product is a catalog entry for an HPCL lubricant grade.
type Product struct {
	Base
	Name            string `json:"name" gorm:"type:varchar(160);not null;index"`
	Category        string `json:"category" gorm:"type:varchar(80);not null;index"`
	Description     string `json:"description" gorm:"type:text"`
	ViscosityGrade  string `json:"viscosityGrade" gorm:"type:varchar(40)"`
	ApplicationArea string `json:"applicationArea" gorm:"type:varchar(160)"`
	IsActive        bool   `json:"isActive" gorm:"not null;default:true;index"`
}
