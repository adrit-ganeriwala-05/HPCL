// Package notify sends the OTP to the user — email via Gmail's own SMTP
// relay (see email_gmail.go for why Gmail SMTP specifically, not a
// third-party HTTP API). Behind the Notifier interface so
// internal/services.OnboardingService depends on a contract, not a
// provider. A log-only fallback is included for local dev / tests where
// no real SMTP credentials are configured.
package notify

import (
	"context"

	"go.uber.org/zap"
)

type Notifier interface {
	SendEmailOTP(ctx context.Context, toEmail, code string) error
}

// New picks the real Gmail SMTP sender when credentials are configured,
// and falls back to the log-only sender otherwise — so local dev and CI
// never need a real Gmail account to exercise the OTP flow.
func New(cfg Config, logger *zap.Logger) Notifier {
	var email EmailSender
	if cfg.GmailSMTPUser != "" && cfg.GmailSMTPAppPassword != "" {
		email = NewGmailSender(cfg.GmailSMTPUser, cfg.GmailSMTPAppPassword, cfg.EmailFromName)
	} else {
		email = &logEmailSender{logger: logger}
	}

	return &notifier{email: email}
}

// Config is the subset of config.Config this package needs — kept as its
// own small struct so this package doesn't import the top-level config
// package (avoids an import cycle risk and keeps notify independently
// testable/reusable).
type Config struct {
	GmailSMTPUser        string
	GmailSMTPAppPassword string
	EmailFromName        string
}

type EmailSender interface {
	Send(ctx context.Context, toEmail, subject, body string) error
}

type notifier struct {
	email EmailSender
}

func (n *notifier) SendEmailOTP(ctx context.Context, toEmail, code string) error {
	subject := "Your verification code"
	body := "Your one-time verification code is " + code + ". It expires in 5 minutes. " +
		"If you didn't request this, you can safely ignore this email."
	return n.email.Send(ctx, toEmail, subject, body)
}

// logEmailSender logs instead of sending — used automatically when Gmail
// SMTP credentials aren't configured, so local dev and tests can exercise
// the whole OTP flow without a real Gmail account. Never selected when
// real credentials are present (see New).
type logEmailSender struct {
	logger *zap.Logger
}

func (s *logEmailSender) Send(_ context.Context, toEmail, subject, body string) error {
	s.logger.Warn("no Gmail SMTP credentials configured — email not actually sent, logging instead",
		zap.String("to", toEmail), zap.String("subject", subject), zap.String("body", body))
	return nil
}
