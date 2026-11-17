# Nudge

**Open it:** https://albsramos.github.io/nudge/ (after the first deploy)

Quick notes with AI-powered reminders, as an installable PWA. Write "dentist friday, remind me thursday at 7pm".
Your own AI key (Claude, OpenAI, Gemini or any OpenAI-compatible model) turns it into a titled, tagged note and
a reminder, and a notification arrives on time, even with the app closed.

- **Frontend** (`frontend/`): React + TypeScript on Vite, CSS Modules, shadcn-style components (Radix), a custom
  service worker. Notes and keys stay on the device. Hosted on GitHub Pages.
- **Backend** (`backend/`): Go + Postgres. Stores reminders until they're due and sends them as Web Push.
  Optional: without it, reminders ring only while the app is open.

## Develop

Needs Go ≥ 1.26, Node ≥ 20, and Postgres (Docker, or a local server).

```bash
make setup
make db-up             # Postgres in Docker + migrations (or point DATABASE_URL at your own and run make migrate)
make dev-api           # API on :8080
make dev-web           # app on :5173, already pointed at the API
```

Open the app → Settings → pick a provider and paste an API key → write a note with "remind me…".

`make help` lists every target. `make check` runs Go vet/tests, tsc, oxlint and Vitest.

## Deploy

See [`docs/deploy.md`](docs/deploy.md): GitHub Pages for the app, any container host for the API.

Contributor and agent guide: [`AGENTS.md`](AGENTS.md).
