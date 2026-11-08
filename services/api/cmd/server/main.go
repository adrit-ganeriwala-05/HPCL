package main

import (
	"github.com/jpganeriwala-hpcl/services/api/internal/config"
	"github.com/jpganeriwala-hpcl/services/api/internal/database"
	"github.com/jpganeriwala-hpcl/services/api/internal/routes"
	"go.uber.org/zap"
)

func main() {
	logger, err := zap.NewProduction()
	if err != nil {
		panic(err)
	}
	defer logger.Sync()

	cfg := config.Load()
	if cfg.JWTSecret == "" {
		logger.Fatal("JWT_SECRET is not set — refusing to start")
	}
	if cfg.OTPPepper == "" {
		logger.Fatal("OTP_PEPPER is not set — refusing to start")
	}

	db, err := database.Connect(cfg, logger)
	if err != nil {
		logger.Fatal("failed to bootstrap database", zap.Error(err))
	}

	router := routes.Setup(db, cfg, logger)

	logger.Info("server starting", zap.String("port", cfg.Port))
	if err := router.Run(":" + cfg.Port); err != nil {
		logger.Fatal("server exited", zap.Error(err))
	}
}
