# Sistema de Batallas - Esquema de Base de Datos

## Arquitectura de Seguridad

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│     Cliente     │     │    API Route    │     │    Supabase     │
│                 │     │                 │     │                 │
│  Solo envía:    │────►│  Valida:        │────►│  Almacena:      │
│  - battleId     │     │  - Auth         │     │  - Estado real  │
│  - attackId     │     │  - Permisos     │     │  - Historial    │
│                 │     │  - Turno        │     │  - Stats        │
│  Recibe:        │◄────│  Calcula:       │◄────│                 │
│  - Nuevo estado │     │  - Daño         │     │  FUENTE DE      │
│  - Mensajes     │     │  - Resultado    │     │  VERDAD         │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

## Tablas

### 1. `battles` - Registro de Batallas

Información básica de cada batalla (metadatos).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | UUID | ID único de la batalla |
| `player1_user_id` | TEXT | ID de Clerk del jugador 1 |
| `player2_user_id` | TEXT | ID del jugador 2 ('ai' para CPU) |
| `player1_pokemon_id` | INTEGER | ID del Pokémon del jugador 1 |
| `player2_pokemon_id` | INTEGER | ID del Pokémon del jugador 2 |
| `status` | TEXT | 'active', 'player1_won', 'player2_won', 'draw', 'abandoned' |
| `winner_user_id` | TEXT | ID del ganador (NULL si activa/empate) |
| `total_turns` | INTEGER | Total de turnos al finalizar |

### 2. `battle_state` - Estado en Tiempo Real

**FUENTE DE VERDAD** durante el combate. El cliente NUNCA modifica esto directamente.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `battle_id` | UUID | FK a battles |
| `player1_current_hp` | INTEGER | HP actual del Pokémon 1 |
| `player1_max_hp` | INTEGER | HP máximo |
| `player1_attack` | INTEGER | Stat de ataque |
| `player1_defense` | INTEGER | Stat de defensa |
| `player1_attacks` | JSONB | Ataques disponibles |
| `current_turn` | TEXT | 'player1' o 'player2' |
| `turn_number` | INTEGER | Número de turno actual |
| `status` | TEXT | Estado de la batalla |
| `messages` | JSONB | Últimos mensajes para UI |

### 3. `battle_turns` - Historial de Turnos

Registro inmutable de cada acción (para auditoría/replay).

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `battle_id` | UUID | FK a battles |
| `turn_number` | INTEGER | Número de turno |
| `player_side` | TEXT | 'player1' o 'player2' |
| `action_type` | TEXT | 'attack', 'switch', 'item', 'flee' |
| `attack_name` | TEXT | Nombre del ataque usado |
| `damage_dealt` | INTEGER | Daño causado |
| `target_hp_before` | INTEGER | HP del objetivo antes |
| `target_hp_after` | INTEGER | HP del objetivo después |

### 4. `user_battle_stats` - Estadísticas de Usuario

Datos agregados para ranking y perfil.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `user_id` | TEXT | ID único del usuario |
| `total_battles` | INTEGER | Total de batallas |
| `wins` | INTEGER | Victorias |
| `losses` | INTEGER | Derrotas |
| `rating` | INTEGER | Rating ELO (default 1000) |
| `current_win_streak` | INTEGER | Racha actual |
| `best_win_streak` | INTEGER | Mejor racha histórica |

## Flujo de una Batalla

### 1. Iniciar Batalla

```javascript
// Cliente envía
POST /api/battle
{
  action: 'init',
  playerPokemonId: 25,      // Pikachu
  opponentPokemonId: 6      // Charizard
}

// Servidor:
// 1. Crea registro en `battles`
// 2. Obtiene datos de PokeAPI
// 3. Crea `battle_state` con HP, stats, ataques
// 4. Devuelve battleId + estado inicial
```

### 2. Ejecutar Ataque

```javascript
// Cliente envía (¡SOLO IDs!)
POST /api/battle
{
  action: 'attack',
  battleId: 'uuid-de-la-batalla',
  attackId: 2
}

// Servidor:
// 1. Obtiene battle_state de Supabase
// 2. Valida que es el turno del usuario
// 3. Valida que el ataque existe
// 4. Calcula daño EN EL SERVIDOR
// 5. Actualiza battle_state
// 6. Registra en battle_turns
// 7. Devuelve nuevo estado
```

### 3. Finalizar Batalla

```javascript
// Cuando HP llega a 0, el servidor:
// 1. Llama a finalize_battle(battle_id, winner_side)
// 2. Actualiza `battles` con resultado
// 3. Actualiza `user_battle_stats`
// 4. Elimina `battle_state` (ya no se necesita)
```

## Estructura de Datos JSON

### `player1_attacks` (JSONB)

```json
[
  { "id": 1, "name": "Ataque Rápido", "power": 30, "type": "electric" },
  { "id": 2, "name": "Impactrueno", "power": 50, "type": "electric" },
  { "id": 3, "name": "Rayo", "power": 90, "type": "electric" },
  { "id": 4, "name": "Trueno", "power": 110, "type": "electric" }
]
```

### `messages` (JSONB)

```json
[
  { "text": "¡Pikachu vs Charizard!", "type": "system" },
  { "text": "¡Comienza el combate!", "type": "system" },
  { "text": "Pikachu usó Impactrueno!", "type": "attack" },
  { "text": "Charizard recibió 45 de daño.", "type": "damage" }
]
```

## Seguridad (RLS)

### Políticas Implementadas

| Tabla | SELECT | INSERT | UPDATE | DELETE |
|-------|--------|--------|--------|--------|
| `battles` | Solo propias | Solo como player1 | Solo sistema | No |
| `battle_state` | Solo propias | Solo sistema | Solo sistema | Solo sistema |
| `battle_turns` | Solo propias | Solo sistema | No | No |
| `user_battle_stats` | Público | Solo sistema | Solo sistema | No |

### Cómo Funciona

1. **Cliente → API Route**: El cliente solo puede enviar `battleId` y `attackId`
2. **API Route → Supabase**: Usa `service_role` key para bypass RLS
3. **Validación en API**: Verifica que `clerkUserId` coincide con `player1_user_id`

## Instalación

1. Ejecutar el SQL en Supabase Dashboard → SQL Editor
2. O usar Supabase CLI:

```bash
supabase db push
```

## Ejemplo de Query

### Obtener ranking top 10

```sql
SELECT * FROM public_ranking LIMIT 10;
```

### Obtener historial de batalla

```sql
SELECT 
  bt.turn_number,
  bt.player_side,
  bt.attack_name,
  bt.damage_dealt,
  bt.target_hp_after
FROM battle_turns bt
WHERE bt.battle_id = 'uuid-aqui'
ORDER BY bt.turn_number;
```

### Estadísticas de un usuario

```sql
SELECT 
  total_battles,
  wins,
  losses,
  ROUND((wins::FLOAT / NULLIF(total_battles, 0) * 100)::NUMERIC, 1) as win_rate,
  rating,
  best_win_streak
FROM user_battle_stats
WHERE user_id = 'clerk_user_id_aqui';
```
