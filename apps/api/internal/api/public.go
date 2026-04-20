package api

import (
	"context"
	"encoding/json"
	"net/http"
	"os"
	"path/filepath"
	"time"

	redis "github.com/redis/go-redis/v9"
)

const publicServiceName = "vercount-events-api"

type Logger interface {
	Debug(message string, data any)
	Info(message string, data any)
	Warn(message string, data any)
	Error(message string, data any)
}

type PublicHandler struct {
	scriptPath string
	log        Logger
	redis      *redis.Client
}

func NewPublicHandler(scriptPath string, log Logger, redisClient *redis.Client) *PublicHandler {
	return &PublicHandler{scriptPath: scriptPath, log: log, redis: redisClient}
}

func (h *PublicHandler) Root(w http.ResponseWriter, _ *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"service": publicServiceName,
		"description": "Straightforward, Fast, and Reliable Website Visitor Counter.",
		"status":  "ok",
		"routes": []string{
			"/",
			"/healthz",
			"/js",
			// "/log", deprecated
			"/api/v1/log",
			"/api/v2/log",
		},
		"github": "https://github.com/EvanNotFound/vercount",
		"homepage": "https://www.vercount.one",
	})
}

func (h *PublicHandler) Healthz(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
	defer cancel()

	if err := h.redis.Ping(ctx).Err(); err != nil {
		h.log.Warn("redis readiness check failed", map[string]any{"event": "healthz.redis_unreachable", "error": err.Error()})
		writeJSON(w, http.StatusServiceUnavailable, map[string]any{
			"service": publicServiceName,
			"status":  "not_ready",
			"dependencies": map[string]string{
				"redis": "unreachable",
			},
			"error": "Redis unavailable",
		})
		return
	}

	writeJSON(w, http.StatusOK, map[string]any{
		"service": publicServiceName,
		"status":  "ready",
		"dependencies": map[string]string{
			"redis": "ok",
		},
	})
}

func (h *PublicHandler) Script(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)
	w.Header().Set("Cache-Control", "public, s-maxage=86400, max-age=86400")
	w.Header().Set("Vercel-CDN-Cache-Control", "max-age=3600")

	fullPath := filepath.Clean(h.scriptPath)
	if _, err := os.Stat(fullPath); err != nil {
		h.log.Error("script file not found", map[string]any{"event": "script.not_found", "path": fullPath, "error": err.Error()})
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	http.ServeFile(w, r, fullPath)
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func applyCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, DELETE, PATCH, POST, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Browser-Token")
	w.Header().Set("Access-Control-Max-Age", "86400")
}
