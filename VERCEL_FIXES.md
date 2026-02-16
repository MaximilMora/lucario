# Correcciones para Error 500 en Vercel

## Problemas Encontrados y Solucionados

### 1. **Manejo de Supabase no configurado**

**Problema:** Las APIs fallaban con error 500 si Supabase no estaba configurado correctamente.

**Solución:**

- Agregado helper `getSupabase()` que maneja errores gracefully
- Las APIs ahora devuelven respuestas vacías en lugar de errores 500 cuando Supabase no está disponible

### 2. **Nombres de Pokémon faltantes en historial**

**Problema:** `BattleHistory.jsx` esperaba `player_pokemon_name` pero la API solo devolvía IDs.

**Solución:**

- La API `/api/battles` ahora obtiene nombres de Pokémon desde PokeAPI
- Devuelve tanto IDs como nombres para compatibilidad

### 3. **Uso de `require()` en producción**

**Problema:** `require()` puede causar problemas en builds de Next.js.

**Solución:**

- Mantenido `require()` pero con manejo de errores
- Las funciones ahora verifican si Supabase está disponible antes de usarlo

## Archivos Modificados

1. `/app/api/battles/route.js` - Manejo seguro de Supabase + nombres de Pokémon
2. `/app/api/stats/route.js` - Manejo seguro de Supabase
3. `/app/api/ranking/route.js` - Manejo seguro de Supabase
4. `/app/api/battle/route.js` - Mejor manejo de errores en getSupabase()

## Variables de Entorno Requeridas en Vercel

Asegúrate de tener configuradas en Vercel Dashboard → Settings → Environment Variables:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_de_supabase
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
GOOGLE_GENAI_API_KEY=tu_api_key_de_gemini
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=tu_clerk_key
CLERK_SECRET_KEY=tu_clerk_secret
```

## Verificación

Después del deploy, verifica:

1. **Logs de Vercel:** Revisa si hay errores relacionados con Supabase
2. **API Routes:** Prueba `/api/battles`, `/api/stats`, `/api/ranking`
3. **Historial:** Verifica que los nombres de Pokémon se muestren correctamente

## Notas

- Si Supabase no está configurado, las APIs devuelven respuestas vacías (200) en lugar de errores
- Los nombres de Pokémon se obtienen desde PokeAPI, lo que puede añadir latencia
- Considera cachear nombres de Pokémon en Supabase para mejor rendimiento
