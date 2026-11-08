package notify

import (
	"context"
	"fmt"

	"gopkg.in/gomail.v2"
)

const (
	gmailSMTPHost = "smtp.gmail.com"
	gmailSMTPPort = 587
)

// gmailSender delivers via Gmail's own SMTP relay, authenticated as a real
// Gmail account — not a third-party HTTP API sending "as" that address.
// That distinction is the whole reason this exists instead of another
// SendGrid-style adapter: Gmail enforces strict DMARC on its own domain,
// so mail claiming to be from a gmail.com address but actually sent via a
// third-party ESP gets spam-foldered or rejected by receiving servers
// (including Gmail itself). Authenticating directly against Google's SMTP
// servers with the account's own credentials sidesteps that entirely —
// the mail genuinely does originate from Google's infrastructure.
//
// smtpUser/appPassword are a Gmail address and a 16-character Google App
// Password (not the account's login password — Gmail requires 2-Step
// Verification enabled and an App Password generated for SMTP auth from a
// script; the account password alone is rejected).
type gmailSender struct {
	fromAddr string
	fromName string
	dialer   *gomail.Dialer
}

func NewGmailSender(smtpUser, appPassword, fromName string) EmailSender {
	return &gmailSender{
		fromAddr: smtpUser,
		fromName: fromName,
		dialer:   gomail.NewDialer(gmailSMTPHost, gmailSMTPPort, smtpUser, appPassword),
	}
}

// Send blocks on the SMTP round trip in a goroutine so ctx cancellation is
// actually honored — gomail.Dialer has no native context support, so
// without this a caller's timeout would be silently ignored and the call
// would hang for as long as the TCP/SMTP handshake takes.
func (s *gmailSender) Send(ctx context.Context, toEmail, subject, body string) error {
	m := gomail.NewMessage()
	m.SetAddressHeader("From", s.fromAddr, s.fromName)
	m.SetHeader("To", toEmail)
	m.SetHeader("Subject", subject)
	m.SetBody("text/plain", body)

	errCh := make(chan error, 1)
	go func() { errCh <- s.dialer.DialAndSend(m) }()

	select {
	case err := <-errCh:
		if err != nil {
			return fmt.Errorf("send via gmail smtp: %w", err)
		}
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
