package reminder

import (
	"context"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func newTestMux() *http.ServeMux {
	mux := http.NewServeMux()
	NewHandler(newTestService(&fakeRepo{}, &fakeSender{}), "PUBKEY").Register(mux)
	return mux
}

func TestHandlerStatusCodes(t *testing.T) {
	future := now.Add(time.Hour).Format(time.RFC3339)
	body := `{"subscription":{"endpoint":"https://push.example/a","keys":{"p256dh":"p","auth":"a"}},` +
		`"noteId":"n1","title":"Call mom","body":"","fireAt":"` + future + `"}`
	tests := []struct {
		name, method, path, body string
		want                     int
	}{
		{"public key", http.MethodGet, "/api/push/public-key", "", http.StatusOK},
		{"create", http.MethodPost, "/api/reminders", body, http.StatusCreated},
		{"create with unknown field", http.MethodPost, "/api/reminders", `{"nope":1}`, http.StatusBadRequest},
		{"delete with bad id", http.MethodDelete, "/api/reminders/xyz", "", http.StatusBadRequest},
		{"delete missing", http.MethodDelete, "/api/reminders/7b0c1c3e-8f5e-4b8e-9c55-2f1e0f6d1a11", "", http.StatusNotFound},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequestWithContext(context.Background(), tt.method, tt.path, strings.NewReader(tt.body))
			rec := httptest.NewRecorder()
			newTestMux().ServeHTTP(rec, req)
			if rec.Code != tt.want {
				t.Fatalf("status = %d, want %d (body %s)", rec.Code, tt.want, rec.Body)
			}
		})
	}
}
