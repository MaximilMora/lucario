-- ============================================
-- MIGRACIÓN: Políticas RLS para service_role
-- ============================================
-- Este SQL añade políticas explícitas para que el backend
-- (usando SUPABASE_SERVICE_ROLE_KEY) pueda insertar/actualizar
-- en todas las tablas sin restricciones RLS.
--
-- IMPORTANTE: Asegúrate de usar SUPABASE_SERVICE_ROLE_KEY
-- (no anon key) en producción (Vercel).
-- ============================================

-- Política para battles: service_role puede hacer INSERT/UPDATE/DELETE/SELECT
DROP POLICY IF EXISTS "Service role can manage battles" ON battles;
CREATE POLICY "Service role can manage battles" ON battles
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política para battle_state: service_role puede hacer INSERT/UPDATE/DELETE/SELECT
DROP POLICY IF EXISTS "Service role can manage battle_state" ON battle_state;
CREATE POLICY "Service role can manage battle_state" ON battle_state
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Política para battle_turns: service_role puede insertar turnos
DROP POLICY IF EXISTS "Service role can insert turns" ON battle_turns;
CREATE POLICY "Service role can insert turns" ON battle_turns
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Política para user_battle_stats: service_role puede hacer INSERT/UPDATE/DELETE/SELECT
DROP POLICY IF EXISTS "Service role can manage stats" ON user_battle_stats;
CREATE POLICY "Service role can manage stats" ON user_battle_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
