package app

import (
	"context"
	"encoding/json"
	"net/http"
	"time"

	"github.com/EvanNotFound/vercount/apps/api/internal/counter"
	"github.com/EvanNotFound/vercount/apps/api/internal/redis"
)

type Server struct {
	config  Config
	log     *Logger
	counter *counter.Service
	limit   *RateLimiter
	script  *ScriptServer
}

type countRequest struct {
	URL     string `json:"url"`
	IsNewUV bool   `json:"isNewUv"`
}

func NewServer(config Config, log *Logger, counterService *counter.Service, redisClient *redis.Client) *Server {
	return &Server{
		config:  config,
		log:     log,
		counter: counterService,
		limit:   NewRateLimiter(redisClient, log),
		script:  NewScriptServer(config.ScriptPath, log),
	}
}

func (s *Server) Routes() http.Handler {
	mux := http.NewServeMux()
	mux.Handle("/js", s.script)
	mux.HandleFunc("/log", s.handleV1)
	mux.HandleFunc("/api/v1/log", s.handleV1)
	mux.HandleFunc("/api/v2/log", s.handleV2)
	return mux
}

func (s *Server) handleV1(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)

	if r.Method == http.MethodOptions {
		writeV1Data(w, http.StatusOK, map[string]string{"message": "OK"})
		return
	}

	result := s.limit.Check(r.Context(), r)
	if !result.Success {
		writeV1Data(w, http.StatusTooManyRequests, map[string]string{"error": result.Error})
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.handleV1Get(w, r)
	case http.MethodPost:
		s.handleV1Post(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleV2(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)

	if r.Method == http.MethodOptions {
		writeV2Success(w, http.StatusOK, "CORS preflight successful", map[string]string{"message": "OK"})
		return
	}

	result := s.limit.Check(r.Context(), r)
	if !result.Success {
		writeV2Error(w, http.StatusTooManyRequests, result.Error, map[string]any{
			"limit":     result.Limit,
			"remaining": result.Remaining,
		})
		return
	}

	switch r.Method {
	case http.MethodGet:
		s.handleV2Get(w, r)
	case http.MethodPost:
		s.handleV2Post(w, r)
	default:
		w.WriteHeader(http.StatusMethodNotAllowed)
	}
}

func (s *Server) handleV1Get(w http.ResponseWriter, r *http.Request) {
	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		s.log.Warn("GET request with missing URL parameter", nil)
		writeV1Data(w, http.StatusBadRequest, map[string]string{"error": "Missing url parameter"})
		return
	}

	target, message := validateTargetURL(targetURL)
	if message != "" {
		s.log.Warn("Invalid URL for v1 GET", map[string]any{"url": targetURL, "message": message})
		writeV1Data(w, http.StatusOK, map[string]any{
			"error":   message,
			"site_uv": 0,
			"site_pv": 0,
			"page_pv": 0,
		})
		return
	}

	data, err := s.readCounts(r.Context(), target.Host, target.Path)
	if err != nil {
		s.log.Error("Failed to read counts", map[string]any{"error": err.Error(), "url": targetURL})
		writeV1Data(w, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		return
	}

	s.log.Info("Retrieved data for GET request", map[string]any{"host": target.Host, "path": target.Path, "site_uv": data.SiteUV, "site_pv": data.SitePV, "page_pv": data.PagePV})
	writeV1Data(w, http.StatusOK, data)
}

func (s *Server) handleV1Post(w http.ResponseWriter, r *http.Request) {
	data, ok := s.decodeCountRequest(w, r, false)
	if !ok {
		return
	}

	target, message := validateTargetURL(data.URL)
	if message != "" {
		s.log.Warn("Invalid URL for v1 POST", map[string]any{"url": data.URL, "message": message})
		writeV1Data(w, http.StatusOK, map[string]any{
			"error":   message,
			"site_uv": 0,
			"site_pv": 0,
			"page_pv": 0,
		})
		return
	}

	counts, err := s.writeCounts(r.Context(), target.Host, target.Path, data.IsNewUV)
	if err != nil {
		s.log.Error("Failed to update counts", map[string]any{"error": err.Error(), "url": data.URL})
		writeV1Data(w, http.StatusInternalServerError, map[string]string{"error": "Internal server error"})
		return
	}

	s.log.Info("Data updated", map[string]any{"host": target.Host, "path": target.Path, "isNewUv": data.IsNewUV, "site_uv": counts.SiteUV, "site_pv": counts.SitePV, "page_pv": counts.PagePV})
	writeV1Data(w, http.StatusOK, counts)
}

func (s *Server) handleV2Get(w http.ResponseWriter, r *http.Request) {
	targetURL := r.URL.Query().Get("url")
	if targetURL == "" {
		s.log.Warn("GET request with missing URL parameter", nil)
		writeV2Error(w, http.StatusBadRequest, "Missing url parameter", nil)
		return
	}

	target, message := validateTargetURL(targetURL)
	if message != "" {
		s.log.Warn("Invalid URL for v2 GET", map[string]any{"url": targetURL, "message": message})
		writeV2Success(w, http.StatusOK, message, zeroCounters())
		return
	}

	data, err := s.readCounts(r.Context(), target.Host, target.Path)
	if err != nil {
		s.log.Error("Failed to read counts", map[string]any{"error": err.Error(), "url": targetURL})
		writeV2Error(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	s.log.Info("Retrieved data for GET request", map[string]any{"host": target.Host, "path": target.Path, "site_uv": data.SiteUV, "site_pv": data.SitePV, "page_pv": data.PagePV})
	writeV2Success(w, http.StatusOK, "Data retrieved successfully", data)
}

func (s *Server) handleV2Post(w http.ResponseWriter, r *http.Request) {
	data, ok := s.decodeCountRequest(w, r, true)
	if !ok {
		return
	}

	target, message := validateTargetURL(data.URL)
	if message != "" {
		s.log.Warn("Invalid URL for v2 POST", map[string]any{"url": data.URL, "message": message})
		writeV2Success(w, http.StatusOK, message, zeroCounters())
		return
	}

	counts, err := s.writeCounts(r.Context(), target.Host, target.Path, data.IsNewUV)
	if err != nil {
		s.log.Error("Failed to update counts", map[string]any{"error": err.Error(), "url": data.URL})
		writeV2Error(w, http.StatusInternalServerError, "Internal server error", nil)
		return
	}

	s.log.Info("Data updated", map[string]any{"host": target.Host, "path": target.Path, "isNewUv": data.IsNewUV, "site_uv": counts.SiteUV, "site_pv": counts.SitePV, "page_pv": counts.PagePV})
	writeV2Success(w, http.StatusOK, "Data updated successfully", counts)
}

func (s *Server) decodeCountRequest(w http.ResponseWriter, r *http.Request, v2 bool) (countRequest, bool) {
	var data countRequest
	if err := json.NewDecoder(r.Body).Decode(&data); err != nil {
		if v2 {
			writeV2Error(w, http.StatusBadRequest, "Invalid JSON body", nil)
		} else {
			writeV1Data(w, http.StatusBadRequest, map[string]string{"error": "Invalid JSON body"})
		}
		return countRequest{}, false
	}

	if data.URL == "" {
		if v2 {
			writeV2Error(w, http.StatusBadRequest, "Missing url", nil)
		} else {
			writeV1Data(w, http.StatusBadRequest, map[string]string{"error": "Missing url"})
		}
		return countRequest{}, false
	}

	return data, true
}

func (s *Server) readCounts(ctx context.Context, host string, path string) (CounterData, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	siteUV, err := s.counter.FetchSiteUV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	sitePV, err := s.counter.FetchSitePV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	pagePV, err := s.counter.FetchPagePV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	return CounterData{SiteUV: siteUV, SitePV: sitePV, PagePV: pagePV}, nil
}

func (s *Server) writeCounts(ctx context.Context, host string, path string, isNewUV bool) (CounterData, error) {
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	siteUV, err := s.counter.RecordSiteUV(ctx, host, isNewUV)
	if err != nil {
		return CounterData{}, err
	}

	sitePV, err := s.counter.IncrementSitePV(ctx, host)
	if err != nil {
		return CounterData{}, err
	}

	pagePV, err := s.counter.IncrementPagePV(ctx, host, path)
	if err != nil {
		return CounterData{}, err
	}

	return CounterData{SiteUV: siteUV, SitePV: sitePV, PagePV: pagePV}, nil
}
