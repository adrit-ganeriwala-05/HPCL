package models

type Role string

const (
	RoleClient   Role = "client"
	RoleEmployee Role = "employee"
	RoleAdmin    Role = "admin"
)

// User represents B2B portal clients and internal staff. Admin ("father")
// has unconditional access to everything — the CanXxx flags only apply to
// role=employee, and are checked fresh from the DB on every protected
// request (not embedded in the JWT) so a permission revoked mid-session
// takes effect immediately, not just on next login.
type User struct {
	Base
	Name  string `json:"name" gorm:"type:varchar(160);not null"`
	Email string `json:"email" gorm:"type:varchar(160);uniqueIndex;not null"`

	// PasswordHash is nullable — clients onboarded through the OTP flow
	// (see internal/services/onboarding_service.go) never set a password
	// at all; they authenticate by requesting a fresh email OTP every
	// time. Staff (employee/admin) accounts are always password-based.
	// A nil/empty hash safely fails bcrypt.CompareHashAndPassword rather
	// than needing a special-cased branch in Login.
	PasswordHash string `json:"-" gorm:"type:varchar(255)"`

	CompanyName string `json:"companyName" gorm:"type:varchar(160)"`

	// ContactPerson is who to actually call at this account — CompanyName
	// is the business, Name may be whoever registered the account (could
	// be an owner, an accountant, a procurement clerk); kept distinct
	// since B2B onboarding regularly has different values for the two.
	ContactPerson string `json:"contactPerson" gorm:"type:varchar(160)"`

	// Phone is a plain contact number staff can call — optional, not
	// verified (the old SMS-verified phone column was removed; this is a
	// different, unverified field). Nullable so existing rows migrate
	// cleanly; validated in ProfileHandler.UpdateProfile.
	Phone string `json:"phone" gorm:"type:varchar(30)"`

	Role Role `json:"role" gorm:"type:varchar(10);not null;default:client;check:role IN ('client','employee','admin');index"`

	// IsActive gates login and every request, not just new sign-ins — see
	// middleware.RequireAuth. This is "remove employee": we deactivate
	// rather than hard-delete because Order.CreatedByID references the
	// employee (RESTRICT), and deactivating preserves the "who created
	// this order" audit trail instead of erasing it.
	IsActive bool `json:"isActive" gorm:"not null;default:true"`

	// SessionVersion is copied into every login token; Logout increments it,
	// so every token issued before that logout (on any device) is rejected
	// by RequireAuth from then on. A counter rather than a "valid after"
	// timestamp because token issue times only have one-second precision.
	SessionVersion int `json:"-" gorm:"not null;default:0"`

	// Employee permission flags — meaningless for client/admin roles.
	CanCreateOrders      bool `json:"canCreateOrders" gorm:"not null;default:false"`
	CanManageOrderStatus bool `json:"canManageOrderStatus" gorm:"not null;default:false"`
	CanManageProducts    bool `json:"canManageProducts" gorm:"not null;default:false"`
	CanViewLeads         bool `json:"canViewLeads" gorm:"not null;default:false"`
	CanManageInventory   bool `json:"canManageInventory" gorm:"not null;default:false"`

	Orders []Order `json:"-" gorm:"foreignKey:ClientID"`
}

func (u User) HasPermission(check func(User) bool) bool {
	return u.Role == RoleAdmin || (u.Role == RoleEmployee && check(u))
}
