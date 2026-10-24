-- History filtered by tool (/api/generations?tool=…), e.g. the Business 3D Floorplan page.
CREATE INDEX IF NOT EXISTS idx_gen_user_tool ON generations(user_id, tool, created_at DESC);
