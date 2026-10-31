-- Investigating results customers did not like: their 👍/👎 with reasons, admin replays of a generation (to measure how
-- often the same input succeeds) and the regression set of cases to replay after a prompt or model change.
CREATE TABLE IF NOT EXISTS generation_feedback (generation_id TEXT NOT NULL, user_id TEXT NOT NULL, rating INTEGER NOT NULL, reasons TEXT, note TEXT, created_at INTEGER NOT NULL, PRIMARY KEY (generation_id, user_id));
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON generation_feedback(rating, created_at DESC);
CREATE TABLE IF NOT EXISTS generation_replays (id TEXT PRIMARY KEY, generation_id TEXT NOT NULL, mode TEXT NOT NULL, rh_task_id TEXT, status TEXT NOT NULL, output_key TEXT, verdict TEXT, mark INTEGER, version TEXT, prompt_hash TEXT, error TEXT, created_at INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_replays_gen ON generation_replays(generation_id, created_at);
CREATE INDEX IF NOT EXISTS idx_replays_open ON generation_replays(status, created_at);
CREATE TABLE IF NOT EXISTS regression_cases (generation_id TEXT PRIMARY KEY, note TEXT, added_at INTEGER NOT NULL);
