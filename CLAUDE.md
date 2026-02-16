# Lucario - Pokemon Battle Arena

Este archivo contiene contexto sobre el proyecto para ayudar a entender el codebase.

## Resumen del Proyecto

**Lucario** es una aplicación web de Pokémon que incluye:

- Galería de Pokémon con datos de PokeAPI
- Sistema de batallas por turnos contra IA
- Chat con asistente IA especializado en Pokémon (Google Gemini)
- Sistema de ranking y estadísticas
- Autenticación de usuarios

## Stack Tecnológico

| Categoría     | Tecnología                           |
| ------------- | ------------------------------------ |
| Frontend      | React 19, Next.js 16, Tailwind CSS 4 |
| Backend       | Next.js API Routes                   |
| Base de Datos | Supabase (PostgreSQL)                |
| Autenticación | Clerk                                |
| IA            | Google Gemini (gemini-2.5-flash)     |
| Testing       | Vitest (unit), Playwright (e2e)      |
| Linting       | ESLint, Prettier                     |

## Estructura del Proyecto

```
lucario/
├── app/
│   ├── api/
│   │   ├── battle/          # Sistema de batallas (CRUD principal)
│   │   ├── battles/         # Historial de batallas (solo GET)
│   │   ├── chat/            # Chat con IA
│   │   ├── ranking/         # Ranking de jugadores
│   │   └── stats/           # Estadísticas de usuario
│   ├── battle/              # Páginas de batalla
│   ├── components/          # Componentes React
│   ├── lib/                 # Utilidades (Supabase client)
│   ├── pokemon/[id]/        # Página de detalle de Pokémon
│   └── utils/               # Funciones auxiliares
├── supabase/
│   └── migrations/          # SQL para tablas
├── __tests__/               # Tests unitarios
└── e2e/                     # Tests end-to-end
```

## Arquitectura de Seguridad (Sistema de Batallas)

El sistema usa **Server-Side State** para prevenir manipulación:

```
Cliente                    API Route                  Supabase
┌─────────┐               ┌─────────┐               ┌─────────┐
│ Solo    │──battleId────►│ Valida  │──────────────►│ FUENTE  │
│ envía   │  attackId     │ calcula │               │ DE      │
│ IDs     │◄─nuevo estado─│ guarda  │◄──────────────│ VERDAD  │
└─────────┘               └─────────┘               └─────────┘
```

**Principios:**

1. El cliente NUNCA envía estado, solo IDs
2. El servidor obtiene el estado de Supabase
3. Validación de permisos en cada request
4. Cálculos de daño en el servidor

## Tablas de Supabase

| Tabla               | Propósito                               |
| ------------------- | --------------------------------------- |
| `battles`           | Registro de batallas (metadatos)        |
| `battle_state`      | Estado en tiempo real (durante combate) |
| `battle_turns`      | Historial de turnos                     |
| `user_battle_stats` | Estadísticas y rating de usuarios       |

## API Endpoints

### Batalla (`/api/battle`)

- `POST { action: 'init', playerPokemonId, opponentPokemonId }` - Iniciar
- `POST { action: 'attack', battleId, attackId }` - Atacar
- `POST { action: 'getState', battleId }` - Obtener estado
- `POST { action: 'abandon', battleId }` - Abandonar
- `GET ?id=xxx` - Consultar batalla

### Historial (`/api/battles`)

- `GET ?limit=10&user_id=xxx&status=xxx` - Listar batallas

### Chat (`/api/chat`)

- `POST { message, conversationHistory }` - Enviar mensaje

### Ranking (`/api/ranking`)

- `GET ?limit=10&offset=0` - Top ranking
- `GET ?user_id=xxx` - Posición de usuario

### Estadísticas (`/api/stats`)

- `GET ?user_id=xxx` - Stats de usuario

## Variables de Entorno

```env
# Clerk (Autenticación)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# Google AI
GOOGLE_GENAI_API_KEY=

# Opcional
NEXT_PUBLIC_SKIP_AUTH=true  # Para desarrollo sin auth
```

## Comandos

```bash
npm run dev          # Desarrollo
npm run build        # Build producción
npm run test         # Tests unitarios
npm run test:e2e     # Tests e2e
npm run lint         # Linting
npm run format       # Formatear código
```

## Flujo de una Batalla

1. **Inicio:** Cliente envía IDs de Pokémon → Servidor crea `battles` y `battle_state`
2. **Turno:** Cliente envía `battleId` + `attackId` → Servidor calcula daño → Actualiza Supabase
3. **Fin:** Servidor detecta HP=0 → Actualiza `user_battle_stats` → Elimina `battle_state`

## Testing

- **Unit:** `__tests__/` con Vitest
- **E2E:** `e2e/` con Playwright
- Ejecutar: `npm run test:all`

## Contribuir

1. Seguir arquitectura de componentes existente
2. Mantener lógica de negocio en el servidor
3. Nunca confiar en datos del cliente
4. Agregar tests para nuevas features
