package repository

import (
	"context"
	"errors"
	"time"

	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"gorm.io/gorm"
)

type OTPRepository interface {
	Create(ctx context.Context, otp *models.OTPVerification) error

	// FindLatestActive returns the most recent row for identifier that
	// hasn't been consumed and hasn't expired — the one row VerifyOTP is
	// allowed to check a guess against. Returns ErrNotFound if there
	// isn't one (caller should treat that as "request a new code").
	FindLatestActive(ctx context.Context, identifier string) (*models.OTPVerification, error)

	// CountByIdentifierSince and CountByIPSince back the two halves of the
	// rate limit — per-identifier (can't hammer one email) and per-IP
	// (can't rotate through many identifiers from one source)
	// respectively. Both count *requests*, i.e. every row created, not
	// just failed ones.
	CountByIdentifierSince(ctx context.Context, identifier string, since time.Time) (int64, error)
	CountByIPSince(ctx context.Context, ip string, since time.Time) (int64, error)

	IncrementAttempts(ctx context.Context, id uint) error
	MarkConsumed(ctx context.Context, id uint) error
}

type gormOTPRepository struct {
	db *gorm.DB
}

func NewOTPRepository(db *gorm.DB) OTPRepository {
	return &gormOTPRepository{db: db}
}

func (r *gormOTPRepository) Create(ctx context.Context, otp *models.OTPVerification) error {
	return r.db.WithContext(ctx).Create(otp).Error
}

func (r *gormOTPRepository) FindLatestActive(ctx context.Context, identifier string) (*models.OTPVerification, error) {
	var otp models.OTPVerification
	err := r.db.WithContext(ctx).
		Where("identifier = ? AND consumed_at IS NULL AND expires_at > ?", identifier, time.Now().UTC()).
		Order("created_at DESC").
		First(&otp).Error
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, ErrNotFound
	}
	if err != nil {
		return nil, err
	}
	return &otp, nil
}

func (r *gormOTPRepository) CountByIdentifierSince(ctx context.Context, identifier string, since time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.OTPVerification{}).
		Where("identifier = ? AND created_at > ?", identifier, since).
		Count(&count).Error
	return count, err
}

func (r *gormOTPRepository) CountByIPSince(ctx context.Context, ip string, since time.Time) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).Model(&models.OTPVerification{}).
		Where("request_ip = ? AND created_at > ?", ip, since).
		Count(&count).Error
	return count, err
}

func (r *gormOTPRepository) IncrementAttempts(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.OTPVerification{}).
		Where("id = ?", id).
		UpdateColumn("attempts", gorm.Expr("attempts + 1")).Error
}

func (r *gormOTPRepository) MarkConsumed(ctx context.Context, id uint) error {
	return r.db.WithContext(ctx).Model(&models.OTPVerification{}).
		Where("id = ?", id).
		UpdateColumn("consumed_at", time.Now().UTC()).Error
}
