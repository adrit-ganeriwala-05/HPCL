package handlers

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// isUniqueViolation checks for Postgres SQLSTATE 23505 (unique_violation),
// letting handlers turn a DB constraint hit into a clean 409 instead of a 500.
func isUniqueViolation(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == "23505"
}
