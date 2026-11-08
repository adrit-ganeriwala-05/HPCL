package repository

import (
	"context"
	"errors"

	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"gorm.io/gorm"
)

type AddressRepository interface {
	Create(ctx context.Context, addr *models.Address) error
	ListByUser(ctx context.Context, userID uint) ([]models.Address, error)
	FindByIDAndUser(ctx context.Context, id, userID uint) (*models.Address, error)
	Update(ctx context.Context, addr *models.Address) error
	Delete(ctx context.Context, addr *models.Address) error

	// ClearDefaultForUser unsets IsDefault on every address for this user
	// except keepID — called before setting a new default so exactly one
	// address is ever IsDefault=true at a time. Pass 0 to clear all.
	ClearDefaultForUser(ctx context.Context, userID, keepID uint) error
}

type gormAddressRepository struct {
	db *gorm.DB
}

func NewAddressRepository(db *gorm.DB) AddressRepository {
	return &gormAddressRepository{db: db}
}

func (r *gormAddressRepository) Create(ctx context.Context, addr *models.Address) error {
	return r.db.WithContext(ctx).Create(addr).Error
}

func (r *gormAddressRepository) ListByUser(ctx context.Context, userID uint) ([]models.Address, error) {
	var addrs []models.Address
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).Order("is_default DESC, created_at").Find(&addrs).Error
	return addrs, err
}

func (r *gormAddressRepository) FindByIDAndUser(ctx context.Context, id, userID uint) (*models.Address, error) {
	var addr models.Address
	err := r.db.WithContext(ctx).Where("id = ? AND user_id = ?", id, userID).First(&addr).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &addr, nil
}

func (r *gormAddressRepository) Update(ctx context.Context, addr *models.Address) error {
	return r.db.WithContext(ctx).Save(addr).Error
}

func (r *gormAddressRepository) Delete(ctx context.Context, addr *models.Address) error {
	return r.db.WithContext(ctx).Delete(addr).Error
}

func (r *gormAddressRepository) ClearDefaultForUser(ctx context.Context, userID, keepID uint) error {
	return r.db.WithContext(ctx).Model(&models.Address{}).
		Where("user_id = ? AND id <> ? AND is_default = ?", userID, keepID, true).
		UpdateColumn("is_default", false).Error
}
