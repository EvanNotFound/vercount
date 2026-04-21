package counter

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	redis "github.com/redis/go-redis/v9"
)

const (
	ExpirationTime         int64 = 60 * 60 * 24 * 30 * 3
	expirationTTL                = time.Duration(ExpirationTime) * time.Second
	siteUVCountKeyPrefix         = "uv:site:count:"
	pageInventoryKeyPrefix       = "pv:page:index:"
	maxTrackedPathLength         = 200
)

var drivePathPattern = regexp.MustCompile(`^/[A-Za-z]:/`)

type Logger interface {
	Debug(message string, data any)
	Info(message string, data any)
	Warn(message string, data any)
	Error(message string, data any)
}

type SanitizedURL struct {
	Host string
	Path string
}

type Service struct {
	redis      *redis.Client
	log        Logger
	httpClient *http.Client
}

func NewService(redisClient *redis.Client, log Logger) *Service {
	return &Service{
		redis: redisClient,
		log:   log,
		httpClient: &http.Client{
			Timeout: 2 * time.Second,
		},
	}
}

func (s *Service) FetchSiteUV(ctx context.Context, host string, path string) (int64, error) {
	sanitized := sanitizeURL(host, path, s.log)
	siteKey := getSiteUVCountKey(sanitized.Host)

	if _, err := s.initializeSiteUV(ctx, sanitized.Host, host); err != nil {
		return 0, err
	}

	value, err := s.redis.GetEx(ctx, siteKey, expirationTTL).Result()
	if err != nil {
		if err == redis.Nil {
			return 0, nil
		}
		return 0, err
	}

	count, err := parseInt(value)
	if err != nil {
		return 0, err
	}

	s.log.Debug("site UV read", counterLogFields("counter.site_uv.read", map[string]any{"host": sanitized.Host, "target_path": sanitized.Path, "site_uv": count}))
	return count, nil
}

func (s *Service) FetchSitePV(ctx context.Context, host string, path string) (int64, error) {
	sanitized := sanitizeURL(host, path, s.log)
	count, err := s.initializeSitePV(ctx, sanitized.Host, host)
	if err != nil {
		return 0, err
	}

	s.log.Debug("site PV read", counterLogFields("counter.site_pv.read", map[string]any{"host": sanitized.Host, "target_path": sanitized.Path, "site_pv": count}))
	return count, nil
}

func (s *Service) FetchPagePV(ctx context.Context, host string, path string) (int64, error) {
	sanitized := sanitizeURL(host, path, s.log)
	count, err := s.initializePagePV(ctx, sanitized.Host, sanitized.Path, host)
	if err != nil {
		return 0, err
	}

	s.log.Debug("page PV read", counterLogFields("counter.page_pv.read", map[string]any{"host": sanitized.Host, "target_path": sanitized.Path, "page_pv": count}))
	return count, nil
}

func (s *Service) IncrementSitePV(ctx context.Context, host string) (int64, error) {
	sanitized := sanitizeURL(host, "", s.log)
	if _, err := s.initializeSitePV(ctx, sanitized.Host, host); err != nil {
		return 0, err
	}

	siteKey := "pv:site:" + sanitized.Host
	var countCmd *redis.IntCmd
	_, err := s.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		countCmd = pipe.Incr(ctx, siteKey)
		pipe.Expire(ctx, siteKey, expirationTTL)
		return nil
	})
	if err != nil {
		return 0, err
	}

	count, err := countCmd.Result()
	if err != nil {
		return 0, err
	}

	s.log.Debug("site PV updated", counterLogFields("counter.site_pv.updated", map[string]any{"host": sanitized.Host, "site_pv": count}))
	return count, nil
}

func (s *Service) IncrementPagePV(ctx context.Context, host string, path string) (int64, error) {
	sanitized := sanitizeURL(host, path, s.log)
	if _, err := s.initializePagePV(ctx, sanitized.Host, sanitized.Path, host); err != nil {
		return 0, err
	}

	pageKey := fmt.Sprintf("pv:page:%s:%s", sanitized.Host, sanitized.Path)
	inventoryKey := getPageInventoryKey(sanitized.Host)
	var countCmd *redis.IntCmd
	_, err := s.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		countCmd = pipe.Incr(ctx, pageKey)
		pipe.Expire(ctx, pageKey, expirationTTL)
		pipe.SAdd(ctx, inventoryKey, sanitized.Path)
		pipe.Expire(ctx, inventoryKey, expirationTTL)
		return nil
	})
	if err != nil {
		return 0, err
	}

	count, err := countCmd.Result()
	if err != nil {
		return 0, err
	}

	s.log.Debug("page PV updated", counterLogFields("counter.page_pv.updated", map[string]any{"host": sanitized.Host, "target_path": sanitized.Path, "page_pv": count}))
	return count, nil
}

