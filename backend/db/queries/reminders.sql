-- name: CreateReminder :one
INSERT INTO reminders (endpoint, p256dh, auth, note_id, title, body, fire_at)
VALUES ($1, $2, $3, $4, $5, $6, $7)
RETURNING *;

-- name: DeleteReminder :execrows
DELETE FROM reminders WHERE id = $1;

-- name: ClaimDueReminders :many
-- Marks due reminders as sent before delivery, so two dispatchers never send the same one.
UPDATE reminders SET sent_at = now()
WHERE id IN (
    SELECT r.id FROM reminders r
    WHERE r.sent_at IS NULL AND r.fire_at <= now()
    ORDER BY r.fire_at
    LIMIT $1
    FOR UPDATE SKIP LOCKED
)
RETURNING *;

-- name: ReleaseReminder :exec
-- Puts a reminder whose delivery failed back in the queue, until it has failed too often.
UPDATE reminders SET sent_at = NULL, attempts = attempts + 1
WHERE id = $1 AND attempts + 1 < sqlc.arg(max_attempts)::integer;

-- name: DeleteRemindersByEndpoint :exec
DELETE FROM reminders WHERE endpoint = $1;

-- name: DeleteSentRemindersBefore :exec
DELETE FROM reminders WHERE sent_at IS NOT NULL AND sent_at < sqlc.arg(before)::timestamptz;
