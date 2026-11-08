// Package services holds business logic that's more than a single
// handler's worth of DB calls — currently just the email OTP onboarding
// flow. OnboardingService owns the actual security rules (rate limits,
// lockout, expiry); internal/handlers only translates HTTP <-> these calls
// and maps errors to status codes.
package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"github.com/jpganeriwala-hpcl/services/api/internal/notify"
	"github.com/jpganeriwala-hpcl/services/api/internal/otp"
	"github.com/jpganeriwala-hpcl/services/api/internal/repository"
)

const (
	otpTTL = 5 * time.Minute

	// MaxRequestsPerHour caps OTP *requests* — not attempts — per
	// identifier and, independently, per IP. Either one hitting the cap
	// blocks a new request; both windows are the trailing hour, checked
	// fresh on every request rather than a fixed clock-hour bucket (so
	// "3 an hour" actually means any rolling 60 minutes, not "3 since
	// the top of the hour then a free reset at :00").
	MaxRequestsPerHour = 3

	// MaxAttempts is enforced by the DB row's own MaxAttempts default
	// (models.OTPVerification), duplicated here only as the constant this
	// package hands new rows when creating them.
	MaxAttempts = 5
)

var (
	ErrRateLimited  = errors.New("too many OTP requests — try again later")
	ErrNoActiveCode = errors.New("no active code for this identifier — request a new one")
	ErrCodeLocked   = errors.New("too many incorrect attempts — request a new code")
	ErrInvalidCode  = errors.New("incorrect code")
	ErrUserInactive = errors.New("this account has been deactivated")
)

type OnboardingService struct {
	Users    repository.UserRepository
	OTPs     repository.OTPRepository
	Notifier notify.Notifier
	Pepper   string
}

// RequestEmailOTP sends a fresh code to `email`, subject to the rate limit.
// Deliberately does not reveal whether the email already has an account —
// same response, same code format, whether this becomes a registration or
// a login on verify (see VerifyEmailOTP).
func (s *OnboardingService) RequestEmailOTP(ctx context.Context, email, requestIP string) error {
	if err := s.checkRateLimit(ctx, email, requestIP); err != nil {
		return err
	}

	code, err := s.issueCode(ctx, email, requestIP)
	if err != nil {
		return err
	}

	return s.Notifier.SendEmailOTP(ctx, email, code)
}

// VerifyEmailOTP checks `code` against the latest active request for
// `email`. On success: finds the existing user by email, or creates a new
// client account if none exists yet — one endpoint serves both
// registration and login, since from the caller's side "I proved I own
// this email" is the same fact either way.
func (s *OnboardingService) VerifyEmailOTP(ctx context.Context, email, code string) (*models.User, error) {
	if err := s.consumeCode(ctx, email, code); err != nil {
		return nil, err
	}
	return s.FindOrCreateByVerifiedEmail(ctx, email)
}

// FindOrCreateByVerifiedEmail returns the existing user for `email`, or
// provisions a new client account if none exists yet. Shared by every auth
// path that proves email ownership out-of-band rather than by password —
// OTP verification (above) and Google Sign-In (see handlers.GoogleAuthHandler)
// both end up here, so "does this email already have an account" is
// answered identically no matter which path proved it.
func (s *OnboardingService) FindOrCreateByVerifiedEmail(ctx context.Context, email string) (*models.User, error) {
	user, err := s.Users.FindByEmail(ctx, email)
	if errors.Is(err, repository.ErrNotFound) {
		user = &models.User{
			Email: email,
			Name:  email, // placeholder until CompleteProfile fills in a real name — see profile handler.
			Role:  models.RoleClient,
		}
		if err := s.Users.Create(ctx, user); err != nil {
			return nil, fmt.Errorf("create user: %w", err)
		}
		return user, nil
	}
	if err != nil {
		return nil, fmt.Errorf("look up user: %w", err)
	}
	if !user.IsActive {
		return nil, ErrUserInactive
	}
	return user, nil
}

// checkRateLimit enforces MaxRequestsPerHour independently per identifier
// and per IP — both are checked so a script rotating through many emails
// from one machine is caught by the IP count even though each individual
// email is under its own limit.
func (s *OnboardingService) checkRateLimit(ctx context.Context, identifier, requestIP string) error {
	since := time.Now().UTC().Add(-1 * time.Hour)

	byIdentifier, err := s.OTPs.CountByIdentifierSince(ctx, identifier, since)
	if err != nil {
		return fmt.Errorf("check identifier rate limit: %w", err)
	}
	if byIdentifier >= MaxRequestsPerHour {
		return ErrRateLimited
	}

	if requestIP != "" {
		byIP, err := s.OTPs.CountByIPSince(ctx, requestIP, since)
		if err != nil {
			return fmt.Errorf("check ip rate limit: %w", err)
		}
		if byIP >= MaxRequestsPerHour {
			return ErrRateLimited
		}
	}

	return nil
}

func (s *OnboardingService) issueCode(ctx context.Context, identifier, requestIP string) (string, error) {
	code, err := otp.Generate()
	if err != nil {
		return "", fmt.Errorf("generate code: %w", err)
	}
	hash, err := otp.Hash(s.Pepper, code)
	if err != nil {
		return "", fmt.Errorf("hash code: %w", err)
	}

	row := &models.OTPVerification{
		Identifier:  identifier,
		CodeHash:    hash,
		ExpiresAt:   time.Now().UTC().Add(otpTTL),
		MaxAttempts: MaxAttempts,
		RequestIP:   requestIP,
	}
	if err := s.OTPs.Create(ctx, row); err != nil {
		return "", fmt.Errorf("store otp: %w", err)
	}

	return code, nil
}

func (s *OnboardingService) consumeCode(ctx context.Context, identifier, code string) error {
	row, err := s.OTPs.FindLatestActive(ctx, identifier)
	if errors.Is(err, repository.ErrNotFound) {
		return ErrNoActiveCode
	}
	if err != nil {
		return fmt.Errorf("look up otp: %w", err)
	}
	return s.checkAndConsume(ctx, row, code)
}

// checkAndConsume is the actual attempt/lockout/verify logic. A locked or
// expired row is never re-checked against the hash — the code comparison
// only ever runs for a row that's still eligible, so a code that's already
// maxed-out on attempts can't be brute-forced further by continuing to
// guess against the same row.
func (s *OnboardingService) checkAndConsume(ctx context.Context, row *models.OTPVerification, code string) error {
	now := time.Now().UTC()
	if row.IsLocked() {
		return ErrCodeLocked
	}
	if row.IsExpired(now) {
		return ErrNoActiveCode
	}

	if !otp.Verify(s.Pepper, row.CodeHash, code) {
		if err := s.OTPs.IncrementAttempts(ctx, row.ID); err != nil {
			return fmt.Errorf("record failed attempt: %w", err)
		}
		if row.Attempts+1 >= row.MaxAttempts {
			return ErrCodeLocked
		}
		return ErrInvalidCode
	}

	if err := s.OTPs.MarkConsumed(ctx, row.ID); err != nil {
		return fmt.Errorf("mark otp consumed: %w", err)
	}
	return nil
}
