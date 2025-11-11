package app

import (
	"fmt"
	"log"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/rnegic/synchronous/internal/config"
	gormRepo "github.com/rnegic/synchronous/internal/repository/gorm"
	"github.com/rnegic/synchronous/internal/router"
	"github.com/rnegic/synchronous/internal/service"
	"github.com/rnegic/synchronous/internal/transport/http/middleware"
	v1 "github.com/rnegic/synchronous/internal/transport/http/v1"
	"github.com/rnegic/synchronous/pkg/jwt"
)

type App struct {
}

func New() *App {
	return &App{}
}

func (a *App) Run() error {
	cfg := config.New()

	err := cfg.Load("configs/config.toml")
	if err != nil {
		return fmt.Errorf("error with config: %v", err)
	}

	// Инициализация подключения к БД
	dsn := cfg.BuildDSN()
	db, err := gormRepo.InitDB(dsn)
	if err != nil {
		return fmt.Errorf("failed to initialize database: %v", err)
	}
	defer func() {
		if err := gormRepo.Close(); err != nil {
			log.Printf("Error closing database: %v", err)
		}
	}()

	// Автомиграция моделей (опционально, если не используем goose)
	// err = db.AutoMigrate(
	// 	&entity.User{},
	// 	&entity.UserStats{},
	// 	&entity.Session{},
	// 	&entity.Participant{},
	// 	&entity.Task{},
	// 	&entity.Message{},
	// )
	// if err != nil {
	// 	return fmt.Errorf("failed to run migrations: %v", err)
	// }

	// Инициализация репозиториев
	userRepo := gormRepo.NewUserRepository(db)
	sessionRepo := gormRepo.NewSessionRepository(db)
	taskRepo := gormRepo.NewTaskRepository(db)
	messageRepo := gormRepo.NewMessageRepository(db)
	leaderboardRepo := gormRepo.NewLeaderboardRepository(db)

	// Инициализация Max API клиента и сервиса
	maxAPIService := service.NewMaxAPIService(cfg.MaxAPI.BaseURL, cfg.MaxAPI.AccessToken)

	// Инициализация JWT менеджера
	tokenManager := jwt.NewTokenManager(
		cfg.App.JWTSecret,
		time.Duration(cfg.App.JWTTTL)*time.Second,
		time.Duration(cfg.App.RefreshTTL)*time.Second,
	)

	// Инициализация сервисов
	authService := service.NewAuthService(userRepo, tokenManager, cfg.MaxAPI.BotToken)
	userService := service.NewUserService(userRepo)
	sessionService := service.NewSessionService(sessionRepo, taskRepo, userRepo, maxAPIService)
	messageService := service.NewMessageService(sessionService, maxAPIService, userRepo, messageRepo)
	leaderboardService := service.NewLeaderboardService(leaderboardRepo, sessionRepo, userRepo)

	// Инициализация handlers
	baseHandler := v1.NewBaseHandler()

	authHandler := v1.NewAuthHandler(baseHandler, authService, tokenManager)
	userHandler := v1.NewUserHandler(baseHandler, userService)
	sessionHandler := v1.NewSessionHandler(baseHandler, sessionService, messageService, leaderboardService)

	// Инициализация роутера на gin
	appRouter := router.New()

	// Health check endpoint (публичный)
	appRouter.GET("/api/v1/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "synchronous-backend",
		})
	})

	// API v1 группа
	api := appRouter.Group("/api/v1")
	{
		// Публичные routes (без аутентификации)
		authHandler.RegisterRoutes(api)

		// Защищенные routes (с аутентификацией)
		protected := api.Group("")
		protected.Use(middleware.AuthMiddleware(authService))
		{
			userHandler.RegisterRoutes(protected)
			sessionHandler.RegisterRoutes(protected)
		}
	}

	appRouter.StaticFile("/swagger.yaml", "./swagger.yaml")
	appRouter.StaticFile("/swagger.json", "./swagger.yaml") // В реальности нужно конвертировать YAML в JSON

	fmt.Printf("Server starting on %s\n", cfg.Server.Address)
	err = appRouter.Run(cfg.Server.Address)
	if err != nil {
		return err
	}

	return nil
}
