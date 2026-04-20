package api

import (
	"context"
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"net/url"
	"regexp"
	"strings"
	"sync/atomic"
	"time"

	"github.com/EvanNotFound/vercount/apps/api/internal/counter"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	redis "github.com/redis/go-redis/v9"
)

const (
	rateLimitWindow = 60 * time.Second
	rateLimitCount  = int64(80)
)

var suspiciousUA = regexp.MustCompile(`python-requests|python/|requests/|curl/|wget/|go-http-client/|httpie/|postman/|axios/|node-fetch/|empty|unknown|bot|crawl|spider`)

type LogHandler struct {
	log     Logger
	counter *counter.Service
	limit   *rateLimiter
}

type countRequest struct {
	URL     string `json:"url"`
	IsNewUV bool   `json:"isNewUv"`
}

type CounterData struct {
	SiteUV int64 `json:"site_uv"`
	SitePV int64 `json:"site_pv"`
	PagePV int64 `json:"page_pv"`
}

type SuccessResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

type ErrorResponse struct {
	Status  string         `json:"status"`
	Message string         `json:"message"`
	Code    int            `json:"code"`
	Details map[string]any `json:"details,omitempty"`
}

type targetURL struct {
	Host string
	Path string
}

type rateLimitResult struct {
	Success   bool
	Limit     int64
	Reset     int64
	Remaining int64
	Error     string
}

type rateLimiter struct {
	redis   *redis.Client
	log     Logger
	counter uint64
}

func NewLogHandler(log Logger, counterService *counter.Service, redisClient *redis.Client) *LogHandler {
	return &LogHandler{
		log:     log,
		counter: counterService,
		limit:   &rateLimiter{redis: redisClient, log: log},
	}
}

func (h *LogHandler) V1Options(w http.ResponseWriter, _ *http.Request) {
	applyCORSHeaders(w)
	writeJSON(w, http.StatusOK, map[string]string{"message": "OK"})
}

func (h *LogHandler) V2Options(w http.ResponseWriter, _ *http.Request) {
	applyCORSHeaders(w)
	writeJSON(w, http.StatusOK, SuccessResponse{
		Status:  "success",
		Message: "CORS preflight successful",
		Data:    map[string]string{"message": "OK"},
	})
}

func (h *LogHandler) V1Get(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)
	if !h.allowV1Request(w, r) {
		return
	}

	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		h.log.Warn("missing tracked url parameter", requestLogFields(r, "request.invalid", map[string]any{"status": http.StatusBadRequest, "reason": "missing_url"}))
		writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing url parameter"})
		return
	}

	target, message := validateTargetURL(targetURL)
	if message != "" {
		h.log.Warn("invalid tracked url", requestLogFields(r, "target_url.invalid", map[string]any{"status": http.StatusOK, "target_url": targetURL, "reason": message}))
		writeJSON(w, http.StatusOK, map[string]any{
			"error":   message,
			"site_uv": 0,
			"site_pv": 0,
			"page_pv": 0,
		})
		return
	}

	data, err := h.readCounts(r.Context(), target.Host, target.Path)
	if err != nil {
		h.log.Error("counter read failed", requestLogFields(r, "counter.read_failed", map[string]any{"status": http.StatusInternalServerError, "error": err.Error(), "target_url": targetURL}))
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		return
	}

	h.log.Debug("counter read completed", requestLogFields(r, "counter.read_completed", map[string]any{"host": target.Host, "target_path": target.Path, "site_uv": data.SiteUV, "site_pv": data.SitePV, "page_pv": data.PagePV}))
	writeJSON(w, http.StatusOK, data)
}

func (h *LogHandler) V1Post(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)
	if !h.allowV1Request(w, r) {
		return
	}

	data, ok := h.decodeCountRequest(w, r, false)
	if !ok {
		return
	}

	target, message := validateTargetURL(data.URL)
	if message != "" {
		h.log.Warn("invalid tracked url", requestLogFields(r, "target_url.invalid", map[string]any{"status": http.StatusOK, "target_url": data.URL, "reason": message}))
		writeJSON(w, http.StatusOK, map[string]any{
			"error":   message,
			"site_uv": 0,
			"site_pv": 0,
			"page_pv": 0,
		})
		return
	}

	counts, err := h.writeCounts(r.Context(), target.Host, target.Path, data.IsNewUV)
	if err != nil {
		h.log.Error("counter update failed", requestLogFields(r, "counter.write_failed", map[string]any{"status": http.StatusInternalServerError, "error": err.Error(), "target_url": data.URL}))
		writeJSON(w, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		return
	}

	h.log.Debug("counter update completed", requestLogFields(r, "counter.write_completed", map[string]any{"host": target.Host, "target_path": target.Path, "is_new_uv": data.IsNewUV, "site_uv": counts.SiteUV, "site_pv": counts.SitePV, "page_pv": counts.PagePV}))
	writeJSON(w, http.StatusOK, counts)
}

