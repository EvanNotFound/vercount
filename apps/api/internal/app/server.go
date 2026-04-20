package app

import (
	"net/http"

	"github.com/EvanNotFound/vercount/apps/api/internal/api"
	"github.com/EvanNotFound/vercount/apps/api/internal/counter"
	"github.com/go-chi/chi/v5"
	redis "github.com/redis/go-redis/v9"
)

type Server struct {
	public *api.PublicHandler
	logAPI *api.LogHandler
}

func NewServer(config Config, log *Logger, counterService *counter.Service, redisClient *redis.Client) *Server {
	return &Server{
		public: api.NewPublicHandler(config.ScriptPath, log, redisClient),
		logAPI: api.NewLogHandler(log, counterService, redisClient),
	}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()

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
