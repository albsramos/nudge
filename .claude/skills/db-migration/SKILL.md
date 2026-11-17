---
name: db-migration
description: Change the Postgres schema safely with a goose migration and update the sqlc queries. Use when asked to add, change or drop a table, column, index or constraint.
---

# Database migration

Read `docs/database.md` first.

1. `make migration name=<what_changes>` (for example `add_due_date_to_todos`).
2. Write `-- +goose Up` and a `-- +goose Down` that really reverses it. Follow the schema conventions.
3. If the change could break running code or lock a big table (dropping or renaming a column, adding
   `NOT NULL` without a default, a non-concurrent index on a large table), split it: additive migration now,
   code change, cleanup migration later. Say so to the user.
4. Update the queries in `backend/db/queries/`, then `make gen`.
5. Fix the repositories the compiler points at. Map new columns into the domain types only if the domain needs them.
6. `make migrate`, then check the down path: `cd backend && go tool goose -dir db/migrations postgres "$DATABASE_URL" down`
   and `make migrate` again.
7. `make gen-check && make check`.

Never edit a migration that's already merged.
