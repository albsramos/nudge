# API contract

The backend owns the contract. Swag reads the annotations on the Go handlers and writes
`backend/api/swagger.json`; Orval reads that and writes typed TanStack Query hooks, models and MSW mocks into
`frontend/src/shared/api/generated/`. Read this before touching annotations, `orval.config.ts` or generated code.

## The flow

1. Change the handler and its annotations.
2. `make gen` (sqlc, `swag fmt`, `swag init`, `orval`).
3. Fix the TypeScript errors in the feature's `api/` adapter. Components shouldn't need to change.
4. Commit the Go change and the regenerated files together. `make gen-check` fails CI if they drift.

## Annotations

```go
// create godoc
//
//	@Summary		Schedule a reminder
//	@Description	Stores a reminder and sends it as a Web Push notification at fireAt.
//	@Tags			reminders
//	@ID				createReminder
//	@Accept			json
//	@Produce		json
//	@Param			body	body		CreateReminderRequest	true	"Reminder to schedule"
//	@Success		201		{object}	ReminderResponse
//	@Failure		400		{object}	httpx.ErrorResponse
//	@Failure		500		{object}	httpx.ErrorResponse
//	@Router			/api/reminders [post]
```

- `@Tags` groups hooks into one generated file per tag (`generated/reminders/reminders.ts`).
- `@ID` is required and camelCase; Orval turns `createReminder` into the `createReminder()` function and the `useCreateReminder` hook.
- List every status the handler can return with `@Failure`.
- DTO types end with `// @name TypeName` so the schema is `ReminderResponse`, not `reminder.ReminderResponse`.
- Mark required fields with `validate:"required"`, otherwise the TypeScript type is optional.
- API-wide info (`@title`, `@version`, `@BasePath`) lives above `package main` in `cmd/api/main.go`.

## Orval

`frontend/orval.config.ts`: `react-query` client, `tags-split` mode, `fetch` through `src/shared/api/http.ts`
(`includeHttpResponseReturnType: false`, so hooks return the body and errors throw `ApiError`), MSW mocks for
tests. Don't add a second HTTP client.

## Breaking changes

Removing or renaming a field or endpoint breaks deployed clients. Add the new one, migrate the frontend, then
remove the old one in a later change.
