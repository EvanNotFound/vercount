package counter

import (
	"context"
	"fmt"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"time"

	"github.com/EvanNotFound/vercount/apps/api/internal/redis"
)

const (
	ExpirationTime        int64 = 60 * 60 * 24 * 30 * 3
	siteUVCountKeyPrefix        = "uv:site:count:"
	pageInventoryKeyPrefix      = "pv:page:index:"
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

	value, ok, err := s.redis.Get(ctx, siteKey)
	if err != nil {
		return 0, err
	}
	if err := s.redis.Expire(ctx, siteKey, ExpirationTime); err != nil {
		return 0, err
	}
	if !ok {
		return 0, nil
	}

	count, err := parseInt(value)
	if err != nil {
		return 0, err
	}

	s.log.Debug("Site UV read", map[string]any{"host": sanitized.Host, "path": sanitized.Path, "site_uv": count})
	return count, nil
}

func (s *Service) FetchSitePV(ctx context.Context, host string, path string) (int64, error) {
	sanitized := sanitizeURL(host, path, s.log)
	count, err := s.initializeSitePV(ctx, sanitized.Host, host)
	if err != nil {
		return 0, err
	}

	s.log.Debug("Site PV read", map[string]any{"host": sanitized.Host, "path": sanitized.Path, "site_pv": count})
	return count, nil
}

func (s *Service) FetchPagePV(ctx context.Context, host string, path string) (int64, error) {
	sanitized := sanitizeURL(host, path, s.log)
	count, err := s.initializePagePV(ctx, sanitized.Host, sanitized.Path, host)
	if err != nil {
		return 0, err
	}

	s.log.Debug("Page PV read", map[string]any{"host": sanitized.Host, "path": sanitized.Path, "page_pv": count})
	return count, nil
}

func (s *Service) IncrementSitePV(ctx context.Context, host string) (int64, error) {
	sanitized := sanitizeURL(host, "", s.log)
	if _, err := s.initializeSitePV(ctx, sanitized.Host, host); err != nil {
		return 0, err
	}

	siteKey := "pv:site:" + sanitized.Host
	count, err := s.redis.Incr(ctx, siteKey)
	if err != nil {
		return 0, err
	}
	if err := s.redis.Expire(ctx, siteKey, ExpirationTime); err != nil {
		return 0, err
	}

	s.log.Debug("Site PV updated", map[string]any{"host": sanitized.Host, "site_pv": count})
	return count, nil
}

func (s *Service) IncrementPagePV(ctx context.Context, host string, path string) (int64, error) {
	sanitized := sanitizeURL(host, path, s.log)
	if _, err := s.initializePagePV(ctx, sanitized.Host, sanitized.Path, host); err != nil {
		return 0, err
	}

	pageKey := fmt.Sprintf("pv:page:%s:%s", sanitized.Host, sanitized.Path)
	count, err := s.redis.Incr(ctx, pageKey)
	if err != nil {
		return 0, err
	}
	if err := s.redis.Expire(ctx, pageKey, ExpirationTime); err != nil {
		return 0, err
	}
	if err := s.addStoredPage(ctx, sanitized.Host, sanitized.Path); err != nil {
		return 0, err
	}

	s.log.Debug("Page PV updated", map[string]any{"host": sanitized.Host, "path": sanitized.Path, "page_pv": count})
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
		value, err := s.redis.Incr(ctx, siteKey)
		if err != nil {
			return 0, err
		}
		count = value
	} else {
		value, ok, err := s.redis.Get(ctx, siteKey)
		if err != nil {
			return 0, err
		}
		if ok {
			count, err = parseInt(value)
			if err != nil {
				return 0, err
			}
		}
	}

	if err := s.redis.Expire(ctx, siteKey, ExpirationTime); err != nil {
		return 0, err
	}

	s.log.Debug("Site UV updated", map[string]any{"host": sanitized.Host, "is_new_uv": isNew, "site_uv": count})
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
		legacy, ok, err := s.getLegacySiteUVTotal(ctx, hostSanitized)
		if err == nil && ok {
			return legacy
		}
		return s.fetchBusuanziSiteUV(ctx, hostSanitized, hostOriginal)
	}, nil)
}

func (s *Service) initializeCounter(ctx context.Context, key string, resolve func(context.Context) int64, after func(context.Context) error) (int64, error) {
	value, ok, err := s.redis.Get(ctx, key)
	if err != nil {
		return 0, err
	}
	if ok {
		return parseInt(value)
	}

	initial := resolve(ctx)
	if initial < 0 {
		initial = 0
	}

	if err := s.redis.SetEX(ctx, key, initial, ExpirationTime); err != nil {
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
	if err := s.redis.SAdd(ctx, inventoryKey, pathSanitized); err != nil {
		return err
	}
	return s.redis.Expire(ctx, inventoryKey, ExpirationTime)
}

func (s *Service) getLegacySiteUVTotal(ctx context.Context, hostSanitized string) (int64, bool, error) {
	legacySiteKey := "uv:site:" + hostSanitized
	legacyBaselineKey := "uv:baseline:" + hostSanitized

	setCount, err := s.redis.SCard(ctx, legacySiteKey)
	if err != nil {
		return 0, false, err
	}

	baselineValue, ok, err := s.redis.Get(ctx, legacyBaselineKey)
	if err != nil {
		return 0, false, err
	}

	baseline := int64(0)
	if ok {
		baseline, err = parseInt(baselineValue)
		if err != nil {
			return 0, false, err
		}
	}

	if setCount > 0 || ok {
		return setCount + baseline, true, nil
	}

	return 0, false, nil
}

func getSiteUVCountKey(host string) string {
	return siteUVCountKeyPrefix + host
}

func getPageInventoryKey(host string) string {
	return pageInventoryKeyPrefix + host
}

func sanitizeURL(host string, path string, log Logger) SanitizedURL {
	if host == "" {
		log.Warn("Invalid host detected", map[string]any{"path": path})
		return SanitizedURL{Host: "invalid-host", Path: "/invalid-path"}
	}

	if drivePathPattern.MatchString(path) {
		log.Warn("Local file path detected", map[string]any{"path": path})
		return SanitizedURL{Host: host, Path: "/invalid-local-path"}
	}

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

	if len(path) > 200 {
		log.Warn("Path too long", map[string]any{"path": path[:50]})
		path = path[:200]
	}

	return SanitizedURL{Host: host, Path: path}
}

func parseInt(value string) (int64, error) {
	if value == "" {
		return 0, nil
	}
	return strconv.ParseInt(value, 10, 64)
}
