package models

// Lead is an anonymous public enquiry from the marketing site's contact
// form — deliberately separate from Order/User: a visitor sending a lead
// hasn't registered or authenticated, and may never become a client.
type Lead struct {
	Base
	Name            string `json:"name" gorm:"type:varchar(160);not null"`
	Company         string `json:"company" gorm:"type:varchar(160)"`
	CompanyAddress  string `json:"companyAddress" gorm:"type:varchar(300)"`
	Phone           string `json:"phone" gorm:"type:varchar(30);not null"`
	Email           string `json:"email" gorm:"type:varchar(160)"`
	Location        string `json:"location" gorm:"type:varchar(160)"`
	EnquiryType     string `json:"enquiryType" gorm:"type:varchar(40);not null;default:'general'"`
	ProductInterest string `json:"productInterest" gorm:"type:varchar(80)"`
	Details         string `json:"details" gorm:"type:text"`
}