func (s *Service) RecordSiteUV(ctx context.Context, host string, isNew bool) (int64, error) {
	sanitized := sanitizeURL(host, "", s.log)
	if _, err := s.initializeSiteUV(ctx, sanitized.Host, host); err != nil {
		return 0, err
	}

	siteKey := getSiteUVCountKey(sanitized.Host)
	var count int64
	if isNew {
		var countCmd *redis.IntCmd
		_, err := s.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
			countCmd = pipe.Incr(ctx, siteKey)
			pipe.Expire(ctx, siteKey, expirationTTL)
			return nil
		})
		if err != nil {
			return 0, err
		}

		count, err = countCmd.Result()
		if err != nil {
			return 0, err
		}
	} else {
		value, err := s.redis.GetEx(ctx, siteKey, expirationTTL).Result()
		if err != nil {
			if err == redis.Nil {
				value = ""
			} else {
				return 0, err
			}
		}
		if value != "" {
			count, err = parseInt(value)
			if err != nil {
				return 0, err
			}
		}
	}

	s.log.Debug("site UV updated", counterLogFields("counter.site_uv.updated", map[string]any{"host": sanitized.Host, "is_new_uv": isNew, "site_uv": count}))
	return count, nil
}

func (s *Service) initializeSitePV(ctx context.Context, hostSanitized string, hostOriginal string) (int64, error) {
	key := "pv:site:" + hostSanitized
	return s.initializeCounter(ctx, key, func(ctx context.Context) int64 {
		return s.fetchBusuanziSitePV(ctx, hostSanitized, hostOriginal)
	}, nil)
}

func (s *Service) initializePagePV(ctx context.Context, hostSanitized string, pathSanitized string, hostOriginal string) (int64, error) {
	key := fmt.Sprintf("pv:page:%s:%s", hostSanitized, pathSanitized)
	return s.initializeCounter(ctx, key, func(ctx context.Context) int64 {
		return s.fetchBusuanziPagePV(ctx, hostSanitized, pathSanitized, hostOriginal)
	}, func(ctx context.Context) error {
		return s.addStoredPage(ctx, hostSanitized, pathSanitized)
	})
}

func (s *Service) initializeSiteUV(ctx context.Context, hostSanitized string, hostOriginal string) (int64, error) {
	key := getSiteUVCountKey(hostSanitized)
	return s.initializeCounter(ctx, key, func(ctx context.Context) int64 {
		return s.fetchBusuanziSiteUV(ctx, hostSanitized, hostOriginal)
	}, nil)
}

func (s *Service) initializeCounter(ctx context.Context, key string, resolve func(context.Context) int64, after func(context.Context) error) (int64, error) {
	value, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		if err != redis.Nil {
			return 0, err
		}
	} else {
		return parseInt(value)
	}

	initial := resolve(ctx)
	if initial < 0 {
		initial = 0
	}

	if err := s.redis.Set(ctx, key, initial, expirationTTL).Err(); err != nil {
		return 0, err
	}

	if after != nil {
		if err := after(ctx); err != nil {
			return 0, err
		}
	}

	return initial, nil
}

func (s *Service) addStoredPage(ctx context.Context, hostSanitized string, pathSanitized string) error {
	inventoryKey := getPageInventoryKey(hostSanitized)
	_, err := s.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.SAdd(ctx, inventoryKey, pathSanitized)
		pipe.Expire(ctx, inventoryKey, expirationTTL)
		return nil
	})
	return err
}

func getSiteUVCountKey(host string) string {
	return siteUVCountKeyPrefix + host
}

func getPageInventoryKey(host string) string {
	return pageInventoryKeyPrefix + host
}

func NormalizeTarget(host string, path string) SanitizedURL {
	host = strings.ToLower(strings.TrimSpace(host))

	if path == "" {
		path = "/"
	}

	if !strings.HasPrefix(path, "/") {
		path = "/" + path
	}

	if path == "/index" || path == "/index.html" || path == "/index.htm" {
		path = "/"
	}

	if len(path) > 1 && strings.HasSuffix(path, "/") {
		path = strings.TrimSuffix(path, "/")
	}

	if strings.HasSuffix(path, "/index.html") {
		path = strings.TrimSuffix(path, "/index.html")
	}
	if strings.HasSuffix(path, "/index.htm") {
		path = strings.TrimSuffix(path, "/index.htm")
	}
	if strings.HasSuffix(path, "/index") {
		path = strings.TrimSuffix(path, "/index")
	}

	if path == "" {
		path = "/"
	}

	if len(path) > maxTrackedPathLength {
		path = path[:maxTrackedPathLength]
	}

	return SanitizedURL{Host: host, Path: path}
}

func sanitizeURL(host string, path string, log Logger) SanitizedURL {
	host = strings.TrimSpace(host)
	if host == "" {
		log.Warn("invalid host detected", counterLogFields("counter.target.invalid_host", map[string]any{"target_path": path}))
		return SanitizedURL{Host: "invalid-host", Path: "/invalid-path"}
	}

	if drivePathPattern.MatchString(path) {
		log.Warn("local file path detected", counterLogFields("counter.target.local_file_path", map[string]any{"target_path": path}))
		return SanitizedURL{Host: strings.ToLower(host), Path: "/invalid-local-path"}
	}

	if len(path) > maxTrackedPathLength {
		log.Warn("tracked path truncated", counterLogFields("counter.target.path_truncated", map[string]any{"target_path_prefix": path[:50]}))
	}

	return NormalizeTarget(host, path)
}

func parseInt(value string) (int64, error) {
	if value == "" {
		return 0, nil
	}
	return strconv.ParseInt(value, 10, 64)
}

func counterLogFields(event string, fields map[string]any) map[string]any {
	out := map[string]any{"event": event}
	for key, value := range fields {
		out[key] = value
	}
	return out
}
