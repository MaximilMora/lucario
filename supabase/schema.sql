-- Battles table to store Pokemon battle history
-- Run this SQL in your Supabase SQL Editor to create the table

CREATE TABLE IF NOT EXISTS battles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Player Pokemon info
  player_pokemon_id INTEGER NOT NULL,
  player_pokemon_name VARCHAR(100) NOT NULL,

  -- Opponent Pokemon info
  opponent_pokemon_id INTEGER NOT NULL,
  opponent_pokemon_name VARCHAR(100) NOT NULL,

  -- Battle result: 'playerWon', 'opponentWon', or NULL if not finished
  winner VARCHAR(20),

  -- Timestamps
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ended_at TIMESTAMP WITH TIME ZONE,

  -- Optional: store final HP values
  player_final_hp INTEGER,
  opponent_final_hp INTEGER
);

-- Index for querying battles by Pokemon
CREATE INDEX IF NOT EXISTS idx_battles_player_pokemon ON battles(player_pokemon_id);
CREATE INDEX IF NOT EXISTS idx_battles_opponent_pokemon ON battles(opponent_pokemon_id);
CREATE INDEX IF NOT EXISTS idx_battles_started_at ON battles(started_at DESC);

-- Enable Row Level Security (optional, for public access)
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;

-- Policy to allow anyone to insert battles (for demo purposes)
CREATE POLICY "Allow public insert" ON battles
  FOR INSERT
  WITH CHECK (true);

-- Policy to allow anyone to read battles
CREATE POLICY "Allow public read" ON battles
  FOR SELECT
  USING (true);

-- Policy to allow updating battles (to set winner when battle ends)
CREATE POLICY "Allow public update" ON battles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);
