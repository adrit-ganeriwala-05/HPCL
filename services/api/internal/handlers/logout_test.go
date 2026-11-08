package handlers

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/jpganeriwala-hpcl/services/api/internal/auth"
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/middleware"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
)

// Regression test: a token copied before logout must stop working after
// logout, on every device, while a fresh login afterwards works normally.
func TestLogout_RevokesCopiedToken(t *testing.T) {
	db := usersTestDB(t)
	cfg := config.Config{JWTSecret: "test-secret", JWTTTL: time.Hour}
	h := &AuthHandler{DB: db, Cfg: cfg, Log: zap.NewNop()}

	hash, err := auth.HashPassword("ClientPass1")
	if err != nil {
		t.Fatalf("hash password: %v", err)
	}
	user := models.User{Name: "C", Email: "c@example.com", PasswordHash: hash, Role: models.RoleClient}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("seed user: %v", err)
	}

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.POST("/login", h.Login)
	r.POST("/logout", h.Logout)
	r.GET("/me", middleware.RequireAuth(db, cfg.JWTSecret), h.Me)

	login := func() string {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(http.MethodPost, "/login", strings.NewReader(`{"email":"c@example.com","password":"ClientPass1"}`))
		req.Header.Set("Content-Type", "application/json")
		r.ServeHTTP(w, req)
		if w.Code != http.StatusOK {
			t.Fatalf("login: status %d (%s)", w.Code, w.Body.String())
		}
		for _, ck := range w.Result().Cookies() {
			if ck.Name == middleware.CookieName && ck.Value != "" {
				return ck.Value
			}
		}
		t.Fatal("login set no auth cookie")
		return ""
	}
	call := func(method, path, token string) int {
		w := httptest.NewRecorder()
		req := httptest.NewRequest(method, path, nil)
		if token != "" {
			req.AddCookie(&http.Cookie{Name: middleware.CookieName, Value: token})
		}
		r.ServeHTTP(w, req)
		return w.Code
	}

	laptop := login()
	phone := login() // same user, second device

	if got := call(http.MethodGet, "/me", laptop); got != http.StatusOK {
		t.Fatalf("before logout: /me = %d, want 200", got)
	}
	if got := call(http.MethodPost, "/logout", laptop); got != http.StatusOK {
		t.Fatalf("logout = %d, want 200", got)
	}
	if got := call(http.MethodGet, "/me", laptop); got != http.StatusUnauthorized {
		t.Errorf("copied token after logout: /me = %d, want 401", got)
	}
	if got := call(http.MethodGet, "/me", phone); got != http.StatusUnauthorized {
		t.Errorf("other device's token after logout: /me = %d, want 401", got)
	}

	// Replaying the dead token at /logout doesn't bump the counter again,
	// so it can't be used to kill a session started after the logout.
	fresh := login()
	if got := call(http.MethodPost, "/logout", laptop); got != http.StatusOK {
		t.Errorf("logout with an already-revoked token = %d, want 200", got)
	}
	if got := call(http.MethodGet, "/me", fresh); got != http.StatusOK {
		t.Errorf("fresh login after logout: /me = %d, want 200", got)
	}

	// Logout with no cookie at all still succeeds.
	if got := call(http.MethodPost, "/logout", ""); got != http.StatusOK {
		t.Errorf("logout without a cookie = %d, want 200", got)
	}
}
