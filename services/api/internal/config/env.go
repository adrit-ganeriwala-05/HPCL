package config

import (
	"os"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Port         string
	DatabaseURL  string
	ClientOrigin string
	JWTSecret    string
	JWTTTL       time.Duration
	// AppEnv gates the auth cookie's Secure flag — "production" requires
	// HTTPS (Secure=true), anything else assumes local HTTP dev.
	AppEnv string

	// OTPPepper is mixed into every OTP before hashing (see internal/otp) —
	// a secret the DB itself never contains, so a DB-only leak (backup,
	// SQLi, misconfigured replica) isn't enough on its own to let someone
	// precompute hashes for all 10^6 six-digit codes and match them
	// against stolen CodeHash values.
	OTPPepper string

	// GmailSMTPUser/GmailSMTPAppPassword authenticate directly against
	// Gmail's SMTP relay to send OTP emails (see internal/notify —
	// gomail, not a third-party HTTP API). AppPassword is a 16-character
	// Google App Password, not the account's real login password; Gmail
	// requires 2-Step Verification enabled to generate one.
	GmailSMTPUser        string
	GmailSMTPAppPassword string
	EmailFromName        string

	// GoogleClientID is this app's OAuth 2.0 Web Client ID from Google
	// Cloud Console — used two places: the frontend passes it to Google's
	// SDK to request an ID token, and the backend passes it as the
	// expected `aud` (audience) when verifying that token (see
	// handlers.GoogleAuthHandler). No client secret is needed for this
	// flow — verifying a signed ID token doesn't require one, unlike the
	// server-side authorization-code exchange.
	GoogleClientID string

	// StaticDir, when set, is a folder holding the built React app (the
	// contents of client/dist). The API then serves it for every non-/api
	// path, with index.html as the fallback for client-side routes — one
	// service, one origin, so the auth cookie and CSRF check just work.
	// Empty (local dev) = API only; Vite serves the frontend.
	StaticDir string
}

func (c Config) IsProduction() bool { return c.AppEnv == "production" }

// Load reads .env (if present — production deploys typically inject env vars
// directly) and returns the resolved application config.
func Load() Config {
	_ = godotenv.Load()

	ttl, err := time.ParseDuration(getEnv("JWT_EXPIRES_IN", "168h"))
	if err != nil {
		ttl = 168 * time.Hour
	}

	return Config{
		Port:        getEnv("PORT", "8080"),
		DatabaseURL: getEnv("DATABASE_URL", "host=localhost user=postgres password=postgres dbname=jpganeriwala_hpcl port=5432 sslmode=disable"),
		// On Render, RENDER_EXTERNAL_URL (e.g. https://hpcl.onrender.com) is
		// set automatically — and when the API also serves the frontend
		// (STATIC_DIR), that IS the browser's origin, so no manual value is
		// needed there. An explicit CLIENT_ORIGIN always wins.
		ClientOrigin: getEnv("CLIENT_ORIGIN", getEnv("RENDER_EXTERNAL_URL", "http://localhost:5173")),
		StaticDir:    getEnv("STATIC_DIR", ""),
		JWTSecret:    getEnv("JWT_SECRET", ""),
		JWTTTL:       ttl,
		AppEnv:       getEnv("APP_ENV", "development"),

		OTPPepper: getEnv("OTP_PEPPER", ""),

		GmailSMTPUser:        getEnv("GMAIL_SMTP_USER", ""),
		GmailSMTPAppPassword: getEnv("GMAIL_SMTP_APP_PASSWORD", ""),
		EmailFromName:        getEnv("EMAIL_FROM_NAME", "M/s Jay Prakash Ganeriwala"),

		GoogleClientID: getEnv("GOOGLE_CLIENT_ID", ""),
	}
}

func getEnv(key, fallback string) string {
	if v, ok := os.LookupEnv(key); ok && v != "" {
		return v
	}
	return fallback
}
