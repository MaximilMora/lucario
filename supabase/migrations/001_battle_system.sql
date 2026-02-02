-- ============================================
-- SISTEMA DE BATALLAS SEGURO - LUCARIO
-- ============================================
-- El servidor es la fuente de verdad.
-- El cliente solo envía IDs, nunca estado.
-- ============================================

-- Eliminar tablas existentes si es necesario (para desarrollo)
-- DROP TABLE IF EXISTS battle_turns CASCADE;
-- DROP TABLE IF EXISTS battle_state CASCADE;
-- DROP TABLE IF EXISTS battles CASCADE;

-- ============================================
-- TABLA: battles
-- Registro principal de cada batalla
-- ============================================
CREATE TABLE IF NOT EXISTS battles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Jugadores
  player1_user_id TEXT NOT NULL,           -- ID de Clerk del jugador 1
  player1_username TEXT NOT NULL DEFAULT 'Player 1',
  player2_user_id TEXT NOT NULL DEFAULT 'ai',  -- 'ai' para batallas vs CPU
  player2_username TEXT NOT NULL DEFAULT 'AI Opponent',
  
  -- Pokémon seleccionados (solo IDs, los datos se obtienen de PokeAPI)
  player1_pokemon_id INTEGER NOT NULL,
  player2_pokemon_id INTEGER NOT NULL,
  
  -- Resultado
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'player1_won', 'player2_won', 'draw', 'abandoned')),
  winner_user_id TEXT,                     -- NULL si está activa o empate
  
  -- Estadísticas finales
  total_turns INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  finished_at TIMESTAMPTZ,
  
  -- Índices para búsquedas frecuentes
  CONSTRAINT valid_winner CHECK (
    (status = 'active' AND winner_user_id IS NULL) OR
    (status = 'draw' AND winner_user_id IS NULL) OR
    (status = 'abandoned' AND winner_user_id IS NULL) OR
    (status IN ('player1_won', 'player2_won') AND winner_user_id IS NOT NULL)
  )
);

-- ============================================
-- TABLA: battle_state
-- Estado en tiempo real de una batalla activa
-- Esta es la FUENTE DE VERDAD durante el combate
-- ============================================
CREATE TABLE IF NOT EXISTS battle_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL UNIQUE REFERENCES battles(id) ON DELETE CASCADE,
  
  -- Estado del Jugador 1
  player1_pokemon_id INTEGER NOT NULL,
  player1_pokemon_name TEXT NOT NULL,
  player1_current_hp INTEGER NOT NULL,
  player1_max_hp INTEGER NOT NULL,
  player1_attack INTEGER NOT NULL,         -- Stat de ataque
  player1_defense INTEGER NOT NULL,        -- Stat de defensa
  player1_speed INTEGER NOT NULL,          -- Para determinar quién ataca primero
  player1_types JSONB NOT NULL DEFAULT '[]',  -- ["fire", "flying"]
  player1_attacks JSONB NOT NULL DEFAULT '[]', -- Array de ataques disponibles
  player1_sprite_front TEXT,
  player1_sprite_back TEXT,
  
  -- Estado del Jugador 2 (puede ser AI)
  player2_pokemon_id INTEGER NOT NULL,
  player2_pokemon_name TEXT NOT NULL,
  player2_current_hp INTEGER NOT NULL,
  player2_max_hp INTEGER NOT NULL,
  player2_attack INTEGER NOT NULL,
  player2_defense INTEGER NOT NULL,
  player2_speed INTEGER NOT NULL,
  player2_types JSONB NOT NULL DEFAULT '[]',
  player2_attacks JSONB NOT NULL DEFAULT '[]',
  player2_sprite_front TEXT,
  player2_sprite_back TEXT,
  
  -- Control del turno
  current_turn TEXT NOT NULL DEFAULT 'player1' 
    CHECK (current_turn IN ('player1', 'player2')),
  turn_number INTEGER NOT NULL DEFAULT 0,
  
  -- Estado de la batalla
  status TEXT NOT NULL DEFAULT 'active' 
    CHECK (status IN ('active', 'player1_won', 'player2_won', 'draw')),
  
  -- Mensajes del combate (últimos N mensajes para mostrar en UI)
  messages JSONB NOT NULL DEFAULT '[]',
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- TABLA: battle_turns
-- Historial de cada turno (para replay/auditoría)
-- ============================================
CREATE TABLE IF NOT EXISTS battle_turns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  battle_id UUID NOT NULL REFERENCES battles(id) ON DELETE CASCADE,
  
  -- Información del turno
  turn_number INTEGER NOT NULL,
  player_side TEXT NOT NULL CHECK (player_side IN ('player1', 'player2')),
  player_user_id TEXT NOT NULL,
  
  -- Acción realizada
  action_type TEXT NOT NULL CHECK (action_type IN ('attack', 'switch', 'item', 'flee')),
  attack_id INTEGER,                       -- ID del ataque usado
  attack_name TEXT,                        -- Nombre del ataque
  attack_power INTEGER,                    -- Poder base del ataque
  
  -- Resultado de la acción
  damage_dealt INTEGER DEFAULT 0,
  was_critical BOOLEAN DEFAULT FALSE,
  effectiveness TEXT DEFAULT 'normal'      -- 'super_effective', 'not_very_effective', 'immune', 'normal'
    CHECK (effectiveness IN ('super_effective', 'not_very_effective', 'immune', 'normal')),
  
  -- Estado después del turno
  target_hp_before INTEGER NOT NULL,
  target_hp_after INTEGER NOT NULL,
  attacker_hp_after INTEGER NOT NULL,
  
  -- Mensaje generado
  message TEXT,
  
  -- Timestamp
  executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Evitar turnos duplicados
  UNIQUE(battle_id, turn_number, player_side)
);

