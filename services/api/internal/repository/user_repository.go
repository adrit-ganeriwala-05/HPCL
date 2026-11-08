// Package repository is the data-access boundary for the onboarding
// subsystem: interfaces here, GORM behind them. The rest of this codebase's
// handlers call *gorm.DB directly (see internal/handlers) — this package is
// a deliberate exception for the OTP/onboarding flow specifically, so
// internal/services.OnboardingService can be unit-tested against a fake
// without touching a database at all, and so the rate-limiting/lockout
// queries live in one auditable place instead of scattered across handlers.
package repository

import (
	"context"
	"errors"

	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"gorm.io/gorm"
)

var ErrNotFound = errors.New("not found")

type UserRepository interface {
	FindByEmail(ctx context.Context, email string) (*models.User, error)
	FindByID(ctx context.Context, id uint) (*models.User, error)
	Create(ctx context.Context, user *models.User) error
	Update(ctx context.Context, user *models.User) error
}

type gormUserRepository struct {
	db *gorm.DB
}

func NewUserRepository(db *gorm.DB) UserRepository {
	return &gormUserRepository{db: db}
}

func (r *gormUserRepository) FindByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *gormUserRepository) FindByID(ctx context.Context, id uint) (*models.User, error) {
	var user models.User
	err := r.db.WithContext(ctx).First(&user, id).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *gormUserRepository) Create(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *gormUserRepository) Update(ctx context.Context, user *models.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}
