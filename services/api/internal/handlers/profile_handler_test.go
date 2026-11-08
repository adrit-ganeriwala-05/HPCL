package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

// updateProfileAs runs UpdateProfile for the given user with a JSON body,
// the same way an authenticated PUT /api/profile would.
func updateProfileAs(t *testing.T, h *ProfileHandler, userID uint, body map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	payload, _ := json.Marshal(body)
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(http.MethodPut, "/profile", bytes.NewReader(payload))
	c.Request.Header.Set("Content-Type", "application/json")
	// Same context keys middleware.RequireAuth sets for a logged-in user.
	c.Set("userID", userID)
	c.Set("role", models.RoleClient)
	h.UpdateProfile(c)
	return w
}

func TestUpdateProfile_Phone(t *testing.T) {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory test db: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}); err != nil {
		t.Fatalf("failed to migrate test schema: %v", err)
	}
	h := &ProfileHandler{DB: db, Log: zap.NewNop()}

	user := models.User{Name: "Test Client", Email: "client@example.com", Role: models.RoleClient}
	if err := db.Create(&user).Error; err != nil {
		t.Fatalf("failed to seed user: %v", err)
	}

	storedPhone := func() string {
		var u models.User
		if err := db.First(&u, user.ID).Error; err != nil {
			t.Fatalf("failed to reload user: %v", err)
		}
		return u.Phone
	}

	// Valid number is saved (trimmed) and returned in the response.
	w := updateProfileAs(t, h, user.ID, map[string]string{"name": "Test Client", "phone": "  +91 98765 43210 "})
	if w.Code != http.StatusOK {
		t.Fatalf("valid phone: status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
	var resp userPublic
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("could not decode response: %v", err)
	}
	if resp.Phone != "+91 98765 43210" {
		t.Errorf("response phone = %q, want %q", resp.Phone, "+91 98765 43210")
	}
	if got := storedPhone(); got != "+91 98765 43210" {
		t.Errorf("stored phone = %q, want %q", got, "+91 98765 43210")
	}

	// Invalid number is rejected and the saved one is left alone.
	w = updateProfileAs(t, h, user.ID, map[string]string{"name": "Test Client", "phone": "call me maybe"})
	if w.Code != http.StatusBadRequest {
		t.Errorf("invalid phone: status = %d, want 400", w.Code)
	}
	if got := storedPhone(); got != "+91 98765 43210" {
		t.Errorf("invalid phone overwrote stored value: got %q", got)
	}

	// Empty clears it (phone is optional).
	w = updateProfileAs(t, h, user.ID, map[string]string{"name": "Test Client", "phone": ""})
	if w.Code != http.StatusOK {
		t.Fatalf("empty phone: status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
	if got := storedPhone(); got != "" {
		t.Errorf("empty phone: stored = %q, want empty", got)
	}
}
