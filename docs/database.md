# Database

Postgres, migrations with goose, queries with sqlc. Read this before changing the schema or a query. For the
step-by-step, use the `db-migration` skill.

## Migrations (`backend/db/migrations/`)

- Create with `make migration name=add_users`; never hand-number files.
- Every file has `-- +goose Up` and a working `-- +goose Down`.
- Never edit a migration that has been merged. Write a new one.
- Additive first: add a nullable column or a default, backfill, then tighten in a later migration.
- sqlc reads the migrations as the schema, so there is no separate schema file to keep in sync.

## Schema conventions

- Tables plural snake_case (`todos`, `order_items`); columns snake_case.
- `id uuid PRIMARY KEY DEFAULT gen_random_uuid()`.
- `created_at timestamptz NOT NULL DEFAULT now()` and `updated_at timestamptz NOT NULL DEFAULT now()` on every table.
- Booleans `is_` / `are_` prefixed (`is_done`), `NOT NULL` with a default.
- Enforce what the database can: `NOT NULL`, `CHECK`, `UNIQUE`, foreign keys with an explicit `ON DELETE`.
- Index every foreign key and every column you filter or sort on.

## Queries (`backend/db/queries/<table>.sql`)

- One file per table, each query named: `-- name: ListTodos :many`.
- `SELECT` the columns you need or `*` with `RETURNING *` on writes; sqlc generates the row type.
- `sqlc.yaml` maps `uuid` → `github.com/google/uuid.UUID` and `timestamptz` → `time.Time`.
- Run `make gen` after any change. Only `repository.go` files use the generated `db` package.
