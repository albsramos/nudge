package reminder

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/albsramos/nudge/backend/internal/platform/apperr"
)

// fakeRepo is an in-memory Repository for service tests.
type fakeRepo struct {
	created          []NewReminder
	due              []Reminder
	released         []uuid.UUID
	deletedEndpoints []string
}

func (f *fakeRepo) Create(_ context.Context, in NewReminder) (Reminder, error) {
	f.created = append(f.created, in)
	return Reminder{ID: uuid.New(), NoteID: in.NoteID, Title: in.Title, FireAt: in.FireAt}, nil
}
func (f *fakeRepo) Delete(context.Context, uuid.UUID) error { return apperr.ErrNotFound }
func (f *fakeRepo) ClaimDue(context.Context, int) ([]Reminder, error) {
	due := f.due
	f.due = nil
	return due, nil
}
func (f *fakeRepo) Release(_ context.Context, id uuid.UUID, _ int) error {
	f.released = append(f.released, id)
	return nil
}
func (f *fakeRepo) DeleteByEndpoint(_ context.Context, endpoint string) error {
	f.deletedEndpoints = append(f.deletedEndpoints, endpoint)
	return nil
}
func (f *fakeRepo) DeleteSentBefore(context.Context, time.Time) error { return nil }

// fakeSender returns the error mapped to each endpoint.
type fakeSender struct {
	errs     map[string]error
	payloads []string
}

func (f *fakeSender) Send(_ context.Context, sub Subscription, payload []byte) error {
	f.payloads = append(f.payloads, string(payload))
	return f.errs[sub.Endpoint]
}

var (
	now   = time.Date(2026, 11, 17, 12, 0, 0, 0, time.UTC)
	okSub = Subscription{Endpoint: "https://push.example/abc", P256dh: "p", Auth: "a"}
)

func newTestService(repo *fakeRepo, sender *fakeSender) *Service {
	s := NewService(repo, sender)
	s.now = func() time.Time { return now }
	return s
}

func TestServiceCreate(t *testing.T) {
	valid := NewReminder{Subscription: okSub, NoteID: "n1", Title: "  Call mom  ", FireAt: now.Add(time.Hour)}
	tests := []struct {
		name    string
		mutate  func(*NewReminder)
		wantErr error
	}{
		{name: "accepts a valid reminder", mutate: func(*NewReminder) {}},
		{name: "rejects a non-https endpoint", mutate: func(r *NewReminder) { r.Subscription.Endpoint = "http://x" }, wantErr: apperr.ErrInvalid},
		{name: "rejects missing keys", mutate: func(r *NewReminder) { r.Subscription.Auth = "" }, wantErr: apperr.ErrInvalid},
		{name: "rejects an empty title", mutate: func(r *NewReminder) { r.Title = "  " }, wantErr: apperr.ErrInvalid},
		{name: "rejects a missing note id", mutate: func(r *NewReminder) { r.NoteID = "" }, wantErr: apperr.ErrInvalid},
		{name: "rejects a time in the past", mutate: func(r *NewReminder) { r.FireAt = now.Add(-time.Hour) }, wantErr: apperr.ErrInvalid},
		{name: "accepts a time just passed", mutate: func(r *NewReminder) { r.FireAt = now.Add(-time.Minute) }},
		{name: "rejects a time years ahead", mutate: func(r *NewReminder) { r.FireAt = now.AddDate(5, 0, 0) }, wantErr: apperr.ErrInvalid},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			in := valid
			tt.mutate(&in)
			repo := &fakeRepo{}
			_, err := newTestService(repo, &fakeSender{}).Create(context.Background(), in)
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr == nil && repo.created[0].Title != "Call mom" {
				t.Fatalf("title = %q, want trimmed", repo.created[0].Title)
			}
		})
	}
}

func TestServiceCreateTruncatesLongBody(t *testing.T) {
	repo := &fakeRepo{}
	in := NewReminder{Subscription: okSub, NoteID: "n1", Title: "t", Body: strings.Repeat("é", 1500), FireAt: now}
	if _, err := newTestService(repo, &fakeSender{}).Create(context.Background(), in); err != nil {
		t.Fatal(err)
	}
	if n := len([]rune(repo.created[0].Body)); n != maxBody {
		t.Fatalf("body is %d runes, want %d", n, maxBody)
	}
}

func TestServiceDispatchDue(t *testing.T) {
	gone := Subscription{Endpoint: "https://push.example/gone", P256dh: "p", Auth: "a"}
	flaky := Subscription{Endpoint: "https://push.example/flaky", P256dh: "p", Auth: "a"}
	flakyID := uuid.New()
	repo := &fakeRepo{due: []Reminder{
		{ID: uuid.New(), Subscription: okSub, NoteID: "n1", Title: "ok", FireAt: now},
		{ID: uuid.New(), Subscription: gone, NoteID: "n2", Title: "gone", FireAt: now},
		{ID: flakyID, Subscription: flaky, NoteID: "n3", Title: "flaky", FireAt: now},
	}}
	sender := &fakeSender{errs: map[string]error{gone.Endpoint: ErrSubscriptionGone, flaky.Endpoint: errors.New("503")}}

	sent, err := newTestService(repo, sender).DispatchDue(context.Background())
	if err != nil {
		t.Fatal(err)
	}
	if sent != 1 {
		t.Fatalf("sent = %d, want 1", sent)
	}
	if len(repo.deletedEndpoints) != 1 || repo.deletedEndpoints[0] != gone.Endpoint {
		t.Fatalf("deleted endpoints = %v, want the gone one", repo.deletedEndpoints)
	}
	if len(repo.released) != 1 || repo.released[0] != flakyID {
		t.Fatalf("released = %v, want the flaky one", repo.released)
	}
	if !strings.Contains(sender.payloads[0], `"noteId":"n1"`) {
		t.Fatalf("payload = %s, want noteId", sender.payloads[0])
	}
}
