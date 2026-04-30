package app

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/EvanNotFound/vercount/apps/api/internal/counter"
	miniredis "github.com/alicebob/miniredis/v2"
	redis "github.com/redis/go-redis/v9"
)

func TestRootRedirectsToCanonicalHomepage(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())

	for _, method := range []string{http.MethodGet, http.MethodHead} {
		t.Run(method, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(method, "/", nil))

			assertRedirectLocation(t, recorder, "https://www.vercount.one/")
		})
	}
}

func TestSelectedPageRoutesRedirectToCanonicalWebHost(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())

	for _, tc := range []struct {
		path string
		want string
	}{
		{path: "/dashboard", want: "https://www.vercount.one/dashboard"},
		{path: "/dashboard/analytics", want: "https://www.vercount.one/dashboard/analytics"},
		{path: "/dashboard/domains", want: "https://www.vercount.one/dashboard/domains"},
		{path: "/auth/signin", want: "https://www.vercount.one/auth/signin"},
		{
			path: "/dashboard/domains?from=events&next=%2Fsettings",
			want: "https://www.vercount.one/dashboard/domains?from=events&next=%2Fsettings",
		},
	} {
		t.Run(tc.path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, tc.path, nil))

			assertRedirectLocation(t, recorder, tc.want)
		})
	}
}

func TestKnownMachineRoutesDoNotRedirectToCanonicalWebHost(t *testing.T) {
	handler, scriptContents := newTestHandlerWithScript(t, mustStartMiniRedis(t).Addr(), "console.log('vercount');")

	for _, path := range []string{
		"/healthz",
		"/js",
		"/log?url=file:///bad",
		"/api/v1/log?url=file:///bad",
		"/api/v2/log?url=file:///bad",
	} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))

			if recorder.Code == http.StatusMovedPermanently {
				t.Fatalf("expected machine route not to redirect, got location %q", recorder.Header().Get("Location"))
			}
			if strings.HasPrefix(recorder.Header().Get("Location"), "https://www.vercount.one") {
				t.Fatalf("expected no canonical redirect, got %q", recorder.Header().Get("Location"))
			}
			if path == "/js" && recorder.Body.String() != scriptContents {
				t.Fatalf("expected script contents %q, got %q", scriptContents, recorder.Body.String())
			}
		})
	}
}

func TestUnknownAPIPathDoesNotRedirectToCanonicalWebHost(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v3/log", nil))

	if recorder.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", recorder.Code)
	}
	if recorder.Header().Get("Location") != "" {
		t.Fatalf("expected no redirect location, got %q", recorder.Header().Get("Location"))
	}
}

func TestHealthzReportsReadyWhenRedisReachable(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal healthz response: %v", err)
	}

	if payload["status"] != "ready" {
		t.Fatalf("expected ready status, got %#v", payload["status"])
	}
}

func TestHealthzReportsNotReadyWhenRedisUnavailable(t *testing.T) {
	handler := newTestHandler(t, "127.0.0.1:1")
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/healthz", nil))

	if recorder.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected 503, got %d", recorder.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal healthz response: %v", err)
	}

	if payload["status"] != "not_ready" {
		t.Fatalf("expected not_ready status, got %#v", payload["status"])
	}

	deps, ok := payload["dependencies"].(map[string]any)
	if !ok || deps["redis"] != "unreachable" {
		t.Fatalf("expected redis dependency failure, got %#v", payload["dependencies"])
	}
}

func TestScriptRouteServesJavaScriptAsset(t *testing.T) {
	handler, scriptContents := newTestHandlerWithScript(t, mustStartMiniRedis(t).Addr(), "console.log('vercount');")
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/js", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	if !strings.Contains(recorder.Header().Get("Content-Type"), "application/javascript") {
		t.Fatalf("expected javascript content type, got %q", recorder.Header().Get("Content-Type"))
	}

	if recorder.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("expected CORS header, got %q", recorder.Header().Get("Access-Control-Allow-Origin"))
	}

	if recorder.Header().Get("Access-Control-Allow-Credentials") != "" {
		t.Fatalf("expected credentialless CORS, got %q", recorder.Header().Get("Access-Control-Allow-Credentials"))
	}

	if recorder.Body.String() != scriptContents {
		t.Fatalf("expected script contents %q, got %q", scriptContents, recorder.Body.String())
	}
}

