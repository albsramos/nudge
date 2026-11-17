-- +goose Up
-- One row: the server's Web Push (VAPID) key pair, generated on first start when not given by env.
CREATE TABLE vapid_keys (
    id          integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    public_key  text        NOT NULL,
    private_key text        NOT NULL,
    created_at  timestamptz NOT NULL DEFAULT now()
);

-- +goose Down
DROP TABLE vapid_keys;
