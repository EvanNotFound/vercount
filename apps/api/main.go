package main

import (
	"context"
	"errors"
	"net/http"
	"time"

	"github.com/EvanNotFound/vercount/apps/api/internal/app"
	"github.com/EvanNotFound/vercount/apps/api/internal/counter"
	redis "github.com/redis/go-redis/v9"
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
	redisOptions, err := redis.ParseURL(config.RedisURL)
	if err != nil {
		panic(err)
	}
	if redisOptions.DialTimeout == 0 {
		redisOptions.DialTimeout = 5 * time.Second
	}
	if redisOptions.ReadTimeout == 0 {
		redisOptions.ReadTimeout = 3 * time.Second
	}
	if redisOptions.WriteTimeout == 0 {
		redisOptions.WriteTimeout = 3 * time.Second
	}
	if redisOptions.PoolSize == 0 {
		redisOptions.PoolSize = 32
	}
	if redisOptions.MinIdleConns == 0 {
		redisOptions.MinIdleConns = 4
	}

	redisClient := redis.NewClient(redisOptions)
	defer redisClient.Close()

	pingCtx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := redisClient.Ping(pingCtx).Err(); err != nil {
		panic(err)
	}

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

	logger.Info("api server starting", map[string]any{"event": "server.starting", "addr": config.Addr, "script_path": config.ScriptPath})
	if err := httpServer.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("api server stopped unexpectedly", map[string]any{"event": "server.listen_failed", "error": err.Error()})
		panic(err)
	}
}
