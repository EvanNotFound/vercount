package app

import (
	"fmt"
	"os"
	"strings"
)

type Config struct {
	Addr       string
	RedisURL   string
	ScriptPath string
	Debug      bool
}

func LoadConfig() (Config, error) {
	port := strings.TrimSpace(os.Getenv("PORT"))
	if port == "" {
		port = "8080"
	}

	addr := port
	if !strings.HasPrefix(addr, ":") {
		addr = ":" + addr
	}

	redisURL := strings.TrimSpace(os.Getenv("REDIS_URL"))
	if redisURL == "" {
		return Config{}, fmt.Errorf("REDIS_URL is required")
	}

	scriptPath := strings.TrimSpace(os.Getenv("SCRIPT_PATH"))
	if scriptPath == "" {
		scriptPath = "../web/public/js/client.min.js"
	}

	debug := strings.EqualFold(strings.TrimSpace(os.Getenv("DEBUG")), "true")

	return Config{
		Addr:       addr,
		RedisURL:   redisURL,
		ScriptPath: scriptPath,
		Debug:      debug,
	}, nil
}

func LoadEnvFile(path string) error {
	data, err := os.ReadFile(path)
	if err != nil {
		if os.IsNotExist(err) {
			return nil
		}
		return err
	}

	lines := strings.Split(string(data), "\n")
	for _, line := range lines {
		line = strings.TrimSpace(line)
		if line == "" || strings.HasPrefix(line, "#") {
			continue
		}

		parts := strings.SplitN(line, "=", 2)
		if len(parts) != 2 {
			continue
		}

		key := strings.TrimSpace(parts[0])
		value := strings.TrimSpace(parts[1])
		if key == "" || os.Getenv(key) != "" {
			continue
		}

		value = strings.Trim(value, `"'`)
		_ = os.Setenv(key, value)
	}

	return nil
}
