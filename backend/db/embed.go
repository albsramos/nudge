// Package migrations embeds the goose migrations so the binary can apply them on start.
package migrations

import "embed"

//go:embed migrations/*.sql
var FS embed.FS
