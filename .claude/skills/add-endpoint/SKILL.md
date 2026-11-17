---
name: add-endpoint
description: Add or change a backend API endpoint end to end, from SQL to the generated frontend hook. Use when asked to add, change or remove an endpoint, route, API call or field in a response or request.
---

# Add an endpoint

Read `docs/backend.md` and `docs/api-contract.md` first. Work in this order, inside-out, so each layer compiles
before the next one uses it:

1. **Schema** (if needed): use the `db-migration` skill.
2. **Query**: add a named query to `backend/db/queries/<table>.sql`, then `make gen`.
3. **Repository**: add the method to `internal/<domain>/repository.go`, mapping rows to domain types and
   `pgx.ErrNoRows` to `apperr.ErrNotFound`.
4. **Service**: add the method to the `Repository` interface and to `Service`. Put validation and business
   rules here, returning `apperr` kinds.
5. **Handler**: request/response DTOs with `// @name`, the handler method, its swag annotations (with `@ID`,
   `@Tags` and every `@Failure`), and the route in `Register`. Add the method to the handler's `service` interface.
6. **Generate**: `make gen`. Check the new path in `backend/api/swagger.json` and the new hook in
   `frontend/src/shared/api/generated/<tag>/`.
7. **Frontend adapter**: wrap the hook in `features/<domain>/api/`, mapping DTOs to domain types and
   invalidating affected queries on success.
8. **Tests**: service test for the rules, handler test for status codes.
9. `make gen-check && make check`.

For a breaking change (renamed or removed field), follow "Breaking changes" in `docs/api-contract.md`.