-- ============================================
-- TABLA: user_battle_stats
-- Estadísticas agregadas por usuario
-- ============================================
CREATE TABLE IF NOT EXISTS user_battle_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL UNIQUE,
  username TEXT,
  
  -- Estadísticas generales
  total_battles INTEGER NOT NULL DEFAULT 0,
  wins INTEGER NOT NULL DEFAULT 0,
  losses INTEGER NOT NULL DEFAULT 0,
  draws INTEGER NOT NULL DEFAULT 0,
  
  -- Rachas
  current_win_streak INTEGER NOT NULL DEFAULT 0,
  best_win_streak INTEGER NOT NULL DEFAULT 0,
  
  -- Rating ELO
  rating INTEGER NOT NULL DEFAULT 1000,
  peak_rating INTEGER NOT NULL DEFAULT 1000,
  
  -- Pokémon favorito (más usado)
  most_used_pokemon_id INTEGER,
  most_used_pokemon_name TEXT,
  most_used_pokemon_count INTEGER DEFAULT 0,
  
  -- Timestamps
  first_battle_at TIMESTAMPTZ,
  last_battle_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- ÍNDICES PARA RENDIMIENTO
-- ============================================

-- Battles: búsquedas por usuario y estado
CREATE INDEX IF NOT EXISTS idx_battles_player1_user_id ON battles(player1_user_id);
CREATE INDEX IF NOT EXISTS idx_battles_player2_user_id ON battles(player2_user_id);
CREATE INDEX IF NOT EXISTS idx_battles_status ON battles(status);
CREATE INDEX IF NOT EXISTS idx_battles_created_at ON battles(created_at DESC);

