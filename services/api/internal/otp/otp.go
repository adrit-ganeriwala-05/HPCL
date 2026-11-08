// Package otp is the pure crypto layer for one-time-passcodes: generating
// a code, hashing it for storage, and comparing a guess against a stored
// hash. It knows nothing about rate limiting, expiry, or attempt counts —
// that's orchestration, owned by internal/services.OnboardingService. Kept
// separate so the actual crypto is small enough to read in one sitting and
// unit-test in isolation.
package otp

import (
	"crypto/rand"
	"fmt"
	"math/big"

	"golang.org/x/crypto/bcrypt"
)

const Length = 6

// Generate returns a cryptographically random 6-digit code as a string,
// zero-padded ("003417", not "3417") — crypto/rand, not math/rand, since
// this is a guessable-space-of-a-million secret and needs to actually be
// unpredictable.
func Generate() (string, error) {
	max := big.NewInt(1_000_000) // 10^Length
	n, err := rand.Int(rand.Reader, max)
	if err != nil {
		return "", fmt.Errorf("generate otp: %w", err)
	}
	return fmt.Sprintf("%06d", n.Int64()), nil
}

// Hash bcrypt-hashes pepper+code for storage. The pepper is a server-side
// secret (OTP_PEPPER, never in the DB) mixed in before hashing — see
// config.Config.OTPPepper's doc comment for why.
func Hash(pepper, code string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword([]byte(pepper+code), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("hash otp: %w", err)
	}
	return string(hash), nil
}

// Verify reports whether `code` matches the stored `hash`, once pepper is
// reapplied. Constant-time by construction (bcrypt's own comparison).
func Verify(pepper, hash, code string) bool {
	return bcrypt.CompareHashAndPassword([]byte(hash), []byte(pepper+code)) == nil
}
