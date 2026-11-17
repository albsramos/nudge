# Deploy

Read this before deploying, or before touching the PWA setup, the service worker or Web Push.

## Frontend: GitHub Pages

`.github/workflows/pages.yml` runs on every push to `main`, or by hand (Actions → "Deploy to GitHub Pages" →
Run workflow). It checks the backend and frontend, builds with `BASE_PATH=/<repo>/`, and force-pushes
`frontend/dist` to the `gh-pages` branch, which GitHub Pages serves (Settings → Pages → Source: Deploy from a
branch, `gh-pages`, root). The repository must be public on a free GitHub plan.

Optional: Settings → Secrets and variables → Actions → Variables → `NUDGE_SERVER_URL` = your API's URL. It
becomes the default server in the app; users can still change it in Settings.

The app is at `https://<user>.github.io/<repo>/`. GitHub Pages serves HTTPS, which service workers, push and
"install" all require.

## Backend: Railway (or any container host)

The root `Dockerfile` builds the server and `railway.json` sets its health check, so on Railway it's:
New Project → Deploy from GitHub repo → this repo; + New → Database → PostgreSQL; set the variables below
(`DATABASE_URL` = `${{Postgres.DATABASE_URL}}`); Settings → Networking → Generate Domain. Paste that URL into
the app's Settings → Server URL. It must run all the time (no sleeping free tier), or reminders go out late.

The image applies migrations on start (`MIGRATE_ON_START=true`). `backend/Dockerfile` builds the same server
from inside `backend/`.

| Variable | Required | Meaning |
|----------|----------|---------|
| `DATABASE_URL` | yes | Postgres connection string |
| `VAPID_SUBJECT` | yes in production | `mailto:you@example.com`: push services contact this if something's wrong |
| `ALLOWED_ORIGINS` | recommended | `https://<user>.github.io` (comma-separated, or `*`, the default) |
| `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | no | Web Push keys. Unset: generated on first start and kept in the `vapid_keys` table |
| `PORT` | no | default `8080` |
| `MIGRATE_ON_START` | no | `true` in the image; `make migrate` locally |

Keep the VAPID keys stable: changing them invalidates every browser's push subscription (the app
re-subscribes on the next reminder it schedules).

## Installing the PWA

- **Android / desktop Chrome or Edge**: open the site → "Install app" in the menu or address bar.
- **iPhone / iPad (iOS 16.4+)**: Safari → Share → Add to Home Screen, then open Nudge from the Home Screen and
  tap "Turn on". iOS only delivers Web Push to installed web apps.

## How a reminder travels

1. The note's text goes from the browser straight to the AI provider, with the user's key.
2. For each reminder, the browser subscribes to push with the server's VAPID key (`GET /api/push/public-key`)
   and sends `POST /api/reminders` with the subscription, title, body and time.
3. Every 15 s the server claims due reminders, encrypts each one for its subscription and posts it to the
   browser vendor's push service. `src/sw.ts` receives it and shows the notification, even if the app is closed.
4. Clicking it opens `?note=<id>`, which scrolls to and highlights the note.

Without a server (or if scheduling fails), the reminder is "in-app": `reminderClock.ts` rings it while the app
is open, and catches up on ones missed in the last 12 hours when it opens.