func TestV1RoutesKeepPlainJSONResponseShape(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())

	for _, path := range []string{"/log?url=file:///bad", "/api/v1/log?url=file:///bad"} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, path, nil))

			if recorder.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d", recorder.Code)
			}

			var payload map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
				t.Fatalf("unmarshal v1 response: %v", err)
			}

			if _, hasStatus := payload["status"]; hasStatus {
				t.Fatalf("expected plain JSON payload, got envelope %#v", payload)
			}

			if payload["error"] == nil || payload["site_uv"] == nil {
				t.Fatalf("expected legacy v1 fields, got %#v", payload)
			}
		})
	}
}

func TestV1PostRoutesKeepPlainJSONResponseShape(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())

	for _, path := range []string{"/log", "/api/v1/log"} {
		t.Run(path, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			request := httptest.NewRequest(http.MethodPost, path, strings.NewReader(`{"url":"file:///bad","isNewUv":true}`))
			request.Header.Set("Content-Type", "application/json")
			handler.ServeHTTP(recorder, request)

			if recorder.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d", recorder.Code)
			}

			var payload map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
				t.Fatalf("unmarshal v1 response: %v", err)
			}

			if _, hasStatus := payload["status"]; hasStatus {
				t.Fatalf("expected plain JSON payload, got envelope %#v", payload)
			}

			if payload["error"] == nil || payload["site_uv"] == nil {
				t.Fatalf("expected legacy v1 fields, got %#v", payload)
			}
		})
	}
}

func TestV2RouteKeepsEnvelopeResponseShape(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v2/log?url=file:///bad", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal v2 response: %v", err)
	}

	if payload["status"] != "success" {
		t.Fatalf("expected success envelope, got %#v", payload)
	}

	data, ok := payload["data"].(map[string]any)
	if !ok || data["site_uv"] == nil {
		t.Fatalf("expected data envelope, got %#v", payload)
	}
}

func TestV2PostRouteKeepsEnvelopeResponseShape(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodPost, "/api/v2/log", strings.NewReader(`{"url":"file:///bad","isNewUv":true}`))
	request.Header.Set("Content-Type", "application/json")

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal v2 response: %v", err)
	}

	if payload["status"] != "success" {
		t.Fatalf("expected success envelope, got %#v", payload)
	}

	data, ok := payload["data"].(map[string]any)
	if !ok || data["site_uv"] == nil {
		t.Fatalf("expected data envelope, got %#v", payload)
	}
}

func TestOptionsRoutesStayAvailable(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())

	for _, tc := range []struct {
		name         string
		path         string
		expectStatus any
	}{
		{name: "legacy options", path: "/log", expectStatus: nil},
		{name: "v1 options", path: "/api/v1/log", expectStatus: nil},
		{name: "v2 options", path: "/api/v2/log", expectStatus: "success"},
	} {
		t.Run(tc.name, func(t *testing.T) {
			recorder := httptest.NewRecorder()
			handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodOptions, tc.path, nil))

			if recorder.Code != http.StatusOK {
				t.Fatalf("expected 200, got %d", recorder.Code)
			}

			if recorder.Header().Get("Access-Control-Allow-Origin") != "*" {
				t.Fatalf("expected CORS header, got %q", recorder.Header().Get("Access-Control-Allow-Origin"))
			}

			if recorder.Header().Get("Access-Control-Allow-Credentials") != "" {
				t.Fatalf("expected credentialless CORS, got %q", recorder.Header().Get("Access-Control-Allow-Credentials"))
			}

			var payload map[string]any
			if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
				t.Fatalf("unmarshal options response: %v", err)
			}

			if payload["status"] != tc.expectStatus {
				t.Fatalf("unexpected status field for %s: %#v", tc.path, payload)
			}
		})
	}
}

