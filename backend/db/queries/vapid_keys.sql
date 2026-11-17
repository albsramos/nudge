-- name: GetVapidKeys :one
SELECT * FROM vapid_keys WHERE id = 1;

-- name: InsertVapidKeys :exec
INSERT INTO vapid_keys (public_key, private_key) VALUES ($1, $2) ON CONFLICT (id) DO NOTHING;
