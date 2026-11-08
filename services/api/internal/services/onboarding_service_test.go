package services

import (
	"context"
	"errors"
	"sync"
	"testing"
	"time"

	"github.com/glebarez/sqlite"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"github.com/jpganeriwala-hpcl/services/api/internal/repository"
	"gorm.io/gorm"
)

// fakeNotifier captures the plaintext code instead of sending it — the
// whole point of hashing before storage (see internal/otp) is that the
// plaintext never touches the DB, so a test has nowhere else to recover
// it from except intercepting the "send" call itself.
type fakeNotifier struct {
	mu        sync.Mutex
	lastEmail string
}

func (f *fakeNotifier) SendEmailOTP(_ context.Context, _, code string) error {
	f.mu.Lock()
	defer f.mu.Unlock()
	f.lastEmail = code
	return nil
}

func (f *fakeNotifier) email() string {
	f.mu.Lock()
	defer f.mu.Unlock()
	return f.lastEmail
}

func testService(t *testing.T) (*OnboardingService, *fakeNotifier, *gorm.DB) {
	t.Helper()
	// UTC timestamps, same as database.Connect. SQLite stores times as text
	// and compares them as strings, so a local-time CreatedAt vs the UTC
	// cutoff in checkRateLimit gives wrong answers outside UTC.
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		t.Fatalf("open test db: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}, &models.OTPVerification{}, &models.Address{}); err != nil {
		t.Fatalf("migrate test schema: %v", err)
	}

	notifier := &fakeNotifier{}
	svc := &OnboardingService{
		Users:    repository.NewUserRepository(db),
		OTPs:     repository.NewOTPRepository(db),
		Notifier: notifier,
		Pepper:   "test-pepper",
	}
	return svc, notifier, db
}

func TestEmailOTP_RegistersNewUserOnFirstVerify(t *testing.T) {
	svc, notifier, _ := testService(t)
	ctx := context.Background()
	email := "newclient@example.com"

	if err := svc.RequestEmailOTP(ctx, email, "1.2.3.4"); err != nil {
		t.Fatalf("RequestEmailOTP: %v", err)
	}

	user, err := svc.VerifyEmailOTP(ctx, email, notifier.email())
	if err != nil {
		t.Fatalf("VerifyEmailOTP: %v", err)
	}
	if user.Email != email {
		t.Errorf("got email %q, want %q", user.Email, email)
	}
	if user.Role != models.RoleClient {
		t.Errorf("got role %q, want client", user.Role)
	}
}

func TestEmailOTP_ReturningUserLogsInWithoutDuplicating(t *testing.T) {
	svc, notifier, db := testService(t)
	ctx := context.Background()
	email := "returning@example.com"

	existing := &models.User{Email: email, Name: "Returning Client", Role: models.RoleClient, IsActive: true}
	if err := db.Create(existing).Error; err != nil {
		t.Fatalf("seed existing user: %v", err)
	}

	if err := svc.RequestEmailOTP(ctx, email, "1.2.3.4"); err != nil {
		t.Fatalf("RequestEmailOTP: %v", err)
	}
	user, err := svc.VerifyEmailOTP(ctx, email, notifier.email())
	if err != nil {
		t.Fatalf("VerifyEmailOTP: %v", err)
	}
	if user.ID != existing.ID {
		t.Errorf("got a different user (id=%d) instead of logging the existing one (id=%d) in", user.ID, existing.ID)
	}

	var count int64
	db.Model(&models.User{}).Where("email = ?", email).Count(&count)
	if count != 1 {
		t.Errorf("expected exactly 1 user row for %s, got %d", email, count)
	}
}

func TestEmailOTP_WrongCodeIsRejectedAndCounted(t *testing.T) {
	svc, _, _ := testService(t)
	ctx := context.Background()
	email := "test@example.com"

	if err := svc.RequestEmailOTP(ctx, email, "1.2.3.4"); err != nil {
		t.Fatalf("RequestEmailOTP: %v", err)
	}
	_, err := svc.VerifyEmailOTP(ctx, email, "000000")
	if !errors.Is(err, ErrInvalidCode) {
		t.Fatalf("got err=%v, want ErrInvalidCode", err)
	}
}

// This is the brute-force-lockout guarantee: MaxAttempts wrong guesses and
// the code is dead, even if attempt #6 would have been the right one.
func TestEmailOTP_LocksAfterMaxAttempts(t *testing.T) {
	svc, notifier, _ := testService(t)
	ctx := context.Background()
	email := "bruteforce@example.com"

	if err := svc.RequestEmailOTP(ctx, email, "1.2.3.4"); err != nil {
		t.Fatalf("RequestEmailOTP: %v", err)
	}
	realCode := notifier.email()

	for i := 0; i < MaxAttempts-1; i++ {
		if _, err := svc.VerifyEmailOTP(ctx, email, "000000"); !errors.Is(err, ErrInvalidCode) {
			t.Fatalf("attempt %d: got err=%v, want ErrInvalidCode", i+1, err)
		}
	}
	// One more wrong attempt should push it over the edge into locked...
	if _, err := svc.VerifyEmailOTP(ctx, email, "000000"); !errors.Is(err, ErrCodeLocked) {
		t.Fatalf("final wrong attempt: got err=%v, want ErrCodeLocked", err)
	}
	// ...and the *real* code must now also be rejected as locked, not
	// accepted — otherwise the lockout would be pointless.
	if _, err := svc.VerifyEmailOTP(ctx, email, realCode); !errors.Is(err, ErrCodeLocked) {
		t.Fatalf("correct code after lockout: got err=%v, want ErrCodeLocked", err)
	}
}

func TestEmailOTP_RateLimitedAfterThreeRequestsPerHour(t *testing.T) {
	svc, _, _ := testService(t)
	ctx := context.Background()
	email := "ratelimit@example.com"

	for i := 0; i < MaxRequestsPerHour; i++ {
		if err := svc.RequestEmailOTP(ctx, email, "1.2.3.4"); err != nil {
			t.Fatalf("request %d: unexpected error %v", i+1, err)
		}
	}
	if err := svc.RequestEmailOTP(ctx, email, "1.2.3.4"); !errors.Is(err, ErrRateLimited) {
		t.Fatalf("4th request in the hour: got err=%v, want ErrRateLimited", err)
	}
}

func TestEmailOTP_RateLimitAppliesPerIPToo(t *testing.T) {
	svc, _, _ := testService(t)
	ctx := context.Background()
	ip := "9.9.9.9"

	// Three different emails, same IP, should still trip the per-IP cap —
	// rotating identifiers from one source can't be used to dodge the limit.
	for i, email := range []string{"a@example.com", "b@example.com", "c@example.com"} {
		if err := svc.RequestEmailOTP(ctx, email, ip); err != nil {
			t.Fatalf("request %d: unexpected error %v", i+1, err)
		}
	}
	if err := svc.RequestEmailOTP(ctx, "d@example.com", ip); !errors.Is(err, ErrRateLimited) {
		t.Fatalf("4th distinct email from the same IP: got err=%v, want ErrRateLimited", err)
	}
}

func TestVerifyEmailOTP_NoActiveCodeWithoutARequest(t *testing.T) {
	svc, _, _ := testService(t)
	_, err := svc.VerifyEmailOTP(context.Background(), "never-requested@example.com", "123456")
	if !errors.Is(err, ErrNoActiveCode) {
		t.Fatalf("got err=%v, want ErrNoActiveCode", err)
	}
}
