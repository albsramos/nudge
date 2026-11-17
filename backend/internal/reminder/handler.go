package reminder

import (
	"context"
	"fmt"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/albsramos/nudge/backend/internal/platform/apperr"
	"github.com/albsramos/nudge/backend/internal/platform/httpx"
)

// service is what the handler needs. Declared here so handlers can be tested with a fake.
type service interface {
	Create(ctx context.Context, in NewReminder) (Reminder, error)
	Delete(ctx context.Context, id uuid.UUID) error
}

// Handler is the HTTP transport for reminders: decode, call the service, encode.
type Handler struct {
	svc       service
	publicKey string
}

func NewHandler(svc service, vapidPublicKey string) *Handler {
	return &Handler{svc: svc, publicKey: vapidPublicKey}
}

func (h *Handler) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/push/public-key", h.publicKeyHandler)
	mux.HandleFunc("POST /api/reminders", h.create)
	mux.HandleFunc("DELETE /api/reminders/{id}", h.delete)
}

// PublicKeyResponse carries the VAPID key browsers subscribe with.
type PublicKeyResponse struct {
	PublicKey string `json:"publicKey" validate:"required" example:"BNc..."`
} //	@name	PublicKeyResponse

// SubscriptionKeys are the keys of a browser PushSubscription.
type SubscriptionKeys struct {
	P256dh string `json:"p256dh" validate:"required"`
	Auth   string `json:"auth" validate:"required"`
} //	@name	SubscriptionKeys

// PushSubscription is the browser's PushSubscription, as returned by toJSON().
type PushSubscription struct {
	Endpoint string           `json:"endpoint" validate:"required" example:"https://fcm.googleapis.com/fcm/send/abc"`
	Keys     SubscriptionKeys `json:"keys" validate:"required"`
} //	@name	PushSubscription

// CreateReminderRequest is the body of POST /api/reminders.
type CreateReminderRequest struct {
	Subscription PushSubscription `json:"subscription" validate:"required"`
	NoteID       string           `json:"noteId" validate:"required" minLength:"1" maxLength:"100"`
	Title        string           `json:"title" validate:"required" minLength:"1" maxLength:"200" example:"Call mom"`
	Body         string           `json:"body" maxLength:"1000" example:"Ask about the weekend"`
	FireAt       time.Time        `json:"fireAt" validate:"required"`
} //	@name	CreateReminderRequest

// ReminderResponse is a scheduled reminder on the wire. It never echoes the subscription.
type ReminderResponse struct {
	ID     string     `json:"id" format:"uuid" validate:"required"`
	NoteID string     `json:"noteId" validate:"required"`
	FireAt time.Time  `json:"fireAt" validate:"required"`
	SentAt *time.Time `json:"sentAt,omitempty"`
} //	@name	ReminderResponse

func toResponse(r Reminder) ReminderResponse {
	return ReminderResponse{ID: r.ID.String(), NoteID: r.NoteID, FireAt: r.FireAt, SentAt: r.SentAt}
}

// publicKeyHandler godoc
//
//	@Summary	Get the Web Push public key
//	@Tags		push
//	@ID			getPushPublicKey
//	@Produce	json
//	@Success	200	{object}	PublicKeyResponse
//	@Router		/api/push/public-key [get]
func (h *Handler) publicKeyHandler(w http.ResponseWriter, _ *http.Request) {
	httpx.JSON(w, http.StatusOK, PublicKeyResponse{PublicKey: h.publicKey})
}

// create godoc
//
//	@Summary		Schedule a reminder
//	@Description	Stores a reminder and sends it as a Web Push notification at fireAt.
//	@Tags			reminders
//	@ID				createReminder
//	@Accept			json
//	@Produce		json
//	@Param			body	body		CreateReminderRequest	true	"Reminder to schedule"
//	@Success		201		{object}	ReminderResponse
//	@Failure		400		{object}	httpx.ErrorResponse
//	@Failure		500		{object}	httpx.ErrorResponse
//	@Router			/api/reminders [post]
func (h *Handler) create(w http.ResponseWriter, r *http.Request) {
	var req CreateReminderRequest
	if err := httpx.Decode(r, &req); err != nil {
		httpx.Error(w, r, err)
		return
	}
	rem, err := h.svc.Create(r.Context(), NewReminder{
		Subscription: Subscription{Endpoint: req.Subscription.Endpoint, P256dh: req.Subscription.Keys.P256dh, Auth: req.Subscription.Keys.Auth},
		NoteID:       req.NoteID,
		Title:        req.Title,
		Body:         req.Body,
		FireAt:       req.FireAt,
	})
	if err != nil {
		httpx.Error(w, r, err)
		return
	}
	httpx.JSON(w, http.StatusCreated, toResponse(rem))
}

// delete godoc
//
//	@Summary	Cancel a reminder
//	@Tags		reminders
//	@ID			deleteReminder
//	@Param		id	path	string	true	"Reminder ID"	format(uuid)
//	@Success	204
//	@Failure	400	{object}	httpx.ErrorResponse
//	@Failure	404	{object}	httpx.ErrorResponse
//	@Failure	500	{object}	httpx.ErrorResponse
//	@Router		/api/reminders/{id} [delete]
func (h *Handler) delete(w http.ResponseWriter, r *http.Request) {
	id, err := uuid.Parse(r.PathValue("id"))
	if err != nil {
		httpx.Error(w, r, fmt.Errorf("%w: id must be a UUID", apperr.ErrInvalid))
		return
	}
	if err := h.svc.Delete(r.Context(), id); err != nil {
		httpx.Error(w, r, err)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
