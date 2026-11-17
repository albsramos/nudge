package reminder

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"

	"github.com/albsramos/nudge/backend/internal/platform/apperr"
	"github.com/albsramos/nudge/backend/internal/platform/db"
)

// PostgresRepository implements Repository with sqlc-generated queries.
type PostgresRepository struct {
	q db.Querier
}

func NewPostgresRepository(q db.Querier) *PostgresRepository {
	return &PostgresRepository{q: q}
}

func (r *PostgresRepository) Create(ctx context.Context, in NewReminder) (Reminder, error) {
	row, err := r.q.CreateReminder(ctx, db.CreateReminderParams{
		Endpoint: in.Subscription.Endpoint,
		P256dh:   in.Subscription.P256dh,
		Auth:     in.Subscription.Auth,
		NoteID:   in.NoteID,
		Title:    in.Title,
		Body:     in.Body,
		FireAt:   in.FireAt,
	})
	if err != nil {
		return Reminder{}, fmt.Errorf("create reminder: %w", err)
	}
	return fromRow(row), nil
}

func (r *PostgresRepository) Delete(ctx context.Context, id uuid.UUID) error {
	n, err := r.q.DeleteReminder(ctx, id)
	if err != nil {
		return fmt.Errorf("delete reminder: %w", err)
	}
	if n == 0 {
		return apperr.ErrNotFound
	}
	return nil
}

func (r *PostgresRepository) ClaimDue(ctx context.Context, limit int) ([]Reminder, error) {
	rows, err := r.q.ClaimDueReminders(ctx, int32(limit))
	if err != nil {
		return nil, fmt.Errorf("claim due reminders: %w", err)
	}
	out := make([]Reminder, len(rows))
	for i, row := range rows {
		out[i] = fromRow(row)
	}
	return out, nil
}

func (r *PostgresRepository) Release(ctx context.Context, id uuid.UUID, maxAttempts int) error {
	if err := r.q.ReleaseReminder(ctx, db.ReleaseReminderParams{ID: id, MaxAttempts: int32(maxAttempts)}); err != nil {
		return fmt.Errorf("release reminder: %w", err)
	}
	return nil
}

func (r *PostgresRepository) DeleteByEndpoint(ctx context.Context, endpoint string) error {
	if err := r.q.DeleteRemindersByEndpoint(ctx, endpoint); err != nil {
		return fmt.Errorf("delete reminders by endpoint: %w", err)
	}
	return nil
}

func (r *PostgresRepository) DeleteSentBefore(ctx context.Context, before time.Time) error {
	if err := r.q.DeleteSentRemindersBefore(ctx, before); err != nil {
		return fmt.Errorf("delete sent reminders: %w", err)
	}
	return nil
}

func fromRow(row db.Reminder) Reminder {
	return Reminder{
		ID:           row.ID,
		Subscription: Subscription{Endpoint: row.Endpoint, P256dh: row.P256dh, Auth: row.Auth},
		NoteID:       row.NoteID,
		Title:        row.Title,
		Body:         row.Body,
		FireAt:       row.FireAt,
		SentAt:       row.SentAt,
		CreatedAt:    row.CreatedAt,
	}
}
