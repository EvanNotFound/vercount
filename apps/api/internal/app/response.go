package app

import (
	"encoding/json"
	"net/http"
)

type CounterData struct {
	SiteUV int64 `json:"site_uv"`
	SitePV int64 `json:"site_pv"`
	PagePV int64 `json:"page_pv"`
}

type SuccessResponse struct {
	Status  string `json:"status"`
	Message string `json:"message"`
	Data    any    `json:"data,omitempty"`
}

type ErrorResponse struct {
	Status  string         `json:"status"`
	Message string         `json:"message"`
	Code    int            `json:"code"`
	Details map[string]any `json:"details,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}

func writeV1Data(w http.ResponseWriter, status int, payload any) {
	writeJSON(w, status, payload)
}

func writeV2Success(w http.ResponseWriter, status int, message string, data any) {
	writeJSON(w, status, SuccessResponse{
		Status:  "success",
		Message: message,
		Data:    data,
	})
}

func writeV2Error(w http.ResponseWriter, status int, message string, details map[string]any) {
	writeJSON(w, status, ErrorResponse{
		Status:  "error",
		Message: message,
		Code:    status,
		Details: details,
	})
}

func zeroCounters() CounterData {
	return CounterData{}
}

func applyCORSHeaders(w http.ResponseWriter) {
	w.Header().Set("Access-Control-Allow-Credentials", "true")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, HEAD, DELETE, PATCH, POST, PUT, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, X-Browser-Token")
	w.Header().Set("Access-Control-Max-Age", "86400")
}
