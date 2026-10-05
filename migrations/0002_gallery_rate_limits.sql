CREATE TABLE rate_limits (k TEXT PRIMARY KEY, n INTEGER NOT NULL, exp INTEGER NOT NULL);
CREATE INDEX idx_gen_public ON generations(is_public, created_at DESC);
