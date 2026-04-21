package counter

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"strings"
	"testing"

	miniredis "github.com/alicebob/miniredis/v2"
	redis "github.com/redis/go-redis/v9"
)

type noopLogger struct{}

func (noopLogger) Debug(string, any) {}
func (noopLogger) Info(string, any)  {}
func (noopLogger) Warn(string, any)  {}
func (noopLogger) Error(string, any) {}

type roundTripFunc func(*http.Request) (*http.Response, error)

func (fn roundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return fn(req)
}

func TestFetchSiteUVIgnoresLegacyRedisValuesWhenBusuanziDataExists(t *testing.T) {
	ctx := context.Background()
	server := mustStartMiniRedisCounter(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	if err := client.SAdd(ctx, "uv:site:example.com", "203.0.113.10").Err(); err != nil {
		t.Fatalf("seed legacy site set: %v", err)
	}
	if err := client.Set(ctx, "uv:baseline:example.com", 41, 0).Err(); err != nil {
		t.Fatalf("seed legacy baseline: %v", err)
	}

	service := newTestService(client, func(req *http.Request) (*http.Response, error) {
		if req.URL.String() != busuanziURL {
			t.Fatalf("unexpected Busuanzi URL %q", req.URL.String())
		}

		return jsonpResponse(`{"site_uv":7,"site_pv":0,"page_pv":0}`), nil
	})

	got, err := service.FetchSiteUV(ctx, "example.com", "/")
	if err != nil {
		t.Fatalf("fetch site UV: %v", err)
	}
	if got != 7 {
		t.Fatalf("expected Busuanzi-backed UV 7, got %d", got)
	}

	stored, err := client.Get(ctx, "uv:site:count:example.com").Result()
	if err != nil {
		t.Fatalf("read numeric UV key: %v", err)
	}
	if stored != "7" {
		t.Fatalf("expected numeric UV key to persist 7, got %q", stored)
	}
}

func TestFetchSiteUVFallsBackToZeroWithoutBusuanziAndIgnoresLegacyRedisValues(t *testing.T) {
	ctx := context.Background()
	server := mustStartMiniRedisCounter(t)
	client := redis.NewClient(&redis.Options{Addr: server.Addr()})
	t.Cleanup(func() { _ = client.Close() })

	if err := client.SAdd(ctx, "uv:site:example.com", "203.0.113.10").Err(); err != nil {
		t.Fatalf("seed legacy site set: %v", err)
	}
	if err := client.Set(ctx, "uv:baseline:example.com", 41, 0).Err(); err != nil {
		t.Fatalf("seed legacy baseline: %v", err)
	}

	service := newTestService(client, func(*http.Request) (*http.Response, error) {
		return nil, fmt.Errorf("busuanzi unavailable")
	})

	got, err := service.FetchSiteUV(ctx, "example.com", "/")
	if err != nil {
		t.Fatalf("fetch site UV: %v", err)
	}
	if got != 0 {
		t.Fatalf("expected zero UV when Busuanzi is unavailable, got %d", got)
	}

	stored, err := client.Get(ctx, "uv:site:count:example.com").Result()
	if err != nil {
		t.Fatalf("read numeric UV key: %v", err)
	}
	if stored != "0" {
		t.Fatalf("expected numeric UV key to persist 0, got %q", stored)
	}
}

func TestNormalizeTargetCanonicalizesHostAndPath(t *testing.T) {
	normalized := NormalizeTarget(" Example.COM ", "/blog/index/")

	if normalized.Host != "example.com" {
		t.Fatalf("expected lowercased host, got %q", normalized.Host)
	}
	if normalized.Path != "/blog" {
		t.Fatalf("expected canonical path /blog, got %q", normalized.Path)
	}
}

func TestNormalizeTargetTruncatesLongPaths(t *testing.T) {
	normalized := NormalizeTarget("example.com", "/"+strings.Repeat("a", 250))

	if len(normalized.Path) != maxTrackedPathLength {
		t.Fatalf("expected path length %d, got %d", maxTrackedPathLength, len(normalized.Path))
	}
}

func newTestService(client *redis.Client, roundTrip roundTripFunc) *Service {
	service := NewService(client, noopLogger{})
	service.httpClient = &http.Client{Transport: roundTrip}
	return service
}

func jsonpResponse(body string) *http.Response {
	return &http.Response{
		StatusCode: http.StatusOK,
		Header:     make(http.Header),
		Body: io.NopCloser(strings.NewReader(
			"BusuanziCallback_777487655111(" + body + ");",
		)),
	}
}

func mustStartMiniRedisCounter(t *testing.T) *miniredis.Miniredis {
	t.Helper()

	server, err := miniredis.Run()
	if err != nil {
		t.Fatalf("start miniredis: %v", err)
	}

	t.Cleanup(server.Close)
	return server
}
