package handlers

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strconv"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/glebarez/sqlite"
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/gorm"
)

func usersTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	if err != nil {
		t.Fatalf("failed to open in-memory test db: %v", err)
	}
	if err := db.AutoMigrate(&models.User{}); err != nil {
		t.Fatalf("failed to migrate test schema: %v", err)
	}
	return db
}

func jsonContext(t *testing.T, method, path string, body any) (*gin.Context, *httptest.ResponseRecorder) {
	t.Helper()
	payload, _ := json.Marshal(body)
	gin.SetMode(gin.TestMode)
	w := httptest.NewRecorder()
	c, _ := gin.CreateTestContext(w)
	c.Request = httptest.NewRequest(method, path, bytes.NewReader(payload))
	c.Request.Header.Set("Content-Type", "application/json")
	return c, w
}

func updateClient(t *testing.T, h *ClientHandler, id uint, body map[string]string) *httptest.ResponseRecorder {
	t.Helper()
	c, w := jsonContext(t, http.MethodPut, "/clients/"+strconv.FormatUint(uint64(id), 10), body)
	c.Params = gin.Params{{Key: "id", Value: strconv.FormatUint(uint64(id), 10)}}
	h.Update(c)
	return w
}

func TestClientUpdate(t *testing.T) {
	db := usersTestDB(t)
	h := &ClientHandler{DB: db, Log: zap.NewNop()}

	client := models.User{Name: "Old Name", Email: "client@example.com", Role: models.RoleClient}
	admin := models.User{Name: "Owner", Email: "admin@example.com", Role: models.RoleAdmin}
	for _, u := range []*models.User{&client, &admin} {
		if err := db.Create(u).Error; err != nil {
			t.Fatalf("failed to seed user: %v", err)
		}
	}
	reload := func(id uint) models.User {
		var u models.User
		if err := db.First(&u, id).Error; err != nil {
			t.Fatalf("failed to reload user: %v", err)
		}
		return u
	}

	// Staff can update a client's contact details, including phone.
	w := updateClient(t, h, client.ID, map[string]string{
		"name": " New Name ", "contactPerson": "Ravi", "companyName": "Andal Steel", "phone": " 0341 225 0000 ",
		"email": "hijack@example.com", // ignored: not part of the request type
	})
	if w.Code != http.StatusOK {
		t.Fatalf("update: status = %d, want 200 (body: %s)", w.Code, w.Body.String())
	}
	got := reload(client.ID)
	if got.Name != "New Name" || got.ContactPerson != "Ravi" || got.CompanyName != "Andal Steel" || got.Phone != "0341 225 0000" {
		t.Errorf("client not updated as expected: %+v", got)
	}
	if got.Email != "client@example.com" {
		t.Errorf("email must not be editable here, got %q", got.Email)
	}

	// Bad phone is rejected and nothing is saved.
	w = updateClient(t, h, client.ID, map[string]string{"name": "Other", "phone": "not-a-phone!"})
	if w.Code != http.StatusBadRequest {
		t.Errorf("bad phone: status = %d, want 400", w.Code)
	}
	if reload(client.ID).Name != "New Name" {
		t.Error("bad phone request still changed the client")
	}

	// A staff account can't be edited through the clients endpoint.
	w = updateClient(t, h, admin.ID, map[string]string{"name": "Renamed Admin"})
	if w.Code != http.StatusNotFound {
		t.Errorf("admin id: status = %d, want 404", w.Code)
	}
	if reload(admin.ID).Name != "Owner" {
		t.Error("admin account was renamed through the clients endpoint")
	}

	// Unknown id is a 404 too.
	if w := updateClient(t, h, 9999, map[string]string{"name": "Ghost"}); w.Code != http.StatusNotFound {
		t.Errorf("unknown id: status = %d, want 404", w.Code)
	}
}

func TestRegister_Phone(t *testing.T) {
	db := usersTestDB(t)
	h := &AuthHandler{DB: db, Cfg: config.Config{JWTSecret: "test-secret", JWTTTL: time.Hour}, Log: zap.NewNop()}

	register := func(email, phone string) *httptest.ResponseRecorder {
		c, w := jsonContext(t, http.MethodPost, "/auth/register", map[string]string{
			"name": "New Client", "email": email, "password": "password123", "phone": phone,
		})
		h.Register(c)
		return w
	}

	// Phone given at sign-up is saved.
	if w := register("a@example.com", "+91 98765 43210"); w.Code != http.StatusCreated {
		t.Fatalf("with phone: status = %d, want 201 (body: %s)", w.Code, w.Body.String())
	}
	var a models.User
	db.Where("email = ?", "a@example.com").First(&a)
	if a.Phone != "+91 98765 43210" {
		t.Errorf("stored phone = %q, want %q", a.Phone, "+91 98765 43210")
	}

	// Phone is optional.
	if w := register("b@example.com", ""); w.Code != http.StatusCreated {
		t.Errorf("without phone: status = %d, want 201 (body: %s)", w.Code, w.Body.String())
	}

	// Invalid phone is rejected before an account is created.
	if w := register("c@example.com", "12"); w.Code != http.StatusBadRequest {
		t.Errorf("bad phone: status = %d, want 400", w.Code)
	}
	var count int64
	db.Model(&models.User{}).Where("email = ?", "c@example.com").Count(&count)
	if count != 0 {
		t.Error("account was created despite an invalid phone")
	}
}
