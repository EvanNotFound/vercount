package app

import (
	"net/http"
	"os"
	"path/filepath"
)

type ScriptServer struct {
	path string
	log  *Logger
}

func NewScriptServer(path string, log *Logger) *ScriptServer {
	return &ScriptServer{path: path, log: log}
}

func (s *ScriptServer) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	applyCORSHeaders(w)
	w.Header().Set("Cache-Control", "public, s-maxage=86400, max-age=86400")
	w.Header().Set("Vercel-CDN-Cache-Control", "max-age=3600")

	if r.Method != http.MethodGet && r.Method != http.MethodHead {
		w.WriteHeader(http.StatusMethodNotAllowed)
		return
	}

	fullPath := filepath.Clean(s.path)
	if _, err := os.Stat(fullPath); err != nil {
		s.log.Error("Script file not found", map[string]any{"path": fullPath, "error": err.Error()})
		http.NotFound(w, r)
		return
	}

	w.Header().Set("Content-Type", "application/javascript; charset=utf-8")
	http.ServeFile(w, r, fullPath)
}
