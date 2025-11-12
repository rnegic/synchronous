-- +goose Up
-- +goose StatementBegin
-- Add deleted_at to sessions table
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_sessions_deleted_at ON sessions(deleted_at);

-- Add deleted_at to messages table
ALTER TABLE messages ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_messages_deleted_at ON messages(deleted_at);

-- Add deleted_at to tasks table
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP;
CREATE INDEX IF NOT EXISTS idx_tasks_deleted_at ON tasks(deleted_at);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP INDEX IF EXISTS idx_tasks_deleted_at;
ALTER TABLE tasks DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_messages_deleted_at;
ALTER TABLE messages DROP COLUMN IF EXISTS deleted_at;

DROP INDEX IF EXISTS idx_sessions_deleted_at;
ALTER TABLE sessions DROP COLUMN IF EXISTS deleted_at;
-- +goose StatementEnd

