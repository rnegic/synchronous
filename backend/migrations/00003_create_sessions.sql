-- +goose Up
-- +goose StatementBegin
CREATE TYPE session_mode AS ENUM ('solo', 'group');
CREATE TYPE session_status AS ENUM ('pending', 'active', 'paused', 'completed', 'cancelled');

CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(36) PRIMARY KEY,
    mode session_mode NOT NULL,
    status session_status NOT NULL DEFAULT 'pending',
    focus_duration INTEGER NOT NULL, -- в минутах
    break_duration INTEGER NOT NULL, -- в минутах
    group_name VARCHAR(255),
    is_private BOOLEAN NOT NULL DEFAULT FALSE,
    creator_id VARCHAR(36) NOT NULL,
    invite_link VARCHAR(50) NOT NULL UNIQUE,
    max_chat_id BIGINT, -- ID чата в Max API (для group sessions)
    max_chat_link VARCHAR(500), -- Ссылка на чат в Max
    started_at TIMESTAMP,
    completed_at TIMESTAMP,
    paused_at TIMESTAMP,
    total_pause_time BIGINT NOT NULL DEFAULT 0, -- в миллисекундах
    current_cycle INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_creator_id ON sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_status ON sessions(status);
CREATE INDEX IF NOT EXISTS idx_invite_link ON sessions(invite_link);
CREATE INDEX IF NOT EXISTS idx_max_chat_id ON sessions(max_chat_id);
CREATE INDEX IF NOT EXISTS idx_created_at ON sessions(created_at);

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
        CREATE TRIGGER update_sessions_updated_at BEFORE UPDATE ON sessions
            FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
-- +goose StatementEnd

-- +goose Down
-- +goose StatementBegin
DROP TABLE IF EXISTS sessions;
DROP TYPE IF EXISTS session_status;
DROP TYPE IF EXISTS session_mode;
-- +goose StatementEnd

