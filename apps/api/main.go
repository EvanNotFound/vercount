package main

import (
	"errors"
	"net/http"
	"time"

	"github.com/EvanNotFound/vercount/apps/api/internal/app"
	"github.com/EvanNotFound/vercount/apps/api/internal/counter"
	"github.com/EvanNotFound/vercount/apps/api/internal/redis"
)

func main() {
	if err := app.LoadEnvFile(".env"); err != nil {
		panic(err)
	}
	if err := app.LoadEnvFile("../../.env"); err != nil {
		panic(err)
	}

	config, err := app.LoadConfig()
	if err != nil {
		panic(err)
	}

	logger := app.NewLogger(config.Debug)
	redisClient, err := redis.New(config.RedisURL)
	if err != nil {
		panic(err)
	}
	defer redisClient.Close()

	server := app.NewServer(
		config,
		logger,
		counter.NewService(redisClient, logger),
		redisClient,
	)

	httpServer := &http.Server{
		Addr:              config.Addr,
		Handler:           server.Routes(),
		ReadHeaderTimeout: 5 * time.Second,
	}

	logger.Info("Starting API server", map[string]any{"addr": config.Addr, "script_path": config.ScriptPath})
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		panic(err)
	}
}
