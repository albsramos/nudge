-- +goose Up
CREATE TABLE reminders (
    id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    endpoint   text        NOT NULL CHECK (endpoint LIKE 'https://%'),
    p256dh     text        NOT NULL,
    auth       text        NOT NULL,
    note_id    text        NOT NULL CHECK (length(note_id) BETWEEN 1 AND 100),
    title      text        NOT NULL CHECK (length(title) BETWEEN 1 AND 200),
    body       text        NOT NULL DEFAULT '' CHECK (length(body) <= 1000),
    fire_at    timestamptz NOT NULL,
    sent_at    timestamptz,
    attempts   integer     NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- The dispatcher only ever scans unsent reminders in fire order.
CREATE INDEX reminders_due_idx ON reminders (fire_at) WHERE sent_at IS NULL;
CREATE INDEX reminders_endpoint_idx ON reminders (endpoint);

-- +goose Down
DROP TABLE reminders;
