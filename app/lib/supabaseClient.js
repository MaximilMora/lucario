import { createClient } from '@supabase/supabase-js';

let browserClient = null;

/**
 * Cliente de Supabase para uso en el browser (Realtime, suscripciones).
 * Usa NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_ANON_KEY.
 * Solo para componentes cliente; en API routes usar supabaseServerClient.
 *
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 *   Cliente o null si faltan variables de entorno (evita fallar en build).
 */
export function getSupabase() {
  if (typeof window === 'undefined') {
    return null;
  }
  if (browserClient) {
    return browserClient;
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    return null;
  }
  browserClient = createClient(url, anonKey);
  return browserClient;
}
