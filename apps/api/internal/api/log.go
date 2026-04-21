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
	"github.com/go-chi/chi/v5/middleware"
	redis "github.com/redis/go-redis/v9"
)

const (
	rateLimitWindow           = 60 * time.Second
	rateLimitCount            = int64(80)
	rateLimitRedisFailureMode = "fail_open"
	benchmarkWriteTargetURL   = "https://bench.vercount.one/gurt"
	readCountsTimeout         = 5 * time.Second
	writeCountsTimeout        = 5 * time.Second
)

var (
	suspiciousUA    = regexp.MustCompile(`python-requests|python/|requests/|curl/|wget/|go-http-client/|httpie/|postman/|axios/|node-fetch/|empty|unknown|bot|crawl|spider`)
	benchmarkTarget = counter.NormalizeTarget("bench.vercount.one", "/gurt")
)

type responseShape int

const (
	shapeV1 responseShape = iota
	shapeV2
)

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
	h.writeOptions(w, shapeV1)
}

func (h *LogHandler) V2Options(w http.ResponseWriter, _ *http.Request) {
	h.writeOptions(w, shapeV2)
}

func (h *LogHandler) V1Get(w http.ResponseWriter, r *http.Request) {
	h.handleGet(w, r, shapeV1)
}

func (h *LogHandler) V1Post(w http.ResponseWriter, r *http.Request) {
	h.handlePost(w, r, shapeV1)
}

func (h *LogHandler) V2Get(w http.ResponseWriter, r *http.Request) {
	h.handleGet(w, r, shapeV2)
}

func (h *LogHandler) V2Post(w http.ResponseWriter, r *http.Request) {
	h.handlePost(w, r, shapeV2)
}

func (h *LogHandler) BenchmarkWrite(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)
	applyNoStoreHeaders(w)
	if !h.allowRequest(w, r, shapeV2) {
		return
	}

	counts, err := h.writeScoped(r.Context(), benchmarkTarget, true)
	if err != nil {
		h.log.Error("benchmark counter update failed", requestLogFields(r, "counter.benchmark_write_failed", mergeFields(targetLogFields(benchmarkWriteTargetURL, benchmarkTarget), map[string]any{"status": http.StatusInternalServerError, "error": err.Error()})))
		h.writeV2Error(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	h.log.Debug("benchmark counter update completed", requestLogFields(r, "counter.benchmark_write_completed", map[string]any{"host": benchmarkTarget.Host, "target_path": benchmarkTarget.Path, "target_url": benchmarkWriteTargetURL, "is_new_uv": true, "site_uv": counts.SiteUV, "site_pv": counts.SitePV, "page_pv": counts.PagePV}))
	h.writeV2Success(w, http.StatusOK, "Benchmark data updated successfully", counts)
}

func (h *LogHandler) handleGet(w http.ResponseWriter, r *http.Request, shape responseShape) {
	applyCORSHeaders(w)
	if !h.allowRequest(w, r, shape) {
		return
	}

	target, rawTarget, ok := h.readQueryTarget(w, r, shape)
	if !ok {
		return
	}

	data, err := h.readCounts(r.Context(), target)
	if err != nil {
		h.log.Error("counter read failed", requestLogFields(r, "counter.read_failed", mergeFields(targetLogFields(rawTarget, target), map[string]any{"status": http.StatusInternalServerError, "error": err.Error()})))
		h.writeInternalError(w, shape)
		return
	}

	h.log.Debug("counter read completed", requestLogFields(r, "counter.read_completed", map[string]any{"host": target.Host, "target_path": target.Path, "site_uv": data.SiteUV, "site_pv": data.SitePV, "page_pv": data.PagePV}))
	h.writeReadSuccess(w, shape, data)
}

func (h *LogHandler) handlePost(w http.ResponseWriter, r *http.Request, shape responseShape) {
	applyCORSHeaders(w)
	if !h.allowRequest(w, r, shape) {
		return
	}

	requestData, ok := h.readBody(w, r, shape)
	if !ok {
		return
	}

	rawTarget := strings.TrimSpace(requestData.URL)
	target, message := parseTarget(rawTarget)
	if message != "" {
		h.log.Warn("invalid tracked url", requestLogFields(r, "target_url.invalid", map[string]any{"status": http.StatusOK, "target_url": rawTarget, "reason": message}))
		h.writeInvalidTarget(w, shape, message)
		return
	}

	counts, err := h.writeDetached(r.Context(), target, requestData.IsNewUV)
	if err != nil {
		h.logWriteFailure(r, rawTarget, target, requestData.IsNewUV, err)
		h.writeInternalError(w, shape)
		return
	}

	h.logWriteSuccess(r, rawTarget, target, requestData.IsNewUV, counts)
	h.writeWriteSuccess(w, shape, counts)
}

func (h *LogHandler) writeOptions(w http.ResponseWriter, shape responseShape) {
	applyCORSHeaders(w)
	if shape == shapeV1 {
		writeJSON(w, http.StatusOK, map[string]string{"message": "OK"})
		return
	}

	writeJSON(w, http.StatusOK, SuccessResponse{
		Status:  "success",
		Message: "CORS preflight successful",
		Data:    map[string]string{"message": "OK"},
	})
}

func (h *LogHandler) allowRequest(w http.ResponseWriter, r *http.Request, shape responseShape) bool {
	result := h.limit.Check(r.Context(), r)
	if result.Success {
		return true
	}

	if shape == shapeV1 {
		writeJSON(w, http.StatusTooManyRequests, map[string]string{"error": result.Error})
		return false
	}

	h.writeV2Error(w, http.StatusTooManyRequests, result.Error, map[string]any{
		"limit":     result.Limit,
		"remaining": result.Remaining,
	})
	return false
}

func (h *LogHandler) readQueryTarget(w http.ResponseWriter, r *http.Request, shape responseShape) (counter.Target, string, bool) {
	rawTarget := strings.TrimSpace(r.URL.Query().Get("url"))
	if rawTarget == "" {
		h.log.Warn("missing tracked url parameter", requestLogFields(r, "request.invalid", map[string]any{"status": http.StatusBadRequest, "reason": "missing_url"}))
		h.writeRequestError(w, shape, http.StatusBadRequest, "Missing url parameter")
		return counter.Target{}, "", false
	}

	target, message := parseTarget(rawTarget)
	if message != "" {
		h.log.Warn("invalid tracked url", requestLogFields(r, "target_url.invalid", map[string]any{"status": http.StatusOK, "target_url": rawTarget, "reason": message}))
		h.writeInvalidTarget(w, shape, message)
		return counter.Target{}, "", false
	}

	return target, rawTarget, true
}

func (h *LogHandler) readBody(w http.ResponseWriter, r *http.Request, shape responseShape) (countRequest, bool) {
	var data countRequest
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		h.log.Warn("invalid JSON request body", requestLogFields(r, "request.invalid", map[string]any{"status": http.StatusBadRequest, "reason": "invalid_json", "error": err.Error()}))
		h.writeRequestError(w, shape, http.StatusBadRequest, "Invalid JSON body")
		return countRequest{}, false
	}

	data.URL = strings.TrimSpace(data.URL)
	if data.URL == "" {
		h.log.Warn("missing tracked url parameter", requestLogFields(r, "request.invalid", map[string]any{"status": http.StatusBadRequest, "reason": "missing_url"}))
		h.writeRequestError(w, shape, http.StatusBadRequest, "Missing url")
		return countRequest{}, false
	}

	return data, true
}

