// Command seed provisions the first admin account. Public registration
// (POST /api/auth/register) always creates 'client' role users by design —
// this is the only path that mints an admin.
//
// Usage: go run ./cmd/seed -email admin@jpganeriwala-hpcl.com -password <pw> -name "Admin"
package main

import (
	"flag"
	"fmt"
	"os"

	"github.com/jpganeriwala-hpcl/services/api/internal/auth"
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/database"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
)

func main() {
	name := flag.String("name", "", "admin full name")
	email := flag.String("email", "", "admin email")
	password := flag.String("password", "", "admin password (min 8 chars)")
	flag.Parse()

	if *name == "" || *email == "" || len(*password) < 8 {
		fmt.Println("usage: go run ./cmd/seed -name \"Admin\" -email admin@example.com -password <min-8-chars>")
		os.Exit(1)
	}

	logger, _ := zap.NewProduction()
	defer logger.Sync()

	cfg := config.Load()
	db, err := database.Connect(cfg, logger)
	if err != nil {
		logger.Fatal("failed to connect to database", zap.Error(err))
	}

	hash, err := auth.HashPassword(*password)
	if err != nil {
		logger.Fatal("failed to hash password", zap.Error(err))
	}

	admin := models.User{
		Name:         *name,
		Email:        *email,
		PasswordHash: hash,
		Role:         models.RoleAdmin,
	}

	if err := db.Create(&admin).Error; err != nil {
		logger.Fatal("failed to create admin user", zap.Error(err))
	}

	fmt.Printf("admin created: id=%d email=%s\n", admin.ID, admin.Email)
}
