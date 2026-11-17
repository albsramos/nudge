// Command api is the HTTP server and reminder dispatcher. This file only wires dependencies together.
//
//	@title			Nudge API
//	@version		1.0
//	@description	Schedules note reminders and delivers them as Web Push notifications.
//	@BasePath		/
package main

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	migrations "github.com/albsramos/nudge/backend/db"
	"github.com/albsramos/nudge/backend/internal/platform/db"
	"github.com/albsramos/nudge/backend/internal/platform/httpx"
	"github.com/albsramos/nudge/backend/internal/platform/postgres"
	"github.com/albsramos/nudge/backend/internal/platform/webpush"
	"github.com/albsramos/nudge/backend/internal/reminder"
)

func main() {
	if err := run(); err != nil {
		slog.Error("server stopped", "err", err)
		os.Exit(1)
	}
}

func run() error {
	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()

	dbURL := mustEnv("DATABASE_URL")
	if os.Getenv("MIGRATE_ON_START") == "true" {
		if err := postgres.Migrate(ctx, dbURL, migrations.FS, "migrations"); err != nil {
			return err
		}
	}
	pool, err := postgres.Open(ctx, dbURL)
	if err != nil {
		return err
	}
	defer pool.Close()
	queries := db.New(pool)

	keys, err := webpush.LoadKeys(ctx, queries, os.Getenv("VAPID_PUBLIC_KEY"), os.Getenv("VAPID_PRIVATE_KEY"))
	if err != nil {
		return err
	}
	sender := reminder.NewPushSender(webpush.NewSender(keys, envOr("VAPID_SUBJECT", "mailto:admin@example.com")))
	reminders := reminder.NewService(reminder.NewPostgresRepository(queries), sender)
	go reminders.Run(ctx, 15*time.Second)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, _ *http.Request) { w.WriteHeader(http.StatusNoContent) })
	reminder.NewHandler(reminders, keys.Public).Register(mux)

	srv := &http.Server{
		Addr:              ":" + envOr("PORT", "8080"),
		Handler:           httpx.CORS(envOr("ALLOWED_ORIGINS", "*"), mux),
		ReadHeaderTimeout: 5 * time.Second,
	}
	go func() {
		<-ctx.Done()
		shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		_ = srv.Shutdown(shutdownCtx)
	}()

	slog.Info("listening", "addr", srv.Addr)
	if err := srv.ListenAndServe(); !errors.Is(err, http.ErrServerClosed) {
		return err
	}
	return nil
}

func mustEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		slog.Error("missing env var", "key", key)
		os.Exit(1)
	}
	return v
}

func envOr(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
