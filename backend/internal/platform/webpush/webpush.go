// Package webpush sends encrypted Web Push messages signed with the server's VAPID keys.
package webpush

import (
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"time"

	wp "github.com/SherClockHolmes/webpush-go"
	"github.com/jackc/pgx/v5"

	"github.com/albsramos/nudge/backend/internal/platform/db"
)

// ErrGone means the push service says the subscription no longer exists (HTTP 404/410).
var ErrGone = errors.New("push subscription gone")

// Keys is a VAPID key pair, URL-safe base64 as browsers expect.
type Keys struct {
	Public  string
	Private string
}

// LoadKeys returns the env keys when both are set, else the stored pair, generating and storing one on first run.
func LoadKeys(ctx context.Context, q db.Querier, envPublic, envPrivate string) (Keys, error) {
	if envPublic != "" && envPrivate != "" {
		return Keys{Public: envPublic, Private: envPrivate}, nil
	}
	row, err := q.GetVapidKeys(ctx)
	if err == nil {
		return Keys{Public: row.PublicKey, Private: row.PrivateKey}, nil
	}
	if !errors.Is(err, pgx.ErrNoRows) {
		return Keys{}, fmt.Errorf("load vapid keys: %w", err)
	}
	private, public, err := wp.GenerateVAPIDKeys()
	if err != nil {
		return Keys{}, fmt.Errorf("generate vapid keys: %w", err)
	}
	if err := q.InsertVapidKeys(ctx, db.InsertVapidKeysParams{PublicKey: public, PrivateKey: private}); err != nil {
		return Keys{}, fmt.Errorf("store vapid keys: %w", err)
	}
	// Re-read: another instance may have inserted first.
	row, err = q.GetVapidKeys(ctx)
	if err != nil {
		return Keys{}, fmt.Errorf("reload vapid keys: %w", err)
	}
	return Keys{Public: row.PublicKey, Private: row.PrivateKey}, nil
}

// Sender delivers encrypted Web Push messages.
type Sender struct {
	keys    Keys
	subject string
	client  *http.Client
}

// NewSender needs a contact for the push services: a mailto: or https: URL.
func NewSender(keys Keys, subject string) *Sender {
	return &Sender{keys: keys, subject: subject, client: &http.Client{Timeout: 15 * time.Second}}
}

// Send delivers payload to one browser subscription.
func (s *Sender) Send(ctx context.Context, endpoint, p256dh, auth string, payload []byte) error {
	resp, err := wp.SendNotificationWithContext(ctx, payload, &wp.Subscription{
		Endpoint: endpoint,
		Keys:     wp.Keys{P256dh: p256dh, Auth: auth},
	}, &wp.Options{
		HTTPClient:      s.client,
		Subscriber:      s.subject,
		VAPIDPublicKey:  s.keys.Public,
		VAPIDPrivateKey: s.keys.Private,
		TTL:             24 * 60 * 60,
		Urgency:         wp.UrgencyHigh,
	})
	if err != nil {
		return fmt.Errorf("send push: %w", err)
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	switch {
	case resp.StatusCode == http.StatusNotFound || resp.StatusCode == http.StatusGone:
		return ErrGone
	case resp.StatusCode >= 300:
		return fmt.Errorf("push service returned %d", resp.StatusCode)
	}
	return nil
}
