-- One row per RunningHub charge: an image/video task (id "task:<taskId>") or an LLM call (id "llm:<uuid>").
-- usd is the amount RunningHub reported; estimated=1 when it reported none and the list price was used.
CREATE TABLE api_costs (id TEXT PRIMARY KEY, kind TEXT NOT NULL, model TEXT NOT NULL, tool TEXT, generation_id TEXT, user_id TEXT,
  usd REAL NOT NULL, estimated INTEGER NOT NULL DEFAULT 0, tokens_in INTEGER, tokens_out INTEGER, created_at INTEGER NOT NULL);
CREATE INDEX api_costs_created ON api_costs(created_at);
CREATE INDEX api_costs_generation ON api_costs(generation_id);
