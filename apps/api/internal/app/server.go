package app

import (
	"net/http"
	"time"

	"github.com/EvanNotFound/vercount/apps/api/internal/api"
	"github.com/EvanNotFound/vercount/apps/api/internal/counter"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
	redis "github.com/redis/go-redis/v9"
)

type Server struct {
	log    *Logger
	public *api.PublicHandler
	logAPI *api.LogHandler
}

func NewServer(config Config, log *Logger, counterService *counter.Service, redisClient *redis.Client) *Server {
	return &Server{
		log:    log,
		public: api.NewPublicHandler(config.ScriptPath, log, redisClient),
		logAPI: api.NewLogHandler(log, counterService, redisClient),
	}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(middleware.RequestID)
	r.Use(requestLoggingMiddleware(s.log))

	r.Get("/", s.public.Root)
	r.Get("/healthz", s.public.Healthz)
	r.Get("/js", s.public.Script)
	r.Head("/js", s.public.Script)

	r.Options("/log", s.logAPI.V1Options)
	r.Get("/log", s.logAPI.V1Get)
	r.Post("/log", s.logAPI.V1Post)

	r.Route("/api", func(r chi.Router) {
		r.Route("/v1", func(r chi.Router) {
			r.Options("/log", s.logAPI.V1Options)
			r.Get("/log", s.logAPI.V1Get)
			r.Post("/log", s.logAPI.V1Post)
		})

		r.Route("/v2", func(r chi.Router) {
			r.Options("/log", s.logAPI.V2Options)
			r.Get("/log", s.logAPI.V2Get)
			r.Post("/log", s.logAPI.V2Post)
		})
	})

	return r
}

func requestLoggingMiddleware(log *Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			startedAt := time.Now()
			wrapped := middleware.NewWrapResponseWriter(w, r.ProtoMajor)

			next.ServeHTTP(wrapped, r)

			status := wrapped.Status()
			if status == 0 {
				status = http.StatusOK
			}

			route := routePattern(r)
			log.Info("request completed", map[string]any{
				"event":       "request.completed",
				"request_id":  middleware.GetReqID(r.Context()),
				"method":      r.Method,
				"route":       route,
				"path":        r.URL.Path,
				"status":      status,
				"duration_ms": time.Since(startedAt).Milliseconds(),
			})
		})
	}
}

func routePattern(r *http.Request) string {
	if routeContext := chi.RouteContext(r.Context()); routeContext != nil {
		if pattern := routeContext.RoutePattern(); pattern != "" {
			return pattern
		}
	}

	return r.URL.Path
}
