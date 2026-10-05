-- NOTE: RUNNINGHUB_API_KEY is a Worker secret (wrangler secret put), never stored here.
CREATE TABLE users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, pw_hash TEXT NOT NULL, pw_salt TEXT NOT NULL, credits INTEGER NOT NULL DEFAULT 3, credits_refilled_at INTEGER NOT NULL, created_at INTEGER NOT NULL);
CREATE TABLE sessions (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL);
CREATE TABLE credit_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, user_id TEXT NOT NULL, delta INTEGER NOT NULL, reason TEXT NOT NULL, generation_id TEXT, created_at INTEGER NOT NULL);
CREATE TABLE generations (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, tool TEXT NOT NULL, params TEXT NOT NULL, prompt TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'QUEUED', rh_task_id TEXT, input_key TEXT, output_key TEXT, error TEXT, cost INTEGER NOT NULL DEFAULT 1, is_public INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL);
CREATE INDEX idx_gen_user ON generations(user_id, created_at DESC);
CREATE TABLE styles (slug TEXT PRIMARY KEY, name TEXT NOT NULL, scope TEXT NOT NULL DEFAULT 'interior', prompt TEXT NOT NULL);
