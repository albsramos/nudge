package reminder

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"strings"
	"time"
	"unicode/utf8"

	"github.com/google/uuid"

	"github.com/albsramos/nudge/backend/internal/platform/apperr"
)

// ErrSubscriptionGone means the push service says the subscription no longer exists (HTTP 404/410).
var ErrSubscriptionGone = errors.New("push subscription gone")

const (
	maxTitle      = 200
	maxBody       = 1000
	maxAttempts   = 5
	maxAhead      = 2 * 366 * 24 * time.Hour
	pastTolerance = 5 * time.Minute
	keepSent      = 7 * 24 * time.Hour
)

// Repository is what the service needs from storage. It's declared here, by its consumer.
type Repository interface {
	Create(ctx context.Context, r NewReminder) (Reminder, error)
	Delete(ctx context.Context, id uuid.UUID) error
	ClaimDue(ctx context.Context, limit int) ([]Reminder, error)
	Release(ctx context.Context, id uuid.UUID, maxAttempts int) error
	DeleteByEndpoint(ctx context.Context, endpoint string) error
	DeleteSentBefore(ctx context.Context, before time.Time) error
}

// Sender delivers one encrypted push message.
type Sender interface {
	Send(ctx context.Context, sub Subscription, payload []byte) error
}

// Service holds the business rules. It knows nothing about HTTP or SQL.
type Service struct {
	repo   Repository
	sender Sender
	now    func() time.Time
}

func NewService(repo Repository, sender Sender) *Service {
	return &Service{repo: repo, sender: sender, now: time.Now}
}

func (s *Service) Create(ctx context.Context, in NewReminder) (Reminder, error) {
	in.Title = strings.TrimSpace(in.Title)
	in.Body = strings.TrimSpace(in.Body)
	in.NoteID = strings.TrimSpace(in.NoteID)
	now := s.now()
	switch {
	case !strings.HasPrefix(in.Subscription.Endpoint, "https://"):
		return Reminder{}, fmt.Errorf("%w: subscription endpoint must be https", apperr.ErrInvalid)
	case in.Subscription.P256dh == "" || in.Subscription.Auth == "":
		return Reminder{}, fmt.Errorf("%w: subscription keys are required", apperr.ErrInvalid)
	case in.NoteID == "" || len(in.NoteID) > 100:
		return Reminder{}, fmt.Errorf("%w: noteId must be 1 to 100 characters", apperr.ErrInvalid)
	case utf8.RuneCountInString(in.Title) == 0:
		return Reminder{}, fmt.Errorf("%w: title is required", apperr.ErrInvalid)
	case in.FireAt.Before(now.Add(-pastTolerance)):
		return Reminder{}, fmt.Errorf("%w: fireAt is in the past", apperr.ErrInvalid)
	case in.FireAt.After(now.Add(maxAhead)):
		return Reminder{}, fmt.Errorf("%w: fireAt is too far ahead", apperr.ErrInvalid)
	}
	in.Title = truncate(in.Title, maxTitle)
	in.Body = truncate(in.Body, maxBody)
	return s.repo.Create(ctx, in)
}

func (s *Service) Delete(ctx context.Context, id uuid.UUID) error {
	return s.repo.Delete(ctx, id)
}

// DispatchDue sends every reminder whose time has come and returns how many were delivered.
func (s *Service) DispatchDue(ctx context.Context) (int, error) {
	due, err := s.repo.ClaimDue(ctx, 100)
	if err != nil {
		return 0, err
	}
	sent := 0
	for _, r := range due {
		payload, err := json.Marshal(Notification{
			ReminderID: r.ID.String(), NoteID: r.NoteID, Title: r.Title, Body: r.Body,
			FireAt: r.FireAt.UTC().Format(time.RFC3339),
		})
		if err != nil {
			return sent, err
		}
		switch err := s.sender.Send(ctx, r.Subscription, payload); {
		case err == nil:
			sent++
		case errors.Is(err, ErrSubscriptionGone):
			if err := s.repo.DeleteByEndpoint(ctx, r.Subscription.Endpoint); err != nil {
				return sent, err
			}
		default:
			slog.WarnContext(ctx, "push failed, will retry", "reminder", r.ID, "err", err)
			if err := s.repo.Release(ctx, r.ID, maxAttempts); err != nil {
				return sent, err
			}
		}
	}
	return sent, nil
}

// Run dispatches due reminders every interval until ctx is cancelled.
func (s *Service) Run(ctx context.Context, interval time.Duration) {
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		if _, err := s.DispatchDue(ctx); err != nil && ctx.Err() == nil {
			slog.ErrorContext(ctx, "dispatch reminders", "err", err)
		}
		if err := s.repo.DeleteSentBefore(ctx, s.now().Add(-keepSent)); err != nil && ctx.Err() == nil {
			slog.ErrorContext(ctx, "clean up sent reminders", "err", err)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

func truncate(s string, n int) string {
	if utf8.RuneCountInString(s) <= n {
		return s
	}
	return string([]rune(s)[:n-1]) + "…"
}