func (h *LogHandler) readCounts(ctx context.Context, target counter.Target) (CounterData, error) {
	ctx, cancel := context.WithTimeout(ctx, readCountsTimeout)
	defer cancel()

	siteUV, err := h.counter.FetchSiteUV(ctx, target)
	if err != nil {
		return CounterData{}, err
	}

	sitePV, err := h.counter.FetchSitePV(ctx, target)
	if err != nil {
		return CounterData{}, err
	}

	pagePV, err := h.counter.FetchPagePV(ctx, target)
	if err != nil {
		return CounterData{}, err
	}

	return CounterData{SiteUV: siteUV, SitePV: sitePV, PagePV: pagePV}, nil
}

func (h *LogHandler) writeDetached(ctx context.Context, target counter.Target, isNewUV bool) (CounterData, error) {
	detachedCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), writeCountsTimeout)
	defer cancel()
	return h.writeCounts(detachedCtx, target, isNewUV)
}

func (h *LogHandler) writeScoped(ctx context.Context, target counter.Target, isNewUV bool) (CounterData, error) {
	timeoutCtx, cancel := context.WithTimeout(ctx, writeCountsTimeout)
	defer cancel()
	return h.writeCounts(timeoutCtx, target, isNewUV)
}

func (h *LogHandler) writeCounts(ctx context.Context, target counter.Target, isNewUV bool) (CounterData, error) {
	siteUV, err := h.counter.RecordSiteUV(ctx, target, isNewUV)
	if err != nil {
		return CounterData{}, err
	}

	sitePV, err := h.counter.IncrementSitePV(ctx, target)
	if err != nil {
		return CounterData{}, err
	}

	pagePV, err := h.counter.IncrementPagePV(ctx, target)
	if err != nil {
		return CounterData{}, err
	}

	return CounterData{SiteUV: siteUV, SitePV: sitePV, PagePV: pagePV}, nil
}

func (h *LogHandler) writeReadSuccess(w http.ResponseWriter, shape responseShape, data CounterData) {
	if shape == shapeV1 {
		writeJSON(w, http.StatusOK, data)
		return
	}

	h.writeV2Success(w, http.StatusOK, "Data retrieved successfully", data)
}

func (h *LogHandler) writeWriteSuccess(w http.ResponseWriter, shape responseShape, data CounterData) {
	if shape == shapeV1 {
		writeJSON(w, http.StatusOK, data)
		return
	}

	h.writeV2Success(w, http.StatusOK, "Data updated successfully", data)
}

