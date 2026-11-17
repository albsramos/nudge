// Package reminder is the reminder domain: a note's due time, delivered as a Web Push notification.
package reminder

import (
	"time"

	"github.com/google/uuid"
)

// Subscription is where to deliver: the browser's PushSubscription.
type Subscription struct {
	Endpoint string
	P256dh   string
	Auth     string
}

// Reminder is the domain model. No JSON or DB tags: transport and storage map to and from it.
type Reminder struct {
	ID           uuid.UUID
	Subscription Subscription
	NoteID       string
	Title        string
	Body         string
	FireAt       time.Time
	SentAt       *time.Time
	CreatedAt    time.Time
}

// NewReminder is what a client asks to schedule.
type NewReminder struct {
	Subscription Subscription
	NoteID       string
	Title        string
	Body         string
	FireAt       time.Time
}

// Notification is the payload the service worker receives and shows.
type Notification struct {
	ReminderID string `json:"reminderId"`
	NoteID     string `json:"noteId"`
	Title      string `json:"title"`
	Body       string `json:"body"`
	FireAt     string `json:"fireAt"`
}