func TestBenchmarkWriteRouteUsesFixedTargetAndNoStoreHeaders(t *testing.T) {
	redisServer := mustStartMiniRedis(t)
	handler := newTestHandler(t, redisServer.Addr())
	client := redis.NewClient(&redis.Options{Addr: redisServer.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	seedBenchmarkNamespace(t, client)

	recorder := httptest.NewRecorder()
	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/bench/write", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	if recorder.Header().Get("Access-Control-Allow-Origin") != "*" {
		t.Fatalf("expected CORS header, got %q", recorder.Header().Get("Access-Control-Allow-Origin"))
	}

	if recorder.Header().Get("Access-Control-Allow-Credentials") != "" {
		t.Fatalf("expected credentialless CORS, got %q", recorder.Header().Get("Access-Control-Allow-Credentials"))
	}

	if !strings.Contains(recorder.Header().Get("Cache-Control"), "no-store") {
		t.Fatalf("expected no-store cache header, got %q", recorder.Header().Get("Cache-Control"))
	}

	if recorder.Header().Get("Pragma") != "no-cache" {
		t.Fatalf("expected pragma no-cache header, got %q", recorder.Header().Get("Pragma"))
	}

	if recorder.Header().Get("Expires") != "0" {
		t.Fatalf("expected expires header 0, got %q", recorder.Header().Get("Expires"))
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal benchmark response: %v", err)
	}

	if payload["status"] != "success" {
		t.Fatalf("expected success envelope, got %#v", payload)
	}

	data, ok := payload["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected data envelope, got %#v", payload)
	}

	for field, want := range map[string]float64{"site_uv": 1, "site_pv": 1, "page_pv": 1} {
		if data[field] != want {
			t.Fatalf("expected %s=%v, got %#v", field, want, data[field])
		}
	}

	keys, err := client.Keys(context.Background(), "*").Result()
	if err != nil {
		t.Fatalf("list redis keys: %v", err)
	}

	for _, key := range keys {
		if strings.HasPrefix(key, "ratelimit:") {
			continue
		}
		if !strings.Contains(key, "bench.vercount.one") {
			t.Fatalf("expected only benchmark namespace keys, got %q in %#v", key, keys)
		}
	}

	pageValue, err := client.Get(context.Background(), "pv:page:bench.vercount.one:/gurt").Result()
	if err != nil {
		t.Fatalf("read benchmark page key: %v", err)
	}

	if pageValue != "1" {
		t.Fatalf("expected fixed /gurt page key to increment to 1, got %q", pageValue)
	}
}

