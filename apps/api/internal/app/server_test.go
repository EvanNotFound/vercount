package app

import (
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

func TestRootEndpointReturnsServiceMetadata(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())
	recorder := httptest.NewRecorder()

	handler.ServeHTTP(recorder, httptest.NewRequest(http.MethodGet, "/", nil))

	if recorder.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", recorder.Code)
	}

	var payload map[string]any
	if err := json.Unmarshal(recorder.Body.Bytes(), &payload); err != nil {
		t.Fatalf("unmarshal root response: %v", err)
	}

	if payload["service"] != "vercount-events-api" {
		t.Fatalf("expected service name, got %#v", payload["service"])
	}

	routes, ok := payload["routes"].([]any)
	if !ok || len(routes) == 0 {
		t.Fatalf("expected routes array, got %#v", payload["routes"])
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

func TestOptionsRoutesStayAvailable(t *testing.T) {
	handler := newTestHandler(t, mustStartMiniRedis(t).Addr())

	for _, tc := range []struct {
		name         string
		path         string
		expectStatus any
	}{
		{name: "v1 options", path: "/log", expectStatus: nil},
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

func newTestHandler(t *testing.T, redisAddr string) http.Handler {
	handler, _ := newTestHandlerWithScript(t, redisAddr, "console.log('test');")
	return handler
}

func newTestHandlerWithScript(t *testing.T, redisAddr string, scriptContents string) (http.Handler, string) {
	t.Helper()

	scriptPath := filepath.Join(t.TempDir(), "client.min.js")
	if err := os.WriteFile(scriptPath, []byte(scriptContents), 0o644); err != nil {
		t.Fatalf("write script file: %v", err)
	}

	redisClient := redis.NewClient(&redis.Options{Addr: redisAddr})
	t.Cleanup(func() { _ = redisClient.Close() })

	logger := NewLogger(false)
	server := NewServer(
		Config{ScriptPath: scriptPath},
		logger,
		counter.NewService(redisClient, logger),
		redisClient,
	)

	return server.Routes(), scriptContents
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
