package reminder

import (
	"context"
	"errors"

	"github.com/albsramos/nudge/backend/internal/platform/webpush"
)

// PushSender adapts webpush.Sender to the service's Sender.
type PushSender struct {
	push *webpush.Sender
}

func NewPushSender(push *webpush.Sender) *PushSender {
	return &PushSender{push: push}
}

func (p *PushSender) Send(ctx context.Context, sub Subscription, payload []byte) error {
	err := p.push.Send(ctx, sub.Endpoint, sub.P256dh, sub.Auth, payload)
	if errors.Is(err, webpush.ErrGone) {
		return ErrSubscriptionGone
	}
	return err
}