func TestBenchmarkWriteRouteUsesV2RateLimitErrors(t *testing.T) {
	redisServer := mustStartMiniRedis(t)
	handler := newTestHandler(t, redisServer.Addr())
	client := redis.NewClient(&redis.Options{Addr: redisServer.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	seedBenchmarkNamespace(t, client)

	for i := 0; i < 80; i++ {
		recorder := httptest.NewRecorder()
		request := httptest.NewRequest(http.MethodGet, "/bench/write", nil)
		request.RemoteAddr = "203.0.113.10:1234"
		handler.ServeHTTP(recorder, request)

		if recorder.Code != http.StatusOK {
			t.Fatalf("expected warm-up request to succeed, got %d", recorder.Code)
		}
	}

	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/bench/write", nil)
	request.RemoteAddr = "203.0.113.10:1234"
	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusTooManyRequests {
		t.Fatalf("expected 429, got %d", recorder.Code)
	}

	if !strings.Contains(recorder.Header().Get("Cache-Control"), "no-store") {
		t.Fatalf("expected no-store cache header, got %q", recorder.Header().Get("Cache-Control"))
	}

	if recorder.Header().Get("Pragma") != "no-cache" {
		t.Fatalf("expected pragma no-cache header, got %q", recorder.Header().Get("Pragma"))
	}

	if recorder.Header().Get("Expires") != "0" {
		t.Fatalf("expected expires header 0, got %q", recorder.Header().Get("Expires"))
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal rate-limit response: %v", err)
	}

	if payload["status"] != "error" {
		t.Fatalf("expected error envelope, got %#v", payload)
	}

	if payload["code"] != float64(http.StatusTooManyRequests) {
		t.Fatalf("expected 429 code, got %#v", payload["code"])
	}

	if payload["message"] != "Rate limit exceeded" {
		t.Fatalf("expected rate-limit message, got %#v", payload["message"])
	}

	details, ok := payload["details"].(map[string]any)
	if !ok {
		t.Fatalf("expected details payload, got %#v", payload)
	}

	if details["limit"] != float64(80) || details["remaining"] != float64(0) {
		t.Fatalf("expected v2 rate-limit details, got %#v", details)
	}
}

func TestRequestLoggingEmitsStructuredCompletionEvent(t *testing.T) {
	redisServer := mustStartMiniRedis(t)
	var logs bytes.Buffer
	logger := newLogger(false, &logs)
	handler, _ := newTestHandlerWithLogger(t, redisServer.Addr(), "console.log('test');", logger)
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/api/v2/log?url=file:///bad", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	entry := findLogEntry(t, logs.String(), "request.completed")
	if entry["service"] != "api" {
		t.Fatalf("expected api service field, got %#v", entry["service"])
	}
	if entry["method"] != http.MethodGet {
		t.Fatalf("expected GET method, got %#v", entry["method"])
	}
	if entry["route"] != "/api/v2/log" {
		t.Fatalf("expected route pattern, got %#v", entry["route"])
	}
	if entry["status"] != float64(http.StatusOK) {
		t.Fatalf("expected status 200, got %#v", entry["status"])
	}
	if entry["request_id"] == "" {
		t.Fatalf("expected request_id to be present, got %#v", entry["request_id"])
	}
	if _, ok := entry["duration_ms"].(float64); !ok {
		t.Fatalf("expected duration_ms numeric field, got %#v", entry["duration_ms"])
	}
}

func TestAcceptedPostWriteContinuesAfterCanceledRequestContext(t *testing.T) {
	redisServer := mustStartMiniRedis(t)
	client := redis.NewClient(&redis.Options{Addr: redisServer.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	seedTrackedNamespace(t, client, "example.com", "/blog")

	handler := newTestHandler(t, redisServer.Addr())
	body := bytes.NewBufferString(`{"url":" https://Example.com:443/blog/index/ ","isNewUv":true}`)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	request := httptest.NewRequest(http.MethodPost, "/api/v2/log", body).WithContext(ctx)
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "203.0.113.10:1234"
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal post response: %v", err)
	}
	if payload["status"] != "success" {
		t.Fatalf("expected success envelope, got %#v", payload)
	}

	data, ok := payload["data"].(map[string]any)
	if !ok {
		t.Fatalf("expected data envelope, got %#v", payload)
	}
	for field, want := range map[string]float64{"site_uv": 1, "site_pv": 1, "page_pv": 1} {
		if data[field] != want {
			t.Fatalf("expected %s=%v, got %#v", field, want, data[field])
		}
	}

	for key, want := range map[string]string{
		"uv:site:count:example.com": "1",
		"pv:site:example.com":       "1",
		"pv:page:example.com:/blog": "1",
	} {
		got, err := client.Get(context.Background(), key).Result()
		if err != nil {
			t.Fatalf("read %s: %v", key, err)
		}
		if got != want {
			t.Fatalf("expected %s=%q, got %q", key, want, got)
		}
	}
}

func TestCanceledReadRequestRemainsRequestScoped(t *testing.T) {
	redisServer := mustStartMiniRedis(t)
	handler := newTestHandler(t, redisServer.Addr())
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	request := httptest.NewRequest(http.MethodGet, "/api/v2/log?url=https://example.com/blog", nil).WithContext(ctx)
	request.RemoteAddr = "203.0.113.11:1234"
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusInternalServerError {
		t.Fatalf("expected 500, got %d", recorder.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal read response: %v", err)
	}
	if payload["status"] != "error" {
		t.Fatalf("expected error envelope, got %#v", payload)
	}
}

func TestCanceledPostEmitsAbortedRequestAndDetachedWriteLogs(t *testing.T) {
	redisServer := mustStartMiniRedis(t)
	client := redis.NewClient(&redis.Options{Addr: redisServer.Addr()})
	t.Cleanup(func() { _ = client.Close() })
	seedTrackedNamespace(t, client, "example.com", "/blog")

	var logs bytes.Buffer
	logger := newLogger(false, &logs)
	handler, _ := newTestHandlerWithLogger(t, redisServer.Addr(), "console.log('test');", logger)
	body := bytes.NewBufferString(`{"url":" https://Example.com:443/blog/index/ ","isNewUv":true}`)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	request := httptest.NewRequest(http.MethodPost, "/api/v2/log", body).WithContext(ctx)
	request.Header.Set("Content-Type", "application/json")
	request.RemoteAddr = "203.0.113.12:1234"
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, request)

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	aborted := findLogEntry(t, logs.String(), "request.aborted")
	if aborted["route"] != "/api/v2/log" {
		t.Fatalf("expected aborted route, got %#v", aborted["route"])
	}
	if aborted["transport_error"] == "" {
		t.Fatalf("expected transport_error, got %#v", aborted)
	}

	detached := findLogEntry(t, logs.String(), "counter.write_detached_completed")
	if detached["host"] != "example.com" {
		t.Fatalf("expected normalized host, got %#v", detached["host"])
	}
	if detached["target_path"] != "/blog" {
		t.Fatalf("expected normalized target_path, got %#v", detached["target_path"])
	}
	if detached["target_url"] != "https://Example.com:443/blog/index/" {
		t.Fatalf("expected trimmed raw target_url, got %#v", detached["target_url"])
	}
	if detached["transport_error"] == "" {
		t.Fatalf("expected detached transport_error, got %#v", detached)
	}

	if hasLogEvent(logs.String(), "request.completed") {
		t.Fatalf("did not expect request.completed log in output %q", logs.String())
	}
}

func newTestHandler(t *testing.T, redisAddr string) http.Handler {
	handler, _ := newTestHandlerWithScript(t, redisAddr, "console.log('test');")
	return handler
}

func newTestHandlerWithScript(t *testing.T, redisAddr string, scriptContents string) (http.Handler, string) {
	return newTestHandlerWithLogger(t, redisAddr, scriptContents, NewLogger(false))
}

func newTestHandlerWithLogger(t *testing.T, redisAddr string, scriptContents string, logger *Logger) (http.Handler, string) {
	t.Helper()

	scriptPath := filepath.Join(t.TempDir(), "client.min.js")
	if err := os.WriteFile(scriptPath, []byte(scriptContents), 0o644); err != nil {
		t.Fatalf("write script file: %v", err)
	}

	redisClient := redis.NewClient(&redis.Options{Addr: redisAddr})
	t.Cleanup(func() { _ = redisClient.Close() })

	server := NewServer(
		Config{ScriptPath: scriptPath},
		logger,
		counter.NewService(redisClient, logger),
		redisClient,
	)

	return server.Routes(), scriptContents
}

func findLogEntry(t *testing.T, output string, event string) map[string]any {
	t.Helper()

	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}

		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			t.Fatalf("unmarshal log line %q: %v", line, err)
		}

		if entry["event"] == event {
			return entry
		}
	}

	t.Fatalf("expected log entry with event %q in output %q", event, output)
	return nil
}