func (h *LogHandler) writeInvalidTarget(w http.ResponseWriter, shape responseShape, message string) {
	if shape == shapeV1 {
		writeJSON(w, http.StatusOK, map[string]any{
			"error":   message,
			"site_uv": 0,
			"site_pv": 0,
			"page_pv": 0,
		})
		return
	}

	h.writeV2Success(w, http.StatusOK, message, zeroCounters())
}

func (h *LogHandler) writeRequestError(w http.ResponseWriter, shape responseShape, status int, message string) {
	if shape == shapeV1 {
		writeJSON(w, status, map[string]string{"error": message})
		return
	}

	h.writeV2Error(w, status, message, nil)
}

func (h *LogHandler) writeInternalError(w http.ResponseWriter, shape responseShape) {
	h.writeRequestError(w, shape, http.StatusInternalServerError, "Internal server error")
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

func parseTarget(raw string) (counter.Target, string) {
	parsed, err := url.Parse(strings.TrimSpace(raw))
	if err != nil {
		return counter.Target{}, "Invalid URL format"
	}

	if parsed.Scheme != "http" && parsed.Scheme != "https" {
		return counter.Target{}, "Invalid URL protocol. Only HTTP and HTTPS are supported."
	}

	if parsed.Host == "" {
		return counter.Target{}, "Invalid URL host"
	}

	host := strings.ToLower(parsed.Hostname())
	if host == "" {
		return counter.Target{}, "Invalid URL host"
	}

	port := parsed.Port()
	if port != "" && !isDefaultPort(parsed.Scheme, port) {
		host = net.JoinHostPort(host, port)
	}

	return counter.NormalizeTarget(host, parsed.Path), ""
}

func isDefaultPort(scheme string, port string) bool {
	return (scheme == "http" && port == "80") || (scheme == "https" && port == "443")
}

func (h *LogHandler) logWriteSuccess(r *http.Request, rawTarget string, target counter.Target, isNewUV bool, counts CounterData) {
	fields := mergeFields(targetLogFields(rawTarget, target), map[string]any{
		"is_new_uv": isNewUV,
		"site_uv":   counts.SiteUV,
		"site_pv":   counts.SitePV,
		"page_pv":   counts.PagePV,
	})

	if transportErr := r.Context().Err(); transportErr != nil {
		fields["transport_error"] = transportErr.Error()
		h.log.Info("counter update completed after transport abort", requestLogFields(r, "counter.write_detached_completed", fields))
		return
	}

	h.log.Debug("counter update completed", requestLogFields(r, "counter.write_completed", fields))
}

func (h *LogHandler) logWriteFailure(r *http.Request, rawTarget string, target counter.Target, isNewUV bool, err error) {
	fields := mergeFields(targetLogFields(rawTarget, target), map[string]any{
		"status":    http.StatusInternalServerError,
		"error":     err.Error(),
		"is_new_uv": isNewUV,
	})

	if transportErr := r.Context().Err(); transportErr != nil {
		fields["transport_error"] = transportErr.Error()
		h.log.Error("counter update failed after transport abort", requestLogFields(r, "counter.write_detached_failed", fields))
		return
	}

	h.log.Error("counter update failed", requestLogFields(r, "counter.write_failed", fields))
}

func targetLogFields(raw string, target counter.Target) map[string]any {
	fields := map[string]any{
		"host":        target.Host,
		"target_path": target.Path,
	}
	if raw != "" {
		fields["target_url"] = raw
	}
	return fields
}

func mergeFields(base map[string]any, extra map[string]any) map[string]any {
	merged := make(map[string]any, len(base)+len(extra))
	for key, value := range base {
		merged[key] = value
	}
	for key, value := range extra {
		merged[key] = value
	}
	return merged
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
		l.log.Warn("rate limit cleanup failed", requestLogFields(r, "rate_limit.cleanup_failed", map[string]any{"ip": ip, "ua": ua, "error": err.Error(), "policy": rateLimitRedisFailureMode}))
		return failOpenRateLimit(reset)
	}

	count, err := countCmd.Result()
	if err != nil {
		l.log.Warn("rate limit count failed", requestLogFields(r, "rate_limit.count_failed", map[string]any{"ip": ip, "ua": ua, "error": err.Error(), "policy": rateLimitRedisFailureMode}))
		return failOpenRateLimit(reset)
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
		l.log.Warn("rate limit state update failed", requestLogFields(r, "rate_limit.persist_failed", map[string]any{"ip": ip, "ua": ua, "error": err.Error(), "policy": rateLimitRedisFailureMode}))
		return failOpenRateLimit(reset)
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

func failOpenRateLimit(reset int64) rateLimitResult {
	return rateLimitResult{Success: true, Limit: rateLimitCount, Remaining: rateLimitCount, Reset: reset}
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

	return "unknown"
}

func requestLogFields(r *http.Request, event string, fields map[string]any) map[string]any {
	out := map[string]any{
		"event":      event,
		"request_id": middleware.GetReqID(r.Context()),
		"method":     r.Method,
		"route":      RoutePattern(r),
		"path":       r.URL.Path,
	}

	for key, value := range fields {
		out[key] = value
	}

	return out
}
