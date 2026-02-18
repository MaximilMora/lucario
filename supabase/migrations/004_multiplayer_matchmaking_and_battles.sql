-- ============================================
-- MULTIPLAYER: matchmaking_queue + columnas PvP en battles + Realtime
-- ============================================
-- Tabla de cola de matchmaking y columnas en battles para PvP.
-- Las APIs usan service_role; el cliente usa anon key para Realtime.
-- ============================================

-- --------------------------------------------
-- Tabla: matchmaking_queue
-- --------------------------------------------
CREATE TABLE IF NOT EXISTS matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  pokemon_id INTEGER NOT NULL,
  pokemon_name TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  matched_with_user_id TEXT,
  battle_id UUID REFERENCES battles(id),
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_queue_waiting ON matchmaking_queue(status) WHERE status = 'waiting';

-- RLS: solo service_role gestiona la cola (las APIs escriben/leen)
ALTER TABLE matchmaking_queue ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage matchmaking_queue" ON matchmaking_queue;
CREATE POLICY "Service role can manage matchmaking_queue" ON matchmaking_queue
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Permitir a anon/authenticated SELECT para Realtime (filtro por user_id en cliente)
-- Sin esto, los clientes con anon key no reciben postgres_changes.
DROP POLICY IF EXISTS "Allow anon read own queue row" ON matchmaking_queue;
CREATE POLICY "Allow anon read own queue row" ON matchmaking_queue
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- --------------------------------------------
-- Tabla: battles - columnas PvP (no rompen modo AI)
-- --------------------------------------------
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_mode TEXT DEFAULT 'ai';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS current_turn TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_current_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_current_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_max_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_max_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_pokemon_data JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_pokemon_data JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS last_action JSONB;

-- Permitir a anon/authenticated SELECT en battles para Realtime (cliente recibe updates por battle_id)
DROP POLICY IF EXISTS "Allow anon read battles" ON battles;
CREATE POLICY "Allow anon read battles" ON battles
  FOR SELECT
  TO anon, authenticated
  USING (true);

-- --------------------------------------------
-- Realtime: añadir tablas a la publicación
-- --------------------------------------------
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;

-- battles puede estar ya en la publicación; ignorar error si ya existe
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE battles;
EXCEPTION
  WHEN OTHERS THEN NULL;
END
$$;
