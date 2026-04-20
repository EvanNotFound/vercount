package app

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync/atomic"
	"time"

	redis "github.com/redis/go-redis/v9"
)

const (
	rateLimitWindow = 60 * time.Second
	rateLimitCount  = int64(80)
)

var suspiciousUA = regexp.MustCompile(`python-requests|python/|requests/|curl/|wget/|go-http-client/|httpie/|postman/|axios/|node-fetch/|empty|unknown|bot|crawl|spider`)

type RateLimitResult struct {
	Success   bool
	Limit     int64
	Reset     int64
	Remaining int64
	Error     string
}

type RateLimiter struct {
	redis   *redis.Client
	log     *Logger
	counter uint64
}

func NewRateLimiter(redisClient *redis.Client, log *Logger) *RateLimiter {
	return &RateLimiter{redis: redisClient, log: log}
}

func (l *RateLimiter) Check(ctx context.Context, r *http.Request) RateLimitResult {
	ip := clientIP(r)
	ua := strings.ToLower(strings.TrimSpace(r.Header.Get("User-Agent")))
	if ua == "" {
		ua = "unknown"
	}

	now := time.Now()
	key := "ratelimit:" + ip
	cutoff := now.Add(-rateLimitWindow).UnixMilli()
	reset := now.Add(rateLimitWindow).UnixMilli()

	var countCmd *redis.IntCmd
	_, err := l.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.ZRemRangeByScore(ctx, key, "-inf", fmt.Sprintf("%d", cutoff))
		countCmd = pipe.ZCard(ctx, key)
		return nil
	})
	if err != nil {
		l.log.Warn("Rate limit cleanup failed", map[string]any{"ip": ip, "error": err.Error()})
		return RateLimitResult{Success: true, Limit: rateLimitCount, Remaining: rateLimitCount, Reset: reset}
	}

	count, err := countCmd.Result()
	if err != nil {
		l.log.Warn("Rate limit count failed", map[string]any{"ip": ip, "error": err.Error()})
		return RateLimitResult{Success: true, Limit: rateLimitCount, Remaining: rateLimitCount, Reset: reset}
	}

	if count >= rateLimitCount {
		l.log.Warn("Rate limit exceeded", map[string]any{"ip": ip, "ua": ua, "limit": rateLimitCount, "remaining": 0})
		return RateLimitResult{
			Success:   false,
			Limit:     rateLimitCount,
			Remaining: 0,
			Reset:     reset,
			Error:     "Rate limit exceeded",
		}
	}

	member := fmt.Sprintf("%d-%d", now.UnixMilli(), atomic.AddUint64(&l.counter, 1))
	_, err = l.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.ZAdd(ctx, key, redis.Z{Score: float64(now.UnixMilli()), Member: member})
		pipe.Expire(ctx, key, rateLimitWindow)
		return nil
	})
	if err != nil {
		l.log.Warn("Rate limit add failed", map[string]any{"ip": ip, "error": err.Error()})
		return RateLimitResult{Success: true, Limit: rateLimitCount, Remaining: rateLimitCount, Reset: reset}
	}

	remaining := rateLimitCount - (count + 1)
	l.log.Info("Request received", map[string]any{"ip": ip, "ua": ua, "path": r.URL.Path, "timestamp": now.UnixMilli()})

	if suspiciousUA.MatchString(ua) {
		l.log.Warn("Suspicious user agent detected", map[string]any{"ip": ip, "ua": ua})
	}

	if remaining < 20 {
		l.log.Warn("Approaching rate limit", map[string]any{"ip": ip, "ua": ua, "remaining": remaining})
	}

	return RateLimitResult{
		Success:   true,
		Limit:     rateLimitCount,
		Remaining: remaining,
		Reset:     reset,
	}
}

func clientIP(r *http.Request) string {
	if forwarded := strings.TrimSpace(r.Header.Get("CF-Connecting-IP")); forwarded != "" {
		return forwarded
	}

	if forwarded := strings.TrimSpace(r.Header.Get("X-Real-IP")); forwarded != "" {
		return forwarded
	}

	if forwarded := strings.TrimSpace(r.Header.Get("X-Forwarded-For")); forwarded != "" {
		parts := strings.Split(forwarded, ",")
		if len(parts) > 0 {
			return strings.TrimSpace(parts[0])
		}
	}

	host, _, err := net.SplitHostPort(strings.TrimSpace(r.RemoteAddr))
	if err == nil && host != "" {
		return host
	}

	return "127.0.0.1"
}
