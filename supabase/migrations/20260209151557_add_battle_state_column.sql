-- Add battle_state JSONB column for server-side battle state management.
-- The server stores HP, attacks, stats, messages, and turn data here
-- instead of trusting client-sent state.
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_state jsonb;
