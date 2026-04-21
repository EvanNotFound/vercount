package counter

import (
	"context"
	"fmt"
	"net/http"
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

type Logger interface {
	Debug(message string, data any)
	Info(message string, data any)
	Warn(message string, data any)
	Error(message string, data any)
}

type Target struct {
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

func (s *Service) FetchSiteUV(ctx context.Context, target Target) (int64, error) {
	if _, err := s.initSiteUV(ctx, target); err != nil {
		return 0, err
	}

	value, err := s.redis.GetEx(ctx, siteUVKey(target.Host), expirationTTL).Result()
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

	s.log.Debug("site UV read", counterLogFields("counter.site_uv.read", map[string]any{"host": target.Host, "target_path": target.Path, "site_uv": count}))
	return count, nil
}

func (s *Service) FetchSitePV(ctx context.Context, target Target) (int64, error) {
	count, err := s.initSitePV(ctx, target)
	if err != nil {
		return 0, err
	}

	s.log.Debug("site PV read", counterLogFields("counter.site_pv.read", map[string]any{"host": target.Host, "target_path": target.Path, "site_pv": count}))
	return count, nil
}

func (s *Service) FetchPagePV(ctx context.Context, target Target) (int64, error) {
	count, err := s.initPagePV(ctx, target)
	if err != nil {
		return 0, err
	}

	s.log.Debug("page PV read", counterLogFields("counter.page_pv.read", map[string]any{"host": target.Host, "target_path": target.Path, "page_pv": count}))
	return count, nil
}

func (s *Service) IncrementSitePV(ctx context.Context, target Target) (int64, error) {
	if _, err := s.initSitePV(ctx, target); err != nil {
		return 0, err
	}

	var countCmd *redis.IntCmd
	_, err := s.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		countCmd = pipe.Incr(ctx, sitePVKey(target.Host))
		pipe.Expire(ctx, sitePVKey(target.Host), expirationTTL)
		return nil
	})
	if err != nil {
		return 0, err
	}

	count, err := countCmd.Result()
	if err != nil {
		return 0, err
	}

	s.log.Debug("site PV updated", counterLogFields("counter.site_pv.updated", map[string]any{"host": target.Host, "site_pv": count}))
	return count, nil
}

func (s *Service) IncrementPagePV(ctx context.Context, target Target) (int64, error) {
	if _, err := s.initPagePV(ctx, target); err != nil {
		return 0, err
	}

	var countCmd *redis.IntCmd
	_, err := s.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		countCmd = pipe.Incr(ctx, pagePVKey(target))
		pipe.Expire(ctx, pagePVKey(target), expirationTTL)
		pipe.SAdd(ctx, pageInventoryKey(target.Host), target.Path)
		pipe.Expire(ctx, pageInventoryKey(target.Host), expirationTTL)
		return nil
	})
	if err != nil {
		return 0, err
	}

	count, err := countCmd.Result()
	if err != nil {
		return 0, err
	}

	s.log.Debug("page PV updated", counterLogFields("counter.page_pv.updated", map[string]any{"host": target.Host, "target_path": target.Path, "page_pv": count}))
	return count, nil
}

func (s *Service) RecordSiteUV(ctx context.Context, target Target, isNew bool) (int64, error) {
	if _, err := s.initSiteUV(ctx, target); err != nil {
		return 0, err
	}

	siteKey := siteUVKey(target.Host)
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

	s.log.Debug("site UV updated", counterLogFields("counter.site_uv.updated", map[string]any{"host": target.Host, "is_new_uv": isNew, "site_uv": count}))
	return count, nil
}

func (s *Service) initSitePV(ctx context.Context, target Target) (int64, error) {
	count, found, err := s.readCount(ctx, sitePVKey(target.Host))
	if err != nil || found {
		return count, err
	}

	count = s.fetchBusuanziSitePV(ctx, target)
	if err := s.storeCount(ctx, sitePVKey(target.Host), count); err != nil {
		return 0, err
	}

	return count, nil
}

func (s *Service) initPagePV(ctx context.Context, target Target) (int64, error) {
	count, found, err := s.readCount(ctx, pagePVKey(target))
	if err != nil {
		return 0, err
	}
	if found {
		return count, nil
	}

	count = s.fetchBusuanziPagePV(ctx, target)
	if err := s.storeCount(ctx, pagePVKey(target), count); err != nil {
		return 0, err
	}
	if err := s.rememberPage(ctx, target); err != nil {
		return 0, err
	}

	return count, nil
}

func (s *Service) initSiteUV(ctx context.Context, target Target) (int64, error) {
	count, found, err := s.readCount(ctx, siteUVKey(target.Host))
	if err != nil || found {
		return count, err
	}

	count = s.fetchBusuanziSiteUV(ctx, target)
	if err := s.storeCount(ctx, siteUVKey(target.Host), count); err != nil {
		return 0, err
	}

	return count, nil
}

func (s *Service) readCount(ctx context.Context, key string) (int64, bool, error) {
	value, err := s.redis.Get(ctx, key).Result()
	if err != nil {
		if err == redis.Nil {
			return 0, false, nil
		}
		return 0, false, err
	}

	count, err := parseInt(value)
	if err != nil {
		return 0, false, err
	}
	return count, true, nil
}

func (s *Service) storeCount(ctx context.Context, key string, count int64) error {
	if count < 0 {
		count = 0
	}
	return s.redis.Set(ctx, key, count, expirationTTL).Err()
}

func (s *Service) rememberPage(ctx context.Context, target Target) error {
	_, err := s.redis.Pipelined(ctx, func(pipe redis.Pipeliner) error {
		pipe.SAdd(ctx, pageInventoryKey(target.Host), target.Path)
		pipe.Expire(ctx, pageInventoryKey(target.Host), expirationTTL)
		return nil
	})
	return err
}

func siteUVKey(host string) string {
	return siteUVCountKeyPrefix + host
}

func sitePVKey(host string) string {
	return "pv:site:" + host
}

func pagePVKey(target Target) string {
	return fmt.Sprintf("pv:page:%s:%s", target.Host, target.Path)
}

func pageInventoryKey(host string) string {
	return pageInventoryKeyPrefix + host
}

func NormalizeTarget(host string, path string) Target {
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

	return Target{Host: host, Path: path}
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
