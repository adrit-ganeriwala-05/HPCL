package routes

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestSPAHandler(t *testing.T) {
	dir := t.TempDir()
	if err := os.MkdirAll(filepath.Join(dir, "assets"), 0o755); err != nil {
		t.Fatal(err)
	}
	os.WriteFile(filepath.Join(dir, "index.html"), []byte("<html>app</html>"), 0o644)
	os.WriteFile(filepath.Join(dir, "assets", "app-abc123.js"), []byte("console.log(1)"), 0o644)

	gin.SetMode(gin.TestMode)
	r := gin.New()
	r.Use(securityHeaders())
	r.GET("/api/health", func(c *gin.Context) { c.JSON(http.StatusOK, gin.H{"status": "ok"}) })
	r.NoRoute(spaHandler(dir))

	do := func(method, path string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		r.ServeHTTP(w, httptest.NewRequest(method, path, nil))
		return w
	}

	tests := []struct {
		name, method, path string
		wantCode           int
		wantBody           string
		wantCache          string
		wantCSP            bool
	}{
		{"root serves the app", "GET", "/", 200, "<html>app</html>", "no-cache", false},
		{"deep link falls back to the app", "GET", "/portal/addresses", 200, "<html>app</html>", "no-cache", false},
		{"fingerprinted asset, cached long", "GET", "/assets/app-abc123.js", 200, "console.log(1)", "public, max-age=31536000, immutable", false},
		{"real API route untouched", "GET", "/api/health", 200, `"status":"ok"`, "", true},
		{"unknown API path stays JSON 404", "GET", "/api/nope", 404, `"error":"not found"`, "", true},
		{"non-GET to a page path is 404", "POST", "/portal", 404, `"error":"not found"`, "", true},
		// Go's file server refuses any URL containing ".." outright.
		{"path traversal is refused", "GET", "/../../etc/passwd", 400, "invalid URL path", "", false},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			w := do(tt.method, tt.path)
			if w.Code != tt.wantCode {
				t.Errorf("status = %d, want %d", w.Code, tt.wantCode)
			}
			if !strings.Contains(w.Body.String(), tt.wantBody) {
				t.Errorf("body = %q, want it to contain %q", w.Body.String(), tt.wantBody)
			}
			if got := w.Header().Get("Cache-Control"); got != tt.wantCache {
				t.Errorf("Cache-Control = %q, want %q", got, tt.wantCache)
			}
			if got := w.Header().Get("Content-Security-Policy") != ""; got != tt.wantCSP {
				t.Errorf("CSP present = %v, want %v", got, tt.wantCSP)
			}
		})
	}
}
