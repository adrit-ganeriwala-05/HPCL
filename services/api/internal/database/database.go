package database

import (
	"fmt"
	"time"

	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/models"
	"go.uber.org/zap"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	gormlogger "gorm.io/gorm/logger"
)

// Connect opens the PostgreSQL connection, tunes the pool, enables PostGIS,
// and runs AutoMigrate for the core schema. It is the single source of truth
// for DB bootstrapping — every service in the monorepo should call this.
func Connect(cfg config.Config, logger *zap.Logger) (*gorm.DB, error) {
	db, err := gorm.Open(postgres.Open(cfg.DatabaseURL), &gorm.Config{
		Logger: gormlogger.Default.LogMode(gormlogger.Warn),
		// GORM's default is local time; every query compares against
		// time.Now().UTC(), so keep CreatedAt/UpdatedAt in UTC too.
		NowFunc: func() time.Time { return time.Now().UTC() },
	})
	if err != nil {
		return nil, fmt.Errorf("connect postgres: %w", err)
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, fmt.Errorf("get underlying sql.DB: %w", err)
	}

	// Pool sizing tuned for a single-instance high-concurrency Gin service;
	// revisit once horizontal scaling / pgbouncer is in front of this.
	sqlDB.SetMaxOpenConns(50)
	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetConnMaxLifetime(30 * time.Minute)
	sqlDB.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.Exec(`CREATE EXTENSION IF NOT EXISTS postgis`).Error; err != nil {
		logger.Warn("postgis extension not enabled — geospatial columns unavailable", zap.Error(err))
	}

	// AutoMigrate adds missing check constraints but won't rewrite an
	// existing one's body when a Go-side enum grows (e.g. Role gaining
	// 'employee') — the constraint just keeps enforcing the old value list
	// forever. Drop the ones we know can change before migrating so they
	// get recreated fresh from the current struct tags every boot.
	for _, stmt := range []string{
		`ALTER TABLE users DROP CONSTRAINT IF EXISTS chk_users_role`,
		`ALTER TABLE orders DROP CONSTRAINT IF EXISTS chk_orders_status`,
		// PasswordHash went from required to optional — OTP-onboarded
		// clients never set one (see models.User's doc comment). GORM's
		// AutoMigrate doesn't reliably relax an existing NOT NULL on its
		// own, so this is explicit rather than assumed.
		`ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL`,
		// Phone verification was SMS/Twilio-based and has been removed —
		// AutoMigrate never drops columns on its own, so this is explicit
		// rather than left as an orphaned, unreadable column. (users.phone
		// itself is back as a plain contact field, so it must NOT be
		// dropped here — this runs on every boot and would wipe it.)
		`ALTER TABLE users DROP COLUMN IF EXISTS phone_verified`,
		// OTPVerification lost its purpose/user_id columns once phone
		// verification (the only other purpose besides email auth) was
		// removed — same reasoning.
		`ALTER TABLE otp_verifications DROP COLUMN IF EXISTS purpose`,
		`ALTER TABLE otp_verifications DROP COLUMN IF EXISTS user_id`,
	} {
		if err := db.Exec(stmt).Error; err != nil {
			logger.Warn("could not run pre-migrate schema fixup", zap.String("stmt", stmt), zap.Error(err))
		}
	}

	if err := db.AutoMigrate(
		&models.User{},
		&models.Product{},
		&models.Order{},
		&models.OrderItem{},
		&models.DeliveryLog{},
		&models.Lead{},
		&models.OTPVerification{},
		&models.Address{},
		&models.InventoryStock{},
		&models.InventoryTransaction{},
	); err != nil {
		return nil, fmt.Errorf("automigrate: %w", err)
	}

	logger.Info("database connected and migrated",
		zap.Int("max_open_conns", 50),
		zap.Int("max_idle_conns", 10),
	)

	return db, nil
}
