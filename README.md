# Lucario — Pokémon Battle Arena

Aplicación web full-stack de combates Pokémon por turnos con multijugador en tiempo real, autenticación de usuarios y chat con asistente de IA.

[Demo en vivo](https://lucario.vercel.app) · [Ver código](https://github.com/MaximilMora/lucario)

---

## Funcionalidades

- **Galería de Pokémon** — Exploración con datos en tiempo real desde PokeAPI
- **Batallas vs IA** — Sistema de combate por turnos con movimientos reales de cada Pokémon, efectividad de tipos (18 tipos) y temporizador de 30 segundos por turno con auto-ataque al expirar
- **Multijugador PvP** — Matchmaking y batallas en tiempo real vía WebSockets (Supabase Realtime)
- **Chat con IA** — Asistente especializado en Pokémon usando Google Gemini
- **Ranking y estadísticas** — Sistema de puntuación e historial de batallas por usuario
- **Autenticación** — Login con Clerk (soporte para múltiples proveedores)

---

## Stack tecnológico

| Categoría     | Tecnología                           |
| ------------- | ------------------------------------ |
| Frontend      | React 19, Next.js 15, Tailwind CSS 4 |
| Backend       | Next.js API Routes (serverless)      |
| Base de datos | Supabase (PostgreSQL + Realtime)     |
| Autenticación | Clerk                                |
| IA            | Google Gemini (gemini-2.5-flash)     |
| Testing       | Vitest (unit), Playwright (e2e)      |
| CI/CD         | GitHub Actions                       |
| Deploy        | Vercel                               |

---

## Decisiones técnicas destacadas

- **Server-side state**: el cliente solo envía IDs; el servidor obtiene el estado desde Supabase, calcula el daño y valida cada acción — eliminando posibilidad de manipulación
- **Efectividad de tipos**: tabla completa de 18 tipos Pokémon implementada en el servidor con multiplicadores 0x / 0.5x / 2x / 4x
- **Optimización de latencia**: uso de `Promise.all()` para paralelizar llamadas a Clerk, PokeAPI y Supabase en el inicio de cada batalla
- **Caché a nivel de módulo**: `Map` en el servidor para datos de movimientos de PokeAPI, reduciendo llamadas externas repetidas

---

## Correr localmente

```bash
# 1. Clonar el repositorio
git clone https://github.com/MaximilMora/lucario.git
cd lucario

# 2. Instalar dependencias
npm install

# 3. Configurar variables de entorno
cp .env.example .env.local
# Completar con tus keys de Clerk, Supabase y Google AI

# 4. Correr en desarrollo
npm run dev
```

Abrir [http://localhost:3000](http://localhost:3000)

---

## Variables de entorno

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
GOOGLE_GENAI_API_KEY=
```

---

## Scripts

```bash
npm run dev          # Servidor de desarrollo
npm run build        # Build de producción
npm run test         # Tests unitarios (Vitest)
npm run test:e2e     # Tests end-to-end (Playwright)
npm run lint         # ESLint
npm run format       # Prettier
```
