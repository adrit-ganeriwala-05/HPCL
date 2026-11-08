package otp

import (
	"regexp"
	"testing"
)

var sixDigits = regexp.MustCompile(`^\d{6}$`)

func TestGenerate_IsSixDigitsZeroPadded(t *testing.T) {
	// Run enough times to make a non-zero-padded short code (e.g. "417"
	// instead of "000417") likely to show up if the padding were missing.
	for i := 0; i < 200; i++ {
		code, err := Generate()
		if err != nil {
			t.Fatalf("Generate: %v", err)
		}
		if !sixDigits.MatchString(code) {
			t.Fatalf("Generate produced %q, want a zero-padded 6-digit string", code)
		}
	}
}

func TestGenerate_IsNotConstant(t *testing.T) {
	seen := map[string]bool{}
	for i := 0; i < 50; i++ {
		code, err := Generate()
		if err != nil {
			t.Fatalf("Generate: %v", err)
		}
		seen[code] = true
	}
	if len(seen) < 40 {
		t.Fatalf("Generate produced only %d distinct codes across 50 calls — looks non-random", len(seen))
	}
}

func TestHashVerify_RoundTrip(t *testing.T) {
	hash, err := Hash("pepper", "123456")
	if err != nil {
		t.Fatalf("Hash: %v", err)
	}
	if !Verify("pepper", hash, "123456") {
		t.Error("Verify rejected the exact code it was hashed from")
	}
}

func TestHashVerify_WrongCodeFails(t *testing.T) {
	hash, err := Hash("pepper", "123456")
	if err != nil {
		t.Fatalf("Hash: %v", err)
	}
	if Verify("pepper", hash, "654321") {
		t.Error("Verify accepted a code that was never hashed")
	}
}

// The pepper is a server secret mixed into every hash — a stolen DB
// (CodeHash values only, no OTP_PEPPER) must not be enough to verify a
// guessed code against those hashes.
func TestHashVerify_WrongPepperFails(t *testing.T) {
	hash, err := Hash("correct-pepper", "123456")
	if err != nil {
		t.Fatalf("Hash: %v", err)
	}
	if Verify("wrong-pepper", hash, "123456") {
		t.Error("Verify accepted the right code hashed under a different pepper")
	}
}
