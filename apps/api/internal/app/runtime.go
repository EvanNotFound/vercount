package app

import (
	"fmt"
	"io"
	"log/slog"
	"os"
	"sort"
	"strings"
)

const (
	containerScriptPath = "/app/public/js/client.min.js"
	localScriptPath     = "../web/public/js/client.min.js"
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

	scriptPath := resolveScriptPath()
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

func resolveScriptPath() string {
	if override := strings.TrimSpace(os.Getenv("SCRIPT_PATH")); override != "" {
		return override
	}

	if _, err := os.Stat(containerScriptPath); err == nil {
		return containerScriptPath
	}

	return localScriptPath
}

type Logger struct {
	debug bool
	inner *slog.Logger
}

func NewLogger(debug bool) *Logger {
	return newLogger(debug, os.Stdout)
}

func newLogger(debug bool, writer io.Writer) *Logger {
	if writer == nil {
		writer = os.Stdout
	}

	options := &slog.HandlerOptions{
		Level: slog.LevelInfo,
		ReplaceAttr: func(_ []string, attr slog.Attr) slog.Attr {
			if attr.Key == slog.LevelKey {
				if level, ok := attr.Value.Any().(slog.Level); ok {
					attr.Value = slog.StringValue(strings.ToLower(level.String()))
				}
			}
			return attr
		},
	}
	if debug {
		options.Level = slog.LevelDebug
	}

	var handler slog.Handler
	if debug {
		handler = slog.NewTextHandler(writer, options)
	} else {
		handler = slog.NewJSONHandler(writer, options)
	}

	env := "production"
	if debug {
		env = "development"
	}

	return &Logger{
		debug: debug,
		inner: slog.New(handler).With("service", "api", "env", env),
	}
}

func (l *Logger) Debug(message string, data any) {
	if !l.debug {
		return
	}
	l.log(slog.LevelDebug, message, data)
}

func (l *Logger) Info(message string, data any) {
	l.log(slog.LevelInfo, message, data)
}

func (l *Logger) Warn(message string, data any) {
	l.log(slog.LevelWarn, message, data)
}

func (l *Logger) Error(message string, data any) {
	l.log(slog.LevelError, message, data)
}

func (l *Logger) log(level slog.Level, message string, data any) {
	if l == nil || l.inner == nil {
		return
	}

	args := slogArgs(data)
	switch level {
	case slog.LevelDebug:
		l.inner.Debug(message, args...)
	case slog.LevelWarn:
		l.inner.Warn(message, args...)
	case slog.LevelError:
		l.inner.Error(message, args...)
	default:
		l.inner.Info(message, args...)
	}
}

func slogArgs(data any) []any {
	switch value := data.(type) {
	case nil:
		return nil
	case error:
		return []any{"error", value.Error()}
	case map[string]any:
		keys := make([]string, 0, len(value))
		for key := range value {
			keys = append(keys, key)
		}
		sort.Strings(keys)

		args := make([]any, 0, len(value)*2)
		for _, key := range keys {
			args = append(args, key, sanitizeLogValue(value[key]))
		}
		return args
	default:
		return []any{"data", sanitizeLogValue(value)}
	}
}

func sanitizeLogValue(value any) any {
	switch typed := value.(type) {
	case nil:
		return nil
	case error:
		return typed.Error()
	case map[string]any:
		cleaned := make(map[string]any, len(typed))
		for key, nested := range typed {
			cleaned[key] = sanitizeLogValue(nested)
		}
		return cleaned
	case []any:
		cleaned := make([]any, len(typed))
		for index, nested := range typed {
			cleaned[index] = sanitizeLogValue(nested)
		}
		return cleaned
	default:
		return typed
	}
}
