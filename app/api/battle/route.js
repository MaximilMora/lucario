import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer as supabaseClient } from '../../lib/supabaseServerClient';
import { fetchPokemonMoves } from '../../utils/pokemonMoves';
import {
  calculateDamage,
  getEffectivenessMessage,
} from '../../utils/battleCalculations';

// ============================================
// CONFIGURACIÓN
// ============================================
export const maxDuration = 30;

// Modo desarrollo sin base de datos (usa memoria)
const SKIP_SUPABASE_ENV = process.env.SKIP_SUPABASE === 'true';
const HAS_SUPABASE_KEYS = !!(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
);
const USE_IN_MEMORY_DB = SKIP_SUPABASE_ENV || !HAS_SUPABASE_KEYS;

// Almacenamiento en memoria para desarrollo / fallback
const inMemoryBattles = new Map();
const inMemoryBattleStates = new Map();

// Cliente de Supabase (usa import para Vercel serverless)
function getSupabase() {
  if (USE_IN_MEMORY_DB) {
    return null;
  }
  return supabaseClient;
}

// ============================================
// HELPERS: PokeAPI
// ============================================

/**
 * Obtiene datos de un Pokémon desde PokeAPI
 */
async function fetchPokemonData(pokemonNameOrId) {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId}`
    );
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokemon data:', error);
    return null;
  }
}

/**
 * Extrae stats de un Pokémon
 */
function extractPokemonStats(pokemonData) {
  const getStat = name =>
    pokemonData.stats?.find(s => s.stat.name === name)?.base_stat || 50;

  const baseHP = getStat('hp');
  const level = 50;
  const maxHP = Math.floor(baseHP * (level / 50)) + 50;

  return {
    hp: maxHP,
    attack: getStat('attack'),
    defense: getStat('defense'),
    speed: getStat('speed'),
  };
}

/**
 * Genera ataques para un Pokémon basados en su tipo
 */
function generatePokemonAttacks(pokemonData) {
  const types = pokemonData.types?.map(t => t.type.name) || ['normal'];
  const primaryType = types[0];

  return [
    { id: 1, name: 'Ataque Rápido', power: 30, type: primaryType },
    { id: 2, name: 'Ataque Normal', power: 50, type: primaryType },
    { id: 3, name: 'Ataque Fuerte', power: 70, type: primaryType },
    { id: 4, name: 'Ataque Especial', power: 90, type: primaryType },
  ];
}

// ============================================
// HELPERS: Cálculos de Batalla
// ============================================

// ============================================
// HELPERS: Base de Datos
// ============================================

/**
 * Crea el registro de batalla en la tabla `battles`
 */
async function createBattle({
  player1UserId,
  player1Username,
  player1PokemonId,
  player2PokemonId,
}) {
  // Modo en memoria para desarrollo
  if (USE_IN_MEMORY_DB) {
    const battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    inMemoryBattles.set(battleId, {
      id: battleId,
      player1_user_id: player1UserId,
      player1_username: player1Username,
      player2_user_id: 'ai',
      player2_username: 'AI Opponent',
      player1_pokemon_id: player1PokemonId,
      player2_pokemon_id: player2PokemonId,
      status: 'active',
      started_at: new Date().toISOString(),
    });
    console.log('[DEV MODE] Battle created in memory:', battleId);
    return battleId;
  }

  // Modo Supabase
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('battles')
    .insert({
      player1_user_id: player1UserId,
      player1_username: player1Username,
      player2_user_id: 'ai',
      player2_username: 'AI Opponent',
      player1_pokemon_id: player1PokemonId,
      player2_pokemon_id: player2PokemonId,
      status: 'active',
      started_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('Error creating battle:', error);
    throw new Error(`Failed to create battle: ${error.message}`);
  }

  return data.id;
}

/**
 * Crea el estado inicial de batalla en `battle_state`
 */
async function createBattleState({ battleId, player1Data, player2Data }) {
  const player1Stats = extractPokemonStats(player1Data);
  const player2Stats = extractPokemonStats(player2Data);

  const [player1Attacks, player2Attacks] = await Promise.all([
    fetchPokemonMoves(player1Data),
    fetchPokemonMoves(player2Data),
  ]);

  const stateData = {
    battle_id: battleId,
    // Jugador 1
    player1_pokemon_id: player1Data.id,
    player1_pokemon_name: player1Data.name,
    player1_current_hp: player1Stats.hp,
    player1_max_hp: player1Stats.hp,
    player1_attack: player1Stats.attack,
    player1_defense: player1Stats.defense,
    player1_speed: player1Stats.speed,
    player1_types: player1Data.types?.map(t => t.type.name) || [],
    player1_attacks: player1Attacks,
    player1_sprite_front: player1Data.sprites?.front_default,
    player1_sprite_back: player1Data.sprites?.back_default,
    // Jugador 2 (AI)
    player2_pokemon_id: player2Data.id,
    player2_pokemon_name: player2Data.name,
    player2_current_hp: player2Stats.hp,
    player2_max_hp: player2Stats.hp,
    player2_attack: player2Stats.attack,
    player2_defense: player2Stats.defense,
    player2_speed: player2Stats.speed,
    player2_types: player2Data.types?.map(t => t.type.name) || [],
    player2_attacks: player2Attacks,
    player2_sprite_front: player2Data.sprites?.front_default,
    player2_sprite_back: player2Data.sprites?.back_default,
    // Estado inicial
    current_turn: 'player1',
    turn_number: 0,
    status: 'active',
    messages: [
      { text: `¡${player1Data.name} vs ${player2Data.name}!`, type: 'system' },
      { text: '¡Comienza el combate!', type: 'system' },
    ],
  };

  // Modo en memoria para desarrollo
  if (USE_IN_MEMORY_DB) {
    inMemoryBattleStates.set(battleId, stateData);
    console.log('[DEV MODE] Battle state created in memory');
    return;
  }

  // Modo Supabase
  const supabase = getSupabase();
  const { error } = await supabase.from('battle_state').insert(stateData);

  if (error) {
    console.error('Error creating battle state:', error);
    throw new Error(`Failed to create battle state: ${error.message}`);
  }
}

/**
 * Obtiene el estado actual de una batalla (memoria o Supabase)
 */
async function getBattleState(battleId) {
  // Siempre revisar memoria primero (fallback de batallas creadas en memoria)
  const fromMemory = inMemoryBattleStates.get(battleId);
  if (fromMemory) return fromMemory;

  if (USE_IN_MEMORY_DB) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('battle_state')
    .select('*')
    .eq('battle_id', battleId)
    .single();

  if (error) {
    console.error('Error fetching battle state:', error);
    return null;
  }

  return data;
}

/**
 * Obtiene la información de una batalla (memoria o Supabase)
 */
async function getBattle(battleId) {
  // Siempre revisar memoria primero
  const fromMemory = inMemoryBattles.get(battleId);
  if (fromMemory) return fromMemory;

  if (USE_IN_MEMORY_DB) return null;

  const supabase = getSupabase();
  if (!supabase) return null;

  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();

  if (error) {
    console.error('Error fetching battle:', error);
    return null;
  }

  return data;
}

/**
 * Actualiza el estado de batalla (memoria o Supabase)
 */
async function updateBattleState(battleId, updates) {
  const inMemory = inMemoryBattleStates.get(battleId);
  if (inMemory) {
    inMemoryBattleStates.set(battleId, {
      ...inMemory,
      ...updates,
      updated_at: new Date().toISOString(),
    });
    return;
  }

  if (USE_IN_MEMORY_DB) return;

  const supabase = getSupabase();
  if (!supabase) return;

  const { error } = await supabase
    .from('battle_state')
    .update({
      ...updates,
      updated_at: new Date().toISOString(),
    })
    .eq('battle_id', battleId);

  if (error) {
    console.error('Error updating battle state:', error);
    throw new Error('Failed to update battle state');
  }
}

/**
 * Registra un turno en el historial
 */
async function logBattleTurn(turnData) {
  // Modo en memoria - solo log
  if (USE_IN_MEMORY_DB) {
    console.log(
      '[DEV MODE] Turn logged:',
      turnData.turn_number,
      turnData.attack_name
    );
    return;
  }

  // Modo Supabase
  const supabase = getSupabase();
  const { error } = await supabase.from('battle_turns').insert(turnData);

  if (error) {
    console.error('Error logging battle turn:', error);
    // No lanzamos error para no interrumpir la batalla
  }
}

/**
 * Finaliza una batalla y actualiza estadísticas
 */
async function finalizeBattle(battleId, winnerSide, totalTurns) {
  const nowIso = new Date().toISOString();

  const battle = await getBattle(battleId);
  if (!battle) return;

  const status = winnerSide === 'player1' ? 'player1_won' : 'player2_won';
  const winnerUserId =
    winnerSide === 'player1' ? battle.player1_user_id : battle.player2_user_id;
  const loserUserId =
    winnerSide === 'player1' ? battle.player2_user_id : battle.player1_user_id;

  // Batalla en memoria (incluye fallback cuando Supabase falló)
  if (inMemoryBattles.has(battleId)) {
    const currentBattle = inMemoryBattles.get(battleId);
    if (currentBattle) {
      inMemoryBattles.set(battleId, {
        ...currentBattle,
        status,
        winner_user_id: winnerUserId,
        total_turns: totalTurns,
        finished_at: nowIso,
      });
    }
    inMemoryBattleStates.delete(battleId);
    return;
  }

  if (USE_IN_MEMORY_DB) return;

  const supabase = getSupabase();
  if (!supabase) return;

  // Actualizar batalla
  await supabase
    .from('battles')
    .update({
      status,
      winner_user_id: winnerUserId,
      total_turns: totalTurns,
      finished_at: nowIso,
    })
    .eq('id', battleId);

  // Actualizar stats del ganador (si no es AI)
  if (winnerUserId && winnerUserId !== 'ai') {
    await updateUserStats(winnerUserId, 'win');
  }

  // Actualizar stats del perdedor (si no es AI)
  if (loserUserId && loserUserId !== 'ai') {
    await updateUserStats(loserUserId, 'loss');
  }

  // Eliminar el estado de batalla (ya no se necesita)
  await supabase.from('battle_state').delete().eq('battle_id', battleId);
}

/**
 * Actualiza las estadísticas de un usuario
 */
async function updateUserStats(userId, result) {
  // Modo en memoria - solo log
  if (USE_IN_MEMORY_DB) {
    console.log('[DEV MODE] User stats update:', userId, result);
    return;
  }

  // Modo Supabase
  const supabase = getSupabase();
  const { data: existing } = await supabase
    .from('user_battle_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  const isWin = result === 'win';
  const nowIso = new Date().toISOString();

  if (existing) {
    const newWinStreak = isWin ? (existing.current_win_streak || 0) + 1 : 0;
    const newBestStreak = Math.max(existing.best_win_streak || 0, newWinStreak);

    await supabase
      .from('user_battle_stats')
      .update({
        total_battles: (existing.total_battles || 0) + 1,
        wins: (existing.wins || 0) + (isWin ? 1 : 0),
        losses: (existing.losses || 0) + (isWin ? 0 : 1),
        current_win_streak: newWinStreak,
        best_win_streak: newBestStreak,
        last_battle_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', userId);
  } else {
    await supabase.from('user_battle_stats').insert({
      user_id: userId,
      total_battles: 1,
      wins: isWin ? 1 : 0,
      losses: isWin ? 0 : 1,
      current_win_streak: isWin ? 1 : 0,
      best_win_streak: isWin ? 1 : 0,
      rating: 1000,
      peak_rating: 1000,
      first_battle_at: nowIso,
      last_battle_at: nowIso,
    });
  }
}

// ============================================
// HELPERS: Formatear respuesta para el cliente
// ============================================

/**
 * Convierte el estado de BD a formato para el cliente
 */
function formatBattleStateForClient(state) {
  return {
    battleId: state.battle_id,
    turnNumber: state.turn_number,
    currentTurn: state.current_turn,
    status: state.status,
    messages: state.messages || [],
    player: {
      pokemon: {
        id: state.player1_pokemon_id,
        name: state.player1_pokemon_name,
        sprites: {
          front_default: state.player1_sprite_front,
          back_default: state.player1_sprite_back,
        },
      },
      currentHP: state.player1_current_hp,
      maxHP: state.player1_max_hp,
      attacks: state.player1_attacks,
    },
    opponent: {
      pokemon: {
        id: state.player2_pokemon_id,
        name: state.player2_pokemon_name,
        sprites: {
          front_default: state.player2_sprite_front,
          back_default: state.player2_sprite_back,
        },
      },
      currentHP: state.player2_current_hp,
      maxHP: state.player2_max_hp,
      attacks: state.player2_attacks,
    },
  };
}

// ============================================
// API HANDLERS
// ============================================

/**
 * Obtiene userId de Clerk sin lanzar en Vercel
 */
async function getAuthUserId() {
  try {
    const { userId } = await auth();
    return userId ?? null;
  } catch (e) {
    console.warn('Auth not available:', e?.message);
    return null;
  }
}

/**
 * Parsea el body JSON de forma segura
 */
async function parseBody(request) {
  try {
    return await request.json();
  } catch (e) {
    console.warn('Invalid JSON body:', e?.message);
    return null;
  }
}

/**
 * POST /api/battle
 * Maneja las acciones del combate de forma SEGURA
 * El cliente solo envía IDs, el servidor mantiene el estado
 */
export async function POST(request) {
  try {
    const clerkUserId = await getAuthUserId();
    const body = await parseBody(request);
    if (body == null) {
      console.warn('[Battle API] Invalid request body (JSON required)');
      return NextResponse.json(
        { error: 'Invalid request body (JSON required)' },
        { status: 400 }
      );
    }
    const { action } = body;

    if (!action) {
      console.warn('[Battle API] Missing action in request body');
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // ========================================
    // ACCIÓN: INICIALIZAR BATALLA
    // ========================================
    if (action === 'init') {
      const { playerPokemonId, opponentPokemonId, username } = body;

      if (!playerPokemonId || !opponentPokemonId) {
        console.warn(
          '[Battle API] init: missing playerPokemonId or opponentPokemonId',
          {
            playerPokemonId: body.playerPokemonId,
            opponentPokemonId: body.opponentPokemonId,
          }
        );
        return NextResponse.json(
          { error: 'Player and opponent Pokemon IDs are required' },
          { status: 400 }
        );
      }

      // Obtener datos de los Pokémon desde PokeAPI
      const [player1Data, player2Data] = await Promise.all([
        fetchPokemonData(playerPokemonId),
        fetchPokemonData(opponentPokemonId),
      ]);

      if (!player1Data || !player2Data) {
        return NextResponse.json(
          { error: 'Could not fetch Pokemon data' },
          { status: 404 }
        );
      }

      const player1UserId = clerkUserId || 'guest';
      const player1Username =
        username || (player1UserId === 'guest' ? 'Guest' : 'Player');

      let battleId;
      try {
        battleId = await createBattle({
          player1UserId,
          player1Username,
          player1PokemonId: player1Data.id,
          player2PokemonId: player2Data.id,
        });
        await createBattleState({
          battleId,
          player1Data,
          player2Data,
        });
      } catch (dbError) {
        console.error(
          'Supabase battle init failed, using in-memory fallback:',
          dbError?.message
        );
        // Fallback: crear batalla en memoria para esta request
        battleId = `battle-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        inMemoryBattles.set(battleId, {
          id: battleId,
          player1_user_id: player1UserId,
          player1_username: player1Username,
          player2_user_id: 'ai',
          player2_username: 'AI Opponent',
          player1_pokemon_id: player1Data.id,
          player2_pokemon_id: player2Data.id,
          status: 'active',
          started_at: new Date().toISOString(),
        });
        const [fb1Attacks, fb2Attacks] = await Promise.all([
          fetchPokemonMoves(player1Data),
          fetchPokemonMoves(player2Data),
        ]);
        const p1Stats = extractPokemonStats(player1Data);
        const p2Stats = extractPokemonStats(player2Data);
        const stateData = {
          battle_id: battleId,
          player1_pokemon_id: player1Data.id,
          player1_pokemon_name: player1Data.name,
          player1_current_hp: p1Stats.hp,
          player1_max_hp: p1Stats.hp,
          player1_attack: p1Stats.attack,
          player1_defense: p1Stats.defense,
          player1_speed: p1Stats.speed,
          player1_types: player1Data.types?.map(t => t.type.name) || [],
          player1_attacks: fb1Attacks,
          player1_sprite_front: player1Data.sprites?.front_default,
          player1_sprite_back: player1Data.sprites?.back_default,
          player2_pokemon_id: player2Data.id,
          player2_pokemon_name: player2Data.name,
          player2_current_hp: p2Stats.hp,
          player2_max_hp: p2Stats.hp,
          player2_attack: p2Stats.attack,
          player2_defense: p2Stats.defense,
          player2_speed: p2Stats.speed,
          player2_types: player2Data.types?.map(t => t.type.name) || [],
          player2_attacks: fb2Attacks,
          player2_sprite_front: player2Data.sprites?.front_default,
          player2_sprite_back: player2Data.sprites?.back_default,
          current_turn: 'player1',
          turn_number: 0,
          status: 'active',
          messages: [
            {
              text: `¡${player1Data.name} vs ${player2Data.name}!`,
              type: 'system',
            },
            { text: '¡Comienza el combate!', type: 'system' },
          ],
        };
        inMemoryBattleStates.set(battleId, stateData);
      }

      const battleState = await getBattleState(battleId);
      return NextResponse.json({
        success: true,
        battleState: formatBattleStateForClient(battleState),
      });
    }

    // ========================================
    // ACCIÓN: EJECUTAR ATAQUE
    // ========================================
    if (action === 'attack') {
      const { battleId, attackId } = body;

      // Validar parámetros (el cliente solo envía IDs)
      if (!battleId) {
        return NextResponse.json(
          { error: 'battleId is required' },
          { status: 400 }
        );
      }

      if (attackId === undefined) {
        return NextResponse.json(
          { error: 'attackId is required' },
          { status: 400 }
        );
      }

      // Obtener batalla y validar permisos
      const battle = await getBattle(battleId);
      if (!battle) {
        return NextResponse.json(
          { error: 'Battle not found' },
          { status: 404 }
        );
      }

      // Validar que el usuario es dueño de la batalla
      const userId = clerkUserId || 'guest';
      if (
        battle.player1_user_id !== userId &&
        battle.player1_user_id !== 'guest'
      ) {
        return NextResponse.json(
          { error: 'Unauthorized - This is not your battle' },
          { status: 403 }
        );
      }

      // Obtener estado actual desde Supabase (FUENTE DE VERDAD)
      const state = await getBattleState(battleId);
      if (!state) {
        return NextResponse.json(
          { error: 'Battle state not found' },
          { status: 404 }
        );
      }

      // Validar que la batalla está activa
      if (state.status !== 'active') {
        return NextResponse.json(
          { error: 'Battle is not active' },
          { status: 400 }
        );
      }

      // Validar que es el turno del jugador
      if (state.current_turn !== 'player1') {
        return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
      }

      // Validar que el ataque existe
      const selectedAttack = state.player1_attacks.find(a => a.id === attackId);
      if (!selectedAttack) {
        return NextResponse.json({ error: 'Invalid attack' }, { status: 400 });
      }

      const messages = [...(state.messages || [])];
      let newPlayer1HP = state.player1_current_hp;
      let newPlayer2HP = state.player2_current_hp;
      let newStatus = 'active';
      let turnNumber = state.turn_number;
      const nowIso = new Date().toISOString();

      // ---- TURNO DEL JUGADOR ----
      const { damage: player1Damage, effectiveness: eff1 } = calculateDamage(
        state.player1_attack,
        state.player2_defense,
        selectedAttack.power,
        selectedAttack.type,
        state.player2_types || []
      );

      const player2HPBefore = newPlayer2HP;
      newPlayer2HP = Math.max(0, newPlayer2HP - player1Damage);
      turnNumber += 1;

      messages.push({
        text: `${state.player1_pokemon_name} usó ${selectedAttack.name}!`,
        type: 'attack',
      });
      const effMsg1 = getEffectivenessMessage(eff1);
      if (effMsg1) messages.push(effMsg1);
      messages.push({
        text: `${state.player2_pokemon_name} recibió ${player1Damage} de daño.`,
        type: 'damage',
      });

      // Registrar turno del jugador
      await logBattleTurn({
        battle_id: battleId,
        turn_number: turnNumber,
        player_side: 'player1',
        player_user_id: battle.player1_user_id,
        action_type: 'attack',
        attack_id: selectedAttack.id,
        attack_name: selectedAttack.name,
        attack_power: selectedAttack.power,
        damage_dealt: player1Damage,
        effectiveness: String(eff1),
        target_hp_before: player2HPBefore,
        target_hp_after: newPlayer2HP,
        attacker_hp_after: newPlayer1HP,
        message: `${state.player1_pokemon_name} usó ${selectedAttack.name}!`,
        executed_at: nowIso,
      });

      // Verificar si el oponente fue derrotado
      if (newPlayer2HP <= 0) {
        newPlayer2HP = 0;
        newStatus = 'player1_won';
        messages.push({
          text: `¡${state.player2_pokemon_name} se debilitó!`,
          type: 'faint',
        });
        messages.push({ text: '¡Has ganado el combate!', type: 'victory' });

        // Actualizar estado y finalizar
        await updateBattleState(battleId, {
          player2_current_hp: 0,
          turn_number: turnNumber,
          status: newStatus,
          messages,
        });

        await finalizeBattle(battleId, 'player1', turnNumber);

        const finalState = await getBattleState(battleId);
        // Si el estado fue eliminado, construir respuesta manual
        return NextResponse.json({
          success: true,
          battleState: finalState
            ? formatBattleStateForClient(finalState)
            : {
                battleId,
                turnNumber,
                status: newStatus,
                messages,
                player: {
                  pokemon: {
                    id: state.player1_pokemon_id,
                    name: state.player1_pokemon_name,
                  },
                  currentHP: newPlayer1HP,
                  maxHP: state.player1_max_hp,
                },
                opponent: {
                  pokemon: {
                    id: state.player2_pokemon_id,
                    name: state.player2_pokemon_name,
                  },
                  currentHP: 0,
                  maxHP: state.player2_max_hp,
                },
              },
        });
      }

      // ---- TURNO DE LA IA ----
      const opponentAttacks = state.player2_attacks || [];

      if (!Array.isArray(opponentAttacks) || opponentAttacks.length === 0) {
        console.error('Opponent has no valid attacks:', {
          player2_pokemon_name: state.player2_pokemon_name,
          player2_attacks: state.player2_attacks,
        });
        return NextResponse.json(
          { error: 'Opponent has no valid attacks' },
          { status: 500 }
        );
      }

      const aiAttack =
        opponentAttacks[Math.floor(Math.random() * opponentAttacks.length)];
      const { damage: player2Damage, effectiveness: eff2 } = calculateDamage(
        state.player2_attack,
        state.player1_defense,
        Number(aiAttack?.power) || 10,
        aiAttack?.type,
        state.player1_types || []
      );

      const player1HPBefore = newPlayer1HP;
      newPlayer1HP = Math.max(0, newPlayer1HP - player2Damage);
      turnNumber += 1;

      messages.push({
        text: `${state.player2_pokemon_name} usó ${aiAttack.name}!`,
        type: 'attack',
      });
      const effMsg2 = getEffectivenessMessage(eff2);
      if (effMsg2) messages.push(effMsg2);
      messages.push({
        text: `${state.player1_pokemon_name} recibió ${player2Damage} de daño.`,
        type: 'damage',
      });

      // Registrar turno de la IA
      await logBattleTurn({
        battle_id: battleId,
        turn_number: turnNumber,
        player_side: 'player2',
        player_user_id: 'ai',
        action_type: 'attack',
        attack_id: aiAttack.id,
        attack_name: aiAttack.name,
        attack_power: aiAttack.power,
        damage_dealt: player2Damage,
        effectiveness: String(eff2),
        target_hp_before: player1HPBefore,
        target_hp_after: newPlayer1HP,
        attacker_hp_after: newPlayer2HP,
        message: `${state.player2_pokemon_name} usó ${aiAttack.name}!`,
        executed_at: nowIso,
      });

      // Verificar si el jugador fue derrotado
      if (newPlayer1HP <= 0) {
        newPlayer1HP = 0;
        newStatus = 'player2_won';
        messages.push({
          text: `¡${state.player1_pokemon_name} se debilitó!`,
          type: 'faint',
        });
        messages.push({ text: 'Has perdido el combate...', type: 'defeat' });

        // Actualizar estado y finalizar
        await updateBattleState(battleId, {
          player1_current_hp: 0,
          player2_current_hp: newPlayer2HP,
          turn_number: turnNumber,
          status: newStatus,
          messages,
        });

        await finalizeBattle(battleId, 'player2', turnNumber);

        const finalState = await getBattleState(battleId);
        return NextResponse.json({
          success: true,
          battleState: finalState
            ? formatBattleStateForClient(finalState)
            : {
                battleId,
                turnNumber,
                status: newStatus,
                messages,
                player: {
                  pokemon: {
                    id: state.player1_pokemon_id,
                    name: state.player1_pokemon_name,
                  },
                  currentHP: 0,
                  maxHP: state.player1_max_hp,
                },
                opponent: {
                  pokemon: {
                    id: state.player2_pokemon_id,
                    name: state.player2_pokemon_name,
                  },
                  currentHP: newPlayer2HP,
                  maxHP: state.player2_max_hp,
                },
              },
        });
      }

      // ---- CONTINÚA LA BATALLA ----
      // Actualizar estado en Supabase
      await updateBattleState(battleId, {
        player1_current_hp: newPlayer1HP,
        player2_current_hp: newPlayer2HP,
        turn_number: turnNumber,
        current_turn: 'player1',
        status: 'active',
        messages,
      });

      // Obtener estado actualizado
      const updatedState = await getBattleState(battleId);

      return NextResponse.json({
        success: true,
        battleState: formatBattleStateForClient(updatedState),
      });
    }

    // ========================================
    // ACCIÓN: OBTENER ESTADO (nueva acción útil)
    // ========================================
    if (action === 'getState') {
      const { battleId } = body;

      if (!battleId) {
        return NextResponse.json(
          { error: 'battleId is required' },
          { status: 400 }
        );
      }

      const battle = await getBattle(battleId);
      if (!battle) {
        return NextResponse.json(
          { error: 'Battle not found' },
          { status: 404 }
        );
      }

      // Validar permisos
      const userId = clerkUserId || 'guest';
      if (
        battle.player1_user_id !== userId &&
        battle.player1_user_id !== 'guest'
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      const state = await getBattleState(battleId);
      if (!state) {
        return NextResponse.json(
          { error: 'Battle state not found (battle may have ended)' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        success: true,
        battleState: formatBattleStateForClient(state),
      });
    }

    // ========================================
    // ACCIÓN: ABANDONAR BATALLA
    // ========================================
    if (action === 'abandon') {
      const { battleId } = body;

      if (!battleId) {
        return NextResponse.json(
          { error: 'battleId is required' },
          { status: 400 }
        );
      }

      const battle = await getBattle(battleId);
      if (!battle) {
        return NextResponse.json(
          { error: 'Battle not found' },
          { status: 404 }
        );
      }

      // Validar permisos
      const userId = clerkUserId || 'guest';
      if (
        battle.player1_user_id !== userId &&
        battle.player1_user_id !== 'guest'
      ) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Batalla en memoria
      if (inMemoryBattles.has(battleId)) {
        const currentBattle = inMemoryBattles.get(battleId);
        if (currentBattle) {
          inMemoryBattles.set(battleId, {
            ...currentBattle,
            status: 'abandoned',
            finished_at: new Date().toISOString(),
          });
        }
        inMemoryBattleStates.delete(battleId);
      } else if (getSupabase()) {
        const supabase = getSupabase();
        await supabase
          .from('battles')
          .update({
            status: 'abandoned',
            finished_at: new Date().toISOString(),
          })
          .eq('id', battleId);
        await supabase.from('battle_state').delete().eq('battle_id', battleId);
      }

      return NextResponse.json({
        success: true,
        message: 'Battle abandoned',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Battle API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process battle action', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/battle?id=xxx
 * Obtiene el estado de una batalla (solo lectura)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const battleId = searchParams.get('id');
    const clerkUserId = await getAuthUserId();

    if (!battleId) {
      return NextResponse.json(
        { error: 'Battle ID is required' },
        { status: 400 }
      );
    }

    const battle = await getBattle(battleId);
    if (!battle) {
      return NextResponse.json({ error: 'Battle not found' }, { status: 404 });
    }

    // Validar permisos
    const userId = clerkUserId || 'guest';
    if (
      battle.player1_user_id !== userId &&
      battle.player2_user_id !== userId &&
      battle.player1_user_id !== 'guest'
    ) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const state = await getBattleState(battleId);

    return NextResponse.json({
      success: true,
      battle,
      battleState: state ? formatBattleStateForClient(state) : null,
    });
  } catch (error) {
    console.error('Battle API GET Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch battle' },
      { status: 500 }
    );
  }
}
