-- +goose Up
-- +goose StatementBegin
ALTER TYPE session_status ADD VALUE IF NOT EXISTS 'paused';
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Cannot remove enum values in PostgreSQL
-- Manual intervention required if rollback is needed
-- +goose StatementEnd