-- Battle State: búsqueda rápida por batalla
CREATE INDEX IF NOT EXISTS idx_battle_state_battle_id ON battle_state(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_state_status ON battle_state(status);

-- Battle Turns: historial ordenado
CREATE INDEX IF NOT EXISTS idx_battle_turns_battle_id ON battle_turns(battle_id);
CREATE INDEX IF NOT EXISTS idx_battle_turns_order ON battle_turns(battle_id, turn_number);

-- User Stats: ranking
CREATE INDEX IF NOT EXISTS idx_user_stats_rating ON user_battle_stats(rating DESC);
CREATE INDEX IF NOT EXISTS idx_user_stats_wins ON user_battle_stats(wins DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Habilitar RLS en todas las tablas
ALTER TABLE battles ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE battle_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_battle_stats ENABLE ROW LEVEL SECURITY;

-- ============================================
-- POLÍTICAS DE SEGURIDAD: battles
-- Primero eliminamos si existen, luego creamos
-- ============================================

DROP POLICY IF EXISTS "Users can view own battles" ON battles;
DROP POLICY IF EXISTS "Users can create own battles" ON battles;
DROP POLICY IF EXISTS "System can update battles" ON battles;

-- Los usuarios pueden ver sus propias batallas
CREATE POLICY "Users can view own battles" ON battles
  FOR SELECT
  USING (
    player1_user_id = current_setting('app.current_user_id', true) OR
    player2_user_id = current_setting('app.current_user_id', true)
  );

-- Los usuarios pueden crear batallas donde son player1
CREATE POLICY "Users can create own battles" ON battles
  FOR INSERT
  WITH CHECK (
    player1_user_id = current_setting('app.current_user_id', true)
  );

-- Solo el sistema puede actualizar batallas (via service role)
CREATE POLICY "System can update battles" ON battles
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- ============================================
-- POLÍTICAS DE SEGURIDAD: battle_state
-- ============================================

DROP POLICY IF EXISTS "Users can view own battle state" ON battle_state;
DROP POLICY IF EXISTS "System can manage battle state" ON battle_state;

-- Los usuarios pueden ver el estado de sus batallas
CREATE POLICY "Users can view own battle state" ON battle_state
  FOR SELECT
  USING (
    battle_id IN (
      SELECT id FROM battles 
      WHERE player1_user_id = current_setting('app.current_user_id', true)
         OR player2_user_id = current_setting('app.current_user_id', true)
    )
  );

-- Solo el sistema puede insertar/actualizar estado
CREATE POLICY "System can manage battle state" ON battle_state
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- POLÍTICAS DE SEGURIDAD: battle_turns
-- ============================================

DROP POLICY IF EXISTS "Users can view own battle turns" ON battle_turns;
DROP POLICY IF EXISTS "System can insert turns" ON battle_turns;

-- Los usuarios pueden ver los turnos de sus batallas
CREATE POLICY "Users can view own battle turns" ON battle_turns
  FOR SELECT
  USING (
    battle_id IN (
      SELECT id FROM battles 
      WHERE player1_user_id = current_setting('app.current_user_id', true)
         OR player2_user_id = current_setting('app.current_user_id', true)
    )
  );

-- Solo el sistema puede insertar turnos
CREATE POLICY "System can insert turns" ON battle_turns
  FOR INSERT
  WITH CHECK (true);

-- ============================================
-- POLÍTICAS DE SEGURIDAD: user_battle_stats
-- ============================================

DROP POLICY IF EXISTS "Anyone can view stats" ON user_battle_stats;
DROP POLICY IF EXISTS "System can manage stats" ON user_battle_stats;

-- Cualquiera puede ver el ranking (stats públicos)
CREATE POLICY "Anyone can view stats" ON user_battle_stats
  FOR SELECT
  USING (true);

-- Solo el sistema puede modificar stats
CREATE POLICY "System can manage stats" ON user_battle_stats
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- ============================================
-- FUNCIONES AUXILIARES
-- ============================================

-- Función para actualizar timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers para updated_at (eliminar si existen primero)
DROP TRIGGER IF EXISTS trigger_battle_state_updated_at ON battle_state;
DROP TRIGGER IF EXISTS trigger_user_stats_updated_at ON user_battle_stats;

CREATE TRIGGER trigger_battle_state_updated_at
  BEFORE UPDATE ON battle_state
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_user_stats_updated_at
  BEFORE UPDATE ON user_battle_stats
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- FUNCIÓN: Calcular daño (para consistencia)
-- ============================================
CREATE OR REPLACE FUNCTION calculate_battle_damage(
  attacker_attack INTEGER,
  defender_defense INTEGER,
  move_power INTEGER,
  random_factor FLOAT DEFAULT NULL
)
RETURNS INTEGER AS $$
DECLARE
  base_damage FLOAT;
  variation FLOAT;
BEGIN
  -- Fórmula simplificada de daño
  base_damage := (attacker_attack::FLOAT / defender_defense::FLOAT) * move_power;
  
  -- Variación aleatoria (80-120%)
  IF random_factor IS NULL THEN
    variation := 0.8 + (random() * 0.4);
  ELSE
    variation := random_factor;
  END IF;
  
  RETURN GREATEST(1, FLOOR(base_damage * variation)::INTEGER);
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- FUNCIÓN: Finalizar batalla y actualizar stats
-- ============================================
CREATE OR REPLACE FUNCTION finalize_battle(
  p_battle_id UUID,
  p_winner_side TEXT  -- 'player1', 'player2', 'draw'
)
RETURNS VOID AS $$
DECLARE
  v_battle RECORD;
  v_winner_user_id TEXT;
  v_loser_user_id TEXT;
  v_total_turns INTEGER;
BEGIN
  -- Obtener datos de la batalla
  SELECT * INTO v_battle FROM battles WHERE id = p_battle_id;
  
  IF v_battle IS NULL THEN
    RAISE EXCEPTION 'Battle not found: %', p_battle_id;
  END IF;
  
  -- Obtener total de turnos
  SELECT COALESCE(MAX(turn_number), 0) INTO v_total_turns
  FROM battle_turns WHERE battle_id = p_battle_id;
  
  -- Determinar ganador
  IF p_winner_side = 'player1' THEN
    v_winner_user_id := v_battle.player1_user_id;
    v_loser_user_id := v_battle.player2_user_id;
  ELSIF p_winner_side = 'player2' THEN
    v_winner_user_id := v_battle.player2_user_id;
    v_loser_user_id := v_battle.player1_user_id;
  END IF;
  
  -- Actualizar batalla
  UPDATE battles SET
    status = CASE 
      WHEN p_winner_side = 'player1' THEN 'player1_won'
      WHEN p_winner_side = 'player2' THEN 'player2_won'
      ELSE 'draw'
    END,
    winner_user_id = v_winner_user_id,
    total_turns = v_total_turns,
    finished_at = NOW()
  WHERE id = p_battle_id;
  
  -- Actualizar stats del ganador (si no es AI)
  IF v_winner_user_id IS NOT NULL AND v_winner_user_id != 'ai' THEN
    INSERT INTO user_battle_stats (user_id, total_battles, wins, current_win_streak, best_win_streak, last_battle_at)
    VALUES (v_winner_user_id, 1, 1, 1, 1, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_battles = user_battle_stats.total_battles + 1,
      wins = user_battle_stats.wins + 1,
      current_win_streak = user_battle_stats.current_win_streak + 1,
      best_win_streak = GREATEST(user_battle_stats.best_win_streak, user_battle_stats.current_win_streak + 1),
      last_battle_at = NOW(),
      updated_at = NOW();
  END IF;
  
  -- Actualizar stats del perdedor (si no es AI)
  IF v_loser_user_id IS NOT NULL AND v_loser_user_id != 'ai' THEN
    INSERT INTO user_battle_stats (user_id, total_battles, losses, current_win_streak, last_battle_at)
    VALUES (v_loser_user_id, 1, 1, 0, NOW())
    ON CONFLICT (user_id) DO UPDATE SET
      total_battles = user_battle_stats.total_battles + 1,
      losses = user_battle_stats.losses + 1,
      current_win_streak = 0,
      last_battle_at = NOW(),
      updated_at = NOW();
  END IF;
  
  -- Limpiar battle_state (ya no se necesita)
  DELETE FROM battle_state WHERE battle_id = p_battle_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================
-- VISTA: Ranking público
-- ============================================
CREATE OR REPLACE VIEW public_ranking AS
SELECT 
  user_id,
  username,
  rating,
  total_battles,
  wins,
  losses,
  draws,
  best_win_streak,
  ROUND((wins::FLOAT / NULLIF(total_battles, 0) * 100)::NUMERIC, 1) as win_rate,
  ROW_NUMBER() OVER (ORDER BY rating DESC) as rank_position
FROM user_battle_stats
WHERE total_battles > 0
ORDER BY rating DESC;

-- ============================================
-- COMENTARIOS DE DOCUMENTACIÓN
-- ============================================
COMMENT ON TABLE battles IS 'Registro principal de cada batalla. Solo metadatos, no estado.';
COMMENT ON TABLE battle_state IS 'Estado en tiempo real de batallas activas. FUENTE DE VERDAD durante el combate.';
COMMENT ON TABLE battle_turns IS 'Historial inmutable de cada acción en la batalla.';
COMMENT ON TABLE user_battle_stats IS 'Estadísticas agregadas por usuario para ranking.';

COMMENT ON COLUMN battle_state.player1_attacks IS 'JSON array: [{id, name, power, type}]';
COMMENT ON COLUMN battle_state.messages IS 'JSON array de últimos mensajes para mostrar en UI';