func (h *LogHandler) V2Get(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)
	if !h.allowV2Request(w, r) {
		return
	}

	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		h.log.Warn("missing tracked url parameter", requestLogFields(r, "request.invalid", map[string]any{"status": http.StatusBadRequest, "reason": "missing_url"}))
		h.writeV2Error(w, http.StatusBadRequest, "Missing url parameter", nil)
		return
	}

	target, message := validateTargetURL(targetURL)
	if message != "" {
		h.log.Warn("invalid tracked url", requestLogFields(r, "target_url.invalid", map[string]any{"status": http.StatusOK, "target_url": targetURL, "reason": message}))
		h.writeV2Success(w, http.StatusOK, message, zeroCounters())
		return
	}

	data, err := h.readCounts(r.Context(), target.Host, target.Path)
	if err != nil {
		h.log.Error("counter read failed", requestLogFields(r, "counter.read_failed", map[string]any{"status": http.StatusInternalServerError, "error": err.Error(), "target_url": targetURL}))
		h.writeV2Error(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	h.log.Debug("counter read completed", requestLogFields(r, "counter.read_completed", map[string]any{"host": target.Host, "target_path": target.Path, "site_uv": data.SiteUV, "site_pv": data.SitePV, "page_pv": data.PagePV}))
	h.writeV2Success(w, http.StatusOK, "Data retrieved successfully", data)
}

func (h *LogHandler) V2Post(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)
	if !h.allowV2Request(w, r) {
		return
	}

	data, ok := h.decodeCountRequest(w, r, true)
	if !ok {
		return
	}

	target, message := validateTargetURL(data.URL)
	if message != "" {
		h.log.Warn("invalid tracked url", requestLogFields(r, "target_url.invalid", map[string]any{"status": http.StatusOK, "target_url": data.URL, "reason": message}))
		h.writeV2Success(w, http.StatusOK, message, zeroCounters())
		return
	}

	counts, err := h.writeCounts(r.Context(), target.Host, target.Path, data.IsNewUV)
	if err != nil {
		h.log.Error("counter update failed", requestLogFields(r, "counter.write_failed", map[string]any{"status": http.StatusInternalServerError, "error": err.Error(), "target_url": data.URL}))
		h.writeV2Error(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	h.log.Debug("counter update completed", requestLogFields(r, "counter.write_completed", map[string]any{"host": target.Host, "target_path": target.Path, "is_new_uv": data.IsNewUV, "site_uv": counts.SiteUV, "site_pv": counts.SitePV, "page_pv": counts.PagePV}))
	h.writeV2Success(w, http.StatusOK, "Data updated successfully", counts)
}

func (h *LogHandler) allowV1Request(w http.ResponseWriter, r *http.Request) bool {
	result := h.limit.Check(r.Context(), r)
	if !result.Success {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": result.Error})
		return false
	}

	return true
}

func (h *LogHandler) allowV2Request(w http.ResponseWriter, r *http.Request) bool {
	result := h.limit.Check(r.Context(), r)
	if !result.Success {
		h.writeV2Error(w, http.StatusTooManyRequests, result.Error, map[string]any{
			"limit":     result.Limit,
			"remaining": result.Remaining,
		})
		return false
	}

	return true
}

func (h *LogHandler) decodeCountRequest(w http.ResponseWriter, r *http.Request, v2 bool) (countRequest, bool) {
	var data countRequest
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		h.log.Warn("invalid JSON request body", requestLogFields(r, "request.invalid", map[string]any{"status": http.StatusBadRequest, "reason": "invalid_json", "error": err.Error()}))
		if v2 {
			h.writeV2Error(w, http.StatusBadRequest, "Invalid JSON body", nil)
		} else {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON body"})
		}
		return countRequest{}, false
	}

	if data.URL == "" {
		h.log.Warn("missing tracked url parameter", requestLogFields(r, "request.invalid", map[string]any{"status": http.StatusBadRequest, "reason": "missing_url"}))
		if v2 {
			h.writeV2Error(w, http.StatusBadRequest, "Missing url", nil)
		} else {
			writeJSON(w, http.StatusBadRequest, map[string]string{"error": "Missing url"})
		}
		return countRequest{}, false
	}

	return data, true
}

func (h *LogHandler) readCounts(ctx context.Context, host string, path string) (CounterData, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	siteUV, err := h.counter.FetchSiteUV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	sitePV, err := h.counter.FetchSitePV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	pagePV, err := h.counter.FetchPagePV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	return CounterData{SiteUV: siteUV, SitePV: sitePV, PagePV: pagePV}, nil
}

func (h *LogHandler) writeCounts(ctx context.Context, host string, path string, isNewUV bool) (CounterData, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	siteUV, err := h.counter.RecordSiteUV(ctx, host, isNewUV)
	if err != nil {
		return CounterData{}, err
	}

	sitePV, err := h.counter.IncrementSitePV(ctx, host)
	if err != nil {
		return CounterData{}, err
	}

	pagePV, err := h.counter.IncrementPagePV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	return CounterData{SiteUV: siteUV, SitePV: sitePV, PagePV: pagePV}, nil
}

func (h *LogHandler) writeV2Success(w http.ResponseWriter, status int, message string, data any) {
	writeJSON(w, status, SuccessResponse{Status: "success", Message: message, Data: data})
}

func (h *LogHandler) writeV2Error(w http.ResponseWriter, status int, message string, details map[string]any) {
	writeJSON(w, status, ErrorResponse{Status: "error", Message: message, Code: status, Details: details})
}

func zeroCounters() CounterData {
	return CounterData{}
}

func validateTargetURL(raw string) (targetURL, string) {
	parsed, err := url.Parse(raw)
	if err != nil {
		return targetURL{}, "Invalid URL format"
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return targetURL{}, "Invalid URL protocol. Only HTTP and HTTPS are supported."
	}

	if parsed.Host == "" {
		return targetURL{}, "Invalid URL host"
	}

	path := parsed.Path
	if path == "" {
		path = "/"
	}

	return targetURL{Host: parsed.Host, Path: path}, ""
}

func (l *rateLimiter) Check(ctx context.Context, r *http.Request) rateLimitResult {
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
		l.log.Warn("rate limit cleanup failed", requestLogFields(r, "rate_limit.cleanup_failed", map[string]any{"ip": ip, "ua": ua, "error": err.Error()}))
		return rateLimitResult{Success: true, Limit: rateLimitCount, Remaining: rateLimitCount, Reset: reset}
	}

	count, err := countCmd.Result()
	if err != nil {
		l.log.Warn("rate limit count failed", requestLogFields(r, "rate_limit.count_failed", map[string]any{"ip": ip, "ua": ua, "error": err.Error()}))
		return rateLimitResult{Success: true, Limit: rateLimitCount, Remaining: rateLimitCount, Reset: reset}
	}

	if count >= rateLimitCount {
		l.log.Warn("rate limit exceeded", requestLogFields(r, "rate_limit.exceeded", map[string]any{"ip": ip, "ua": ua, "limit": rateLimitCount, "remaining": 0, "status": http.StatusTooManyRequests}))
		return rateLimitResult{
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
		l.log.Warn("rate limit state update failed", requestLogFields(r, "rate_limit.persist_failed", map[string]any{"ip": ip, "ua": ua, "error": err.Error()}))
		return rateLimitResult{Success: true, Limit: rateLimitCount, Remaining: rateLimitCount, Reset: reset}
	}

	remaining := rateLimitCount - (count + 1)

	if suspiciousUA.MatchString(ua) {
		l.log.Warn("suspicious user agent detected", requestLogFields(r, "security.suspicious_user_agent", map[string]any{"ip": ip, "ua": ua}))
	}

	if remaining < 20 {
		l.log.Warn("request is nearing rate limit", requestLogFields(r, "rate_limit.near_limit", map[string]any{"ip": ip, "ua": ua, "remaining": remaining, "limit": rateLimitCount}))
	}

	return rateLimitResult{Success: true, Limit: rateLimitCount, Remaining: remaining, Reset: reset}
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

func requestLogFields(r *http.Request, event string, fields map[string]any) map[string]any {
	out := map[string]any{
		"event":      event,
		"request_id": middleware.GetReqID(r.Context()),
		"method":     r.Method,
		"route":      routePattern(r),
		"path":       r.URL.Path,
	}

	for key, value := range fields {
		out[key] = value
	}

	return out
}

func routePattern(r *http.Request) string {
	if routeContext := chi.RouteContext(r.Context()); routeContext != nil {
		if pattern := routeContext.RoutePattern(); pattern != "" {
			return pattern
		}
	}

	return r.URL.Path
}
