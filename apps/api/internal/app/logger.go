package app

import (
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"
)

type Logger struct {
	debug bool
}

func NewLogger(debug bool) *Logger {
	log.SetOutput(os.Stdout)
	log.SetFlags(0)
	return &Logger{debug: debug}
}

func (l *Logger) Debug(message string, data any) {
	if !l.debug {
		return
	}
	l.print("DEBUG", message, data)
}

func (l *Logger) Info(message string, data any) {
	l.print("INFO", message, data)
}

func (l *Logger) Warn(message string, data any) {
	l.print("WARN", message, data)
}

func (l *Logger) Error(message string, data any) {
	l.print("ERROR", message, data)
}

func (l *Logger) print(level string, message string, data any) {
	prefix := fmt.Sprintf("[%s] %s: %s", time.Now().UTC().Format(time.RFC3339), level, message)
	if data == nil {
		log.Print(prefix)
		return
	}

	encoded, err := json.Marshal(data)
	if err != nil {
		log.Printf("%s %v", prefix, data)
		return
	}

	log.Printf("%s %s", prefix, string(encoded))
}
