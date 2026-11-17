// Package httpx holds the JSON and error helpers every handler uses.
package httpx

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"strings"

	"github.com/albsramos/nudge/backend/internal/platform/apperr"
)

// ErrorResponse is the body of every non-2xx response.
type ErrorResponse struct {
	Message string `json:"message" example:"not found"`
} //	@name	ErrorResponse

func JSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if err := json.NewEncoder(w).Encode(body); err != nil {
		slog.Error("encode response", "err", err)
	}
}

func Decode(r *http.Request, dst any) error {
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(dst); err != nil {
		return errors.Join(apperr.ErrInvalid, err)
	}
	return nil
}

// Error maps an apperr kind to its status code. Unknown errors are logged and returned as a bare 500.
func Error(w http.ResponseWriter, r *http.Request, err error) {
	switch {
	case errors.Is(err, apperr.ErrNotFound):
		JSON(w, http.StatusNotFound, ErrorResponse{Message: "not found"})
	case errors.Is(err, apperr.ErrInvalid):
		JSON(w, http.StatusBadRequest, ErrorResponse{Message: err.Error()})
	case errors.Is(err, apperr.ErrConflict):
		JSON(w, http.StatusConflict, ErrorResponse{Message: err.Error()})
	default:
		slog.ErrorContext(r.Context(), "internal error", "err", err, "path", r.URL.Path)
		JSON(w, http.StatusInternalServerError, ErrorResponse{Message: "internal error"})
	}
}

// CORS lets the PWA call the API from another origin (GitHub Pages). allowed is a comma-separated
// list of origins, or "*". Requests carry no cookies, so a wildcard is safe.
func CORS(allowed string, next http.Handler) http.Handler {
	origins := map[string]bool{}
	for _, o := range strings.Split(allowed, ",") {
		origins[strings.TrimSuffix(strings.TrimSpace(o), "/")] = true
	}
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")
		if origin != "" && (origins["*"] || origins[origin]) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
			w.Header().Set("Access-Control-Max-Age", "86400")
		}
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}