func hasLogEvent(output string, event string) bool {
	for _, line := range strings.Split(strings.TrimSpace(output), "\n") {
		if strings.TrimSpace(line) == "" {
			continue
		}

		var entry map[string]any
		if err := json.Unmarshal([]byte(line), &entry); err != nil {
			return false
		}

		if entry["event"] == event {
			return true
		}
	}

	return false
}

func assertRedirectLocation(t *testing.T, recorder *httptest.ResponseRecorder, want string) {
	t.Helper()

	if recorder.Code != http.StatusMovedPermanently {
		t.Fatalf("expected 301, got %d", recorder.Code)
	}
	if recorder.Header().Get("Location") != want {
		t.Fatalf("expected redirect to %q, got %q", want, recorder.Header().Get("Location"))
	}
}

func seedBenchmarkNamespace(t *testing.T, client *redis.Client) {
	t.Helper()

	ctx := context.Background()
	seedValues := map[string]string{
		"uv:site:count:bench.vercount.one": "0",
		"pv:site:bench.vercount.one":       "0",
		"pv:page:bench.vercount.one:/gurt": "0",
	}

	for key, value := range seedValues {
		if err := client.Set(ctx, key, value, 0).Err(); err != nil {
			t.Fatalf("seed %s: %v", key, err)
		}
	}
}

func seedTrackedNamespace(t *testing.T, client *redis.Client, host string, path string) {
	t.Helper()

	ctx := context.Background()
	seedValues := map[string]string{
		"uv:site:count:" + host:        "0",
		"pv:site:" + host:              "0",
		"pv:page:" + host + ":" + path: "0",
	}

	for key, value := range seedValues {
		if err := client.Set(ctx, key, value, 0).Err(); err != nil {
			t.Fatalf("seed %s: %v", key, err)
		}
	}
}

func mustStartMiniRedis(t *testing.T) *miniredis.Miniredis {
	t.Helper()

	server, err := miniredis.Run()
	if err != nil {
		t.Fatalf("start miniredis: %v", err)
	}

	t.Cleanup(server.Close)
	return server
}
