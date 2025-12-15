import { createClient } from '@supabase/supabase-js';

let supabaseClientInstance = null;

/**
 * Obtiene el cliente de Supabase para uso en servidor
 * Lanza error solo cuando se intenta usar, no al importar
 * Esto permite que el build pase incluso sin variables de entorno configuradas
 */
function getSupabaseClient() {
  if (supabaseClientInstance) {
    return supabaseClientInstance;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceRoleKey) {
    throw new Error(
      'Missing Supabase environment variables. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY'
    );
  }

  supabaseClientInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false, // No necesitamos sesión en server-side
    },
  });

  return supabaseClientInstance;
}

/**
 * Cliente de Supabase para uso en servidor (API routes, server components)
 * Usa la service_role key que bypassa RLS
 * ⚠️ NUNCA usar este cliente en componentes de cliente
 * 
 * Nota: El cliente se crea de forma lazy para evitar errores en build
 * si las variables de entorno no están configuradas
 */
export const supabaseServer = new Proxy({}, {
  get(_target, prop) {
    const client = getSupabaseClient();
    const value = client[prop];
    return typeof value === 'function' ? value.bind(client) : value;
  },
});
