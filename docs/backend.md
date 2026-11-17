# Backend

Go with the standard library router, Postgres through pgx and sqlc. Read this before editing Go code under
`backend/`. The first domain in `internal/` is the working example of every rule here.

## Layers (clean architecture)

```
cmd/api/main.go            wiring only: config, pool, repo → service → handler, server
internal/<domain>/
  model.go                 domain types. No json or db tags.
  service.go               business rules + the Repository interface it needs
  repository.go            Postgres implementation, maps sqlc rows ↔ domain types
  handler.go               HTTP: request/response DTOs, swagger annotations, decode → service → encode
  service_test.go          service tests with a fake repository
internal/platform/
  apperr/                  error kinds: ErrNotFound, ErrInvalid, ErrConflict
  httpx/                   JSON, Decode, Error (apperr kind → status code)
  postgres/                pool
  db/                      sqlc output. Never edit.
```

- **Package per domain, a file per layer.** Not `handlers/`, `services/`, `repositories/` packages.
- **Interfaces live with their consumer**: `service.go` declares `Repository`, `handler.go` declares the
  `service` it calls. Implementations return concrete types.
- **Dependencies point inward**: `handler → service → repository`. A service never imports `net/http`, pgx
  or `internal/platform/db`. A handler never touches the repository.
- **Domains don't import each other's internals.** If `order` needs users, its service declares the small
  interface it needs and `main.go` passes the `user` service in.

## Errors

- Services return `apperr` kinds, wrapped with context: `fmt.Errorf("%w: title too long", apperr.ErrInvalid)`.
- Repositories turn `pgx.ErrNoRows` into `apperr.ErrNotFound` and wrap every other error with the operation.
- Handlers call `httpx.Error(w, r, err)` and nothing else. It maps kinds to 400/404/409, logs and hides
  anything unknown as 500.

## Handlers

- Request and response DTOs live in `handler.go`, with `json` tags in camelCase and `// @name <Type>` after
  the closing brace so the swagger names stay clean. Every handler has swag annotations, including an `@ID`
  (it becomes the Orval hook name). See `docs/api-contract.md`.
- Routes use method patterns: `mux.HandleFunc("DELETE /api/reminders/{id}", h.delete)`, `r.PathValue("id")`.
- Decode with `httpx.Decode` (rejects unknown fields). Validate in the service, not the handler.

## Conventions

- `context.Context` is the first argument of every service and repository method.
- Log with `log/slog`, only at the edges (handler errors, startup, the reminder dispatcher loop in
  `reminder.Service.Run`). Services otherwise return errors; they don't log.
- The dispatcher claims due reminders with `FOR UPDATE SKIP LOCKED` (marked sent before delivery), so several
  API instances can run side by side. A failed push goes back in the queue, up to 5 attempts; a 404/410 from
  the push service deletes every reminder for that subscription.
- Config comes from environment variables, read once in `main.go`.
- Transactions: the service asks the repository for a method that does the whole unit of work
  (`repo.PlaceOrder(ctx, ...)` using `pool.BeginTx` + `db.New(tx)`); SQL never leaks into the service.
