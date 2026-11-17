# One entry point for humans, CI and agents. Run `make help` for the list.
DATABASE_URL ?= postgres://app:app@localhost:5432/app?sslmode=disable
export DATABASE_URL

.PHONY: help setup db-up db-down migrate migration gen gen-check dev-api dev-web check

help: ## List targets
	@grep -E '^[a-z-]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  %-12s %s\n", $$1, $$2}'

setup: ## Install dependencies
	cd backend && go mod download
	cd frontend && npm ci

db-up: ## Start Postgres in Docker and apply migrations
	docker compose up -d --wait db
	$(MAKE) migrate

db-down: ## Stop Postgres
	docker compose down

migrate: ## Apply pending migrations
	cd backend && go tool goose -dir db/migrations postgres "$(DATABASE_URL)" up

migration: ## Create a migration: make migration name=add_users
	cd backend && go tool goose -dir db/migrations -s create $(name) sql

gen: ## Regenerate sqlc, swagger and the Orval client
	cd backend && go tool sqlc generate
	cd backend && go tool swag fmt
	cd backend && go tool swag init -g cmd/api/main.go -o api --outputTypes json,yaml --parseInternal
	cd frontend && npm run gen

gen-check: gen ## Fail if generated code is out of date
	git diff --exit-code -- backend/internal/platform/db backend/api frontend/src/shared/api/generated

dev-api: ## Run the Go API on :8080 (generates its VAPID keys on first run)
	cd backend && go run ./cmd/api

dev-web: ## Run the Vite dev server (talks to the API on :8080, see frontend/.env.development)
	cd frontend && npm run dev

check: ## Vet, test, typecheck and lint everything
	cd backend && go vet ./... && go test ./...
	cd frontend && npm run typecheck && npm run lint && npm test
