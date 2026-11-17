package postgres

import (
	"context"
	"database/sql"
	"fmt"
	"io/fs"

	_ "github.com/jackc/pgx/v5/stdlib" // registers the "pgx" database/sql driver
	"github.com/pressly/goose/v3"
)

// Migrate applies every pending goose migration found under dir in migrations.
func Migrate(ctx context.Context, url string, migrations fs.FS, dir string) error {
	conn, err := sql.Open("pgx", url)
	if err != nil {
		return fmt.Errorf("open for migrations: %w", err)
	}
	defer conn.Close()
	provider, err := goose.NewProvider(goose.DialectPostgres, conn, mustSub(migrations, dir))
	if err != nil {
		return fmt.Errorf("goose provider: %w", err)
	}
	if _, err := provider.Up(ctx); err != nil {
		return fmt.Errorf("migrate: %w", err)
	}
	return nil
}

func mustSub(f fs.FS, dir string) fs.FS {
	sub, err := fs.Sub(f, dir)
	if err != nil {
		panic(err)
	}
	return sub
}
