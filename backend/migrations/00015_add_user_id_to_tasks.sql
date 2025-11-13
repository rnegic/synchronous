-- +goose Up
-- +goose StatementBegin
-- Add user_id column to tasks table to support individual tasks per participant
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id VARCHAR(255);

-- Add index for faster queries by user_id
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

-- Add foreign key constraint to users table
ALTER TABLE tasks ADD CONSTRAINT fk_tasks_user_id 
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Add composite index for session_id + user_id queries
CREATE INDEX IF NOT EXISTS idx_tasks_session_user ON tasks(session_id, user_id);
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
-- Drop constraints and indexes
DROP INDEX IF EXISTS idx_tasks_session_user;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS fk_tasks_user_id;
DROP INDEX IF EXISTS idx_tasks_user_id;

-- Drop column
ALTER TABLE tasks DROP COLUMN IF EXISTS user_id;
-- +goose StatementEnd
