// Package apperr holds the error kinds services return. Handlers map them to HTTP status codes.
package apperr

import "errors"

var (
	ErrNotFound = errors.New("not found")
	ErrInvalid  = errors.New("invalid input")
	ErrConflict = errors.New("conflict")
)
