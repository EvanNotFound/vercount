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
	r.Get("/bench/write", s.logAPI.BenchmarkWrite)

	registerCounterRoutes(r, "/log", s.logAPI.V1Options, s.logAPI.V1Get, s.logAPI.V1Post)

	r.Route("/api", func(r chi.Router) {
		r.Route("/v1", func(r chi.Router) {
			registerCounterRoutes(r, "/log", s.logAPI.V1Options, s.logAPI.V1Get, s.logAPI.V1Post)
		})

		r.Route("/v2", func(r chi.Router) {
			registerCounterRoutes(r, "/log", s.logAPI.V2Options, s.logAPI.V2Get, s.logAPI.V2Post)
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
			route := api.RoutePattern(r)
			fields := map[string]any{
				"request_id":  middleware.GetReqID(r.Context()),
				"method":      r.Method,
				"route":       route,
				"path":        r.URL.Path,
				"duration_ms": time.Since(startedAt).Milliseconds(),
			}
			if status != 0 {
				fields["status"] = status
			}

			if transportErr := r.Context().Err(); transportErr != nil {
				fields["event"] = "request.aborted"
				fields["transport_error"] = transportErr.Error()
				log.Warn("request aborted", fields)
				return
			}

			if status == 0 {
				status = http.StatusOK
				fields["status"] = status
			}

			fields["event"] = "request.completed"
			log.Info("request completed", fields)
		})
	}
}

func registerCounterRoutes(r chi.Router, path string, options http.HandlerFunc, get http.HandlerFunc, post http.HandlerFunc) {
	r.Options(path, options)
	r.Get(path, get)
	r.Post(path, post)
}
