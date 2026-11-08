package models

import "time"

// OTPVerification is a single email OTP challenge — one row per code sent,
// never updated except to record an attempt/consumption. Old rows are left
// in place (audit trail of onboarding/login activity); nothing reads
// beyond the most recent unconsumed, unexpired row for a given identifier.
type OTPVerification struct {
	Base

	// Identifier is the email address this code was sent to.
	Identifier string `json:"-" gorm:"type:varchar(160);not null;index"`

	// CodeHash is bcrypt(pepper + 6-digit code) — see internal/otp. Never
	// the plaintext code; that only ever exists in memory long enough to
	// hand to the email send call.
	CodeHash string `json:"-" gorm:"type:varchar(255);not null"`

	ExpiresAt time.Time `json:"-" gorm:"not null;index"`

	// Attempts/MaxAttempts implement the brute-force lockout: 5 wrong
	// guesses against this specific code and it's dead, full stop — the
	// caller must request a fresh one (which also re-enters the hourly
	// rate limit, so lockout can't be worked around by just retrying
	// forever).
	Attempts    int `json:"-" gorm:"not null;default:0"`
	MaxAttempts int `json:"-" gorm:"not null;default:5"`

	ConsumedAt *time.Time `json:"-"`

	// RequestIP feeds the per-IP side of the rate limit, alongside the
	// per-identifier count — see OnboardingService.checkRateLimit.
	RequestIP string `json:"-" gorm:"type:varchar(64)"`
}

func (o OTPVerification) IsExpired(now time.Time) bool {
	return now.After(o.ExpiresAt)
}

func (o OTPVerification) IsConsumed() bool {
	return o.ConsumedAt != nil
}

func (o OTPVerification) IsLocked() bool {
	return o.Attempts >= o.MaxAttempts
}
