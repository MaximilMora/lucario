import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  calculateDamage,
  calculateMaxHP,
  getPokemonAttacks,
  getAttackStat,
  getDefenseStat,
  getHPStat,
} from '../../utils/battleUtils';
import { supabaseServer } from '../../lib/supabaseServerClient';

// Helper: fetch Pokemon data from PokeAPI
async function fetchPokemonData(pokemonNameOrId) {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId}`
    );
    if (!response.ok) return null;
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
  const getStat = (name) =>
    pokemonData.stats?.find((s) => s.stat.name === name)?.base_stat || 50;

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
  const types = pokemonData.types?.map((t) => t.type.name) || ['normal'];
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

/**
 * Calcula el daño de un ataque (EN EL SERVIDOR - fuente de verdad)
 */
function calculateDamage(attackStat, defenseStat, movePower) {
  const baseDamage = (attackStat / defenseStat) * movePower;
  const variation = 0.8 + Math.random() * 0.4; // 80-120%
  return Math.max(1, Math.floor(baseDamage * variation));
}

// ============================================
// HELPERS: Base de Datos
// ============================================

/**
 * Crea el registro de batalla en la tabla `battles`
 */
async function createBattle({ player1UserId, player1Username, player1PokemonId, player2PokemonId }) {
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
    player1_types: player1Data.types?.map((t) => t.type.name) || [],
    player1_attacks: generatePokemonAttacks(player1Data),
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
    player2_types: player2Data.types?.map((t) => t.type.name) || [],
    player2_attacks: generatePokemonAttacks(player2Data),
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
    console.log('[DEV MODE] Turn logged:', turnData.turn_number, turnData.attack_name);
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
  const winnerUserId = winnerSide === 'player1' ? battle.player1_user_id : battle.player2_user_id;
  const loserUserId = winnerSide === 'player1' ? battle.player2_user_id : battle.player1_user_id;

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

// ─── DB helpers ───────────────────────────────────────────────

async function loadBattleState(battleId) {
  const { data, error } = await supabaseServer
    .from('battles')
    .select('id, battle_state, status')
    .eq('id', battleId)
    .single();

  if (error || !data) {
    console.error('Error loading battle state:', error);
    return null;
  }
  return data;
}

async function saveBattleState(battleId, battleState) {
  const { error } = await supabaseServer
    .from('battles')
    .update({ battle_state: battleState })
    .eq('id', battleId);

  if (error) console.error('Error saving battle state:', error);
}

async function logBattleTurn(turn) {
  try {
    if (!turn?.battle_id) return;
    const { error } = await supabaseServer.from('battle_turns').insert(turn);
    if (error) console.error('Supabase insert battle_turns error:', error);
  } catch (error) {
    console.error('Supabase insert battle_turns exception:', error);
  }
}

async function finalizeBattle({
  battleId,
  battleState,
  status,
  winnerSide,
  totalTurns,
  userId,
  username,
}) {
  try {
    if (!battleId) return;

    const nowIso = new Date().toISOString();

    // Update battle record
    const { error } = await supabaseServer
      .from('battles')
      .update({
        battle_state: battleState,
        status,
        winner_side: winnerSide,
        total_turns: Number.isFinite(totalTurns) ? totalTurns : 0,
        finished_at: nowIso,
      })
      .eq('id', battleId);

    if (error) {
      console.error('Supabase finalize battle error:', error);
    }

    // Update user stats & ranking (non-blocking for the response)
    if (userId && userId !== 'guest') {
      await updateUserStats({
        userId,
        winnerSide,
        playerPokemonId: battleState.player.pokemonId,
        finishedAt: nowIso,
      });
      await updateRanking({ userId, username, winnerSide, finishedAt: nowIso });
    }
  } catch (error) {
    console.error('Supabase finalize battle exception:', error);
  }
}

// ─── Stats & Ranking ──────────────────────────────────────────

async function updateUserStats({
  userId,
  winnerSide,
  playerPokemonId,
  finishedAt,
}) {
  if (!userId) return;

  try {
    const nowIso = finishedAt || new Date().toISOString();
    const { data: existing, error: fetchError } = await supabaseServer
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase user_stats fetch error:', fetchError);
      return;
    }

    const isWin = winnerSide === 'player1';
    const isLoss = winnerSide === 'player2';
    const isDraw = winnerSide === 'draw';

    const nextTotalBattles = (existing?.total_battles || 0) + 1;
    const nextWins = (existing?.wins || 0) + (isWin ? 1 : 0);
    const nextLosses = (existing?.losses || 0) + (isLoss ? 1 : 0);
    const nextDraws = (existing?.draws || 0) + (isDraw ? 1 : 0);
    const nextCurrentWinStreak = isWin
      ? (existing?.current_win_streak || 0) + 1
      : 0;
    const nextBestWinStreak = Math.max(
      existing?.best_win_streak || 0,
      nextCurrentWinStreak
    );

    let mostUsedPokemonId = existing?.most_used_pokemon_id || null;

    if (playerPokemonId) {
      try {
        const { data: battlesData } = await supabaseServer
          .from('battles')
          .select('player1_pokemon_id')
          .eq('player1_user_id', userId)
          .eq('player1_pokemon_id', playerPokemonId);

        const currentPokemonCount = battlesData?.length || 0;

        const { data: currentMostUsed } = await supabaseServer
          .from('battles')
          .select('player1_pokemon_id')
          .eq('player1_user_id', userId)
          .eq('player1_pokemon_id', existing?.most_used_pokemon_id || 0);

        const currentMostUsedCount = currentMostUsed?.length || 0;

        if (currentPokemonCount >= currentMostUsedCount) {
          mostUsedPokemonId = playerPokemonId;
        }
      } catch (error) {
        console.error('Error calculating most used pokemon:', error);
        mostUsedPokemonId =
          playerPokemonId || existing?.most_used_pokemon_id || null;
      }
    }

    const { error: upsertError } = await supabaseServer
      .from('user_stats')
      .upsert(
        {
          user_id: userId,
          total_battles: nextTotalBattles,
          wins: nextWins,
          losses: nextLosses,
          draws: nextDraws,
          current_win_streak: nextCurrentWinStreak,
          best_win_streak: nextBestWinStreak,
          most_used_pokemon_id: mostUsedPokemonId,
          first_battle_at: existing?.first_battle_at || nowIso,
          last_battle_at: nowIso,
          updated_at: nowIso,
        },
        { onConflict: 'user_id' }
      );

    if (upsertError)
      console.error('Supabase user_stats upsert error:', upsertError);
  } catch (error) {
    console.error('updateUserStats error:', error);
  }
}

async function updateRanking({ userId, username, winnerSide, finishedAt }) {
  if (!userId) return;

  try {
    const nowIso = finishedAt || new Date().toISOString();
    const { data: existing, error: fetchError } = await supabaseServer
      .from('ranking')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('Supabase ranking fetch error:', fetchError);
      return;
    }

    const isWin = winnerSide === 'player1';
    const isLoss = winnerSide === 'player2';

    const nextRankedBattles = (existing?.ranked_battles || 0) + 1;
    const nextRankedWins = (existing?.ranked_wins || 0) + (isWin ? 1 : 0);
    const nextRankedLosses = (existing?.ranked_losses || 0) + (isLoss ? 1 : 0);

    // ELO calculation
    const currentRating = existing?.rating || 1000;
    const opponentRating = 1000; // AI rating
    const K = 32;
    const result = isWin ? 1 : isLoss ? 0 : 0.5;
    const expectedScore =
      1 / (1 + Math.pow(10, (opponentRating - currentRating) / 400));
    const ratingChange = Math.round(K * (result - expectedScore));
    const newRating = currentRating + ratingChange;
    const newPeakRating = Math.max(existing?.peak_rating || 1000, newRating);

    const resolvedUsername = username || existing?.username || 'Player';

    const { error: upsertError } = await supabaseServer.from('ranking').upsert(
      {
        user_id: userId,
        username: resolvedUsername,
        rating: newRating,
        peak_rating: newPeakRating,
        ranked_battles: nextRankedBattles,
        ranked_wins: nextRankedWins,
        ranked_losses: nextRankedLosses,
        last_ranked_battle_at: nowIso,
        updated_at: nowIso,
      },
      { onConflict: 'user_id' }
    );

    if (upsertError)
      console.error('Supabase ranking upsert error:', upsertError);
  } catch (error) {
    console.error('updateRanking error:', error);
  }
}

// ─── POST /api/battle ─────────────────────────────────────────

export async function POST(request) {
  try {
    // Auth (non-blocking)
    let clerkUserId = null;
    try {
      const authResult = await auth();
      clerkUserId = authResult?.userId || null;
    } catch {
      // Continue without auth
    }

    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // ════════════════════════════════════════════════════════════
    // INIT: Create a new battle
    // ════════════════════════════════════════════════════════════
    if (action === 'init') {
      const { playerPokemonId, opponentPokemonId, username } = body;

      if (!playerPokemonId || !opponentPokemonId) {
        return NextResponse.json(
          { error: 'Player and opponent Pokemon IDs are required' },
          { status: 400 }
        );
      }

      // Fetch Pokemon data from PokeAPI
      const [playerData, opponentData] = await Promise.all([
        fetchPokemonData(playerPokemonId),
        fetchPokemonData(opponentPokemonId),
      ]);

      if (!player1Data || !player2Data) {
        return NextResponse.json(
          { error: 'Could not fetch Pokemon data' },
          { status: 404 }
        );
      }

      // Calculate HP & stats
      const playerMaxHP = calculateMaxHP(getHPStat(playerData));
      const opponentMaxHP = calculateMaxHP(getHPStat(opponentData));
      const playerAttacks = getPokemonAttacks(playerData);
      const opponentAttacks = getPokemonAttacks(opponentData);

      // Build server-side battle state (stored in DB, NOT sent fully to client)
      const battleState = {
        playerUserId: clerkUserId || 'guest',
        playerUsername: username || 'Player',
        turnNumber: 0,
        player: {
          pokemonId: playerPokemonId,
          currentHP: playerMaxHP,
          maxHP: playerMaxHP,
          attacks: playerAttacks,
          stats: {
            attack: getAttackStat(playerData),
            defense: getDefenseStat(playerData),
          },
        },
        opponent: {
          pokemonId: opponentPokemonId,
          currentHP: opponentMaxHP,
          maxHP: opponentMaxHP,
          attacks: opponentAttacks,
          stats: {
            attack: getAttackStat(opponentData),
            defense: getDefenseStat(opponentData),
          },
        },
        messages: [
          `¡${playerData.name} vs ${opponentData.name}!`,
          '¡Comienza el combate!',
        ],
        battleStatus: 'active',
      };

      // Insert battle record in Supabase
      const nowIso = new Date().toISOString();
      const userId = clerkUserId || 'guest';

      const { data, error } = await supabaseServer
        .from('battles')
        .insert({
          player1_user_id: userId,
          player1_username:
            username || (userId === 'guest' ? 'Guest' : 'Player'),
          player2_user_id: 'ai',
          player2_username: 'AI Opponent',
          player1_pokemon_id: playerPokemonId,
          player2_pokemon_id: opponentPokemonId,
          status: 'active',
          battle_state: battleState,
          started_at: nowIso,
        })
        .select('id, started_at')
        .single();

      if (error) {
        console.error('Supabase create battle error:', error);
        return NextResponse.json(
          { error: 'Failed to create battle', details: error.message },
          { status: 500 }
        );
      }

      // Return to client (without internal stats like attack/defense)
      return NextResponse.json({
        success: true,
        battleId: data.id,
        player: {
          pokemonId: playerPokemonId,
          pokemonName: playerData.name,
          sprites: {
            front_default: playerData.sprites?.front_default || null,
            back_default: playerData.sprites?.back_default || null,
          },
          currentHP: playerMaxHP,
          maxHP: playerMaxHP,
          attacks: playerAttacks,
        },
        opponent: {
          pokemonId: opponentPokemonId,
          pokemonName: opponentData.name,
          sprites: {
            front_default: opponentData.sprites?.front_default || null,
            back_default: opponentData.sprites?.back_default || null,
          },
          currentHP: opponentMaxHP,
          maxHP: opponentMaxHP,
          attacks: opponentAttacks,
        },
        messages: battleState.messages,
        battleStatus: 'active',
      });
    }

    // ════════════════════════════════════════════════════════════
    // ATTACK: Execute an attack (client sends only battleId + attackId)
    // ════════════════════════════════════════════════════════════
    if (action === 'attack') {
      const { battleId, attackId } = body;

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

      // Load state from DB
      const battleRecord = await loadBattleState(battleId);
      if (!battleRecord) {
        return NextResponse.json(
          { error: 'Battle not found' },
          { status: 404 }
        );
      }

      const state = battleRecord.battle_state;
      if (!state || state.battleStatus !== 'active') {
        return NextResponse.json(
          { error: 'Battle is not active' },
          { status: 400 }
        );
      }

      // Validate attack
      const selectedAttack = state.player.attacks.find(
        (a) => a.id === attackId
      );
      if (!selectedAttack) {
        return NextResponse.json(
          { error: 'Invalid attack' },
          { status: 400 }
        );
      }

      const newMessages = [];
      const nowIso = new Date().toISOString();
      let turnNumber = state.turnNumber || 0;

      // ── Player attacks ──
      const playerDamage = calculateDamage(
        state.player.stats.attack,
        state.opponent.stats.defense,
        selectedAttack.power
      );

      const opponentHpBefore = state.opponent.currentHP;
      state.opponent.currentHP = Math.max(
        0,
        state.opponent.currentHP - playerDamage
      );

      newMessages.push(`¡Tu Pokémon usó ${selectedAttack.name}!`);
      newMessages.push(`El rival recibió ${playerDamage} de daño.`);

      turnNumber += 1;
      await logBattleTurn({
        battle_id: battleId,
        turn_number: turnNumber,
        player_user_id: state.playerUserId,
        player_side: 'player1',
        action_type: 'attack',
        attack_id: selectedAttack.id,
        attack_name: selectedAttack.name,
        damage_dealt: playerDamage,
        target_hp_before: opponentHpBefore,
        target_hp_after: state.opponent.currentHP,
        player1_hp_after: state.player.currentHP,
        player2_hp_after: state.opponent.currentHP,
        message: newMessages[0],
        executed_at: nowIso,
      });

      // Check if opponent is defeated
      if (state.opponent.currentHP <= 0) {
        state.opponent.currentHP = 0;
        state.battleStatus = 'playerWon';
        state.turnNumber = turnNumber;
        newMessages.push('¡El Pokémon rival se debilitó!');
        newMessages.push('¡Has ganado el combate!');
        state.messages = [...state.messages, ...newMessages];

        await finalizeBattle({
          battleId,
          battleState: state,
          status: 'playerWon',
          winnerSide: 'player1',
          totalTurns: turnNumber,
          userId: state.playerUserId,
          username: state.playerUsername,
        });

        await finalizeBattle(battleId, 'player1', turnNumber);

        const finalState = await getBattleState(battleId);
        // Si el estado fue eliminado, construir respuesta manual
        return NextResponse.json({
          success: true,
          playerHP: state.player.currentHP,
          opponentHP: 0,
          messages: newMessages,
          battleStatus: 'playerWon',
          turnNumber,
        });
      }

      // ── Opponent (AI) attacks ──
      const opponentAttacks = state.opponent.attacks;
      const opponentAttack =
        opponentAttacks[Math.floor(Math.random() * opponentAttacks.length)];

      const opponentDamage = calculateDamage(
        state.opponent.stats.attack,
        state.player.stats.defense,
        opponentAttack.power
      );

      const playerHpBefore = state.player.currentHP;
      state.player.currentHP = Math.max(
        0,
        state.player.currentHP - opponentDamage
      );

      newMessages.push(`¡El rival usó ${opponentAttack.name}!`);
      newMessages.push(`Tu Pokémon recibió ${opponentDamage} de daño.`);

      turnNumber += 1;
      await logBattleTurn({
        battle_id: battleId,
        turn_number: turnNumber,
        player_user_id: 'ai',
        player_side: 'player2',
        action_type: 'attack',
        attack_id: opponentAttack.id,
        attack_name: opponentAttack.name,
        damage_dealt: opponentDamage,
        target_hp_before: playerHpBefore,
        target_hp_after: state.player.currentHP,
        player1_hp_after: state.player.currentHP,
        player2_hp_after: state.opponent.currentHP,
        message: newMessages[newMessages.length - 2],
        executed_at: nowIso,
      });

      // Check if player is defeated
      if (state.player.currentHP <= 0) {
        state.player.currentHP = 0;
        state.battleStatus = 'opponentWon';
        state.turnNumber = turnNumber;
        newMessages.push('¡Tu Pokémon se debilitó!');
        newMessages.push('Has perdido el combate...');
        state.messages = [...state.messages, ...newMessages];

        await finalizeBattle({
          battleId,
          battleState: state,
          status: 'opponentWon',
          winnerSide: 'player2',
          totalTurns: turnNumber,
          userId: state.playerUserId,
          username: state.playerUsername,
        });

        await finalizeBattle(battleId, 'player2', turnNumber);

        const finalState = await getBattleState(battleId);
        return NextResponse.json({
          success: true,
          playerHP: 0,
          opponentHP: state.opponent.currentHP,
          messages: newMessages,
          battleStatus: 'opponentWon',
          turnNumber,
        });
      }

      // ── Battle continues ──
      state.turnNumber = turnNumber;
      state.messages = [...state.messages, ...newMessages];
      await saveBattleState(battleId, state);

      return NextResponse.json({
        success: true,
        playerHP: state.player.currentHP,
        opponentHP: state.opponent.currentHP,
        messages: newMessages,
        battleStatus: 'active',
        turnNumber,
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
      if (battle.player1_user_id !== userId && battle.player1_user_id !== 'guest') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
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
      if (battle.player1_user_id !== userId && battle.player1_user_id !== 'guest') {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 403 }
        );
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

    return NextResponse.json(
      { error: 'Invalid action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Battle API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process battle action', details: error?.message },
      { status: 500 }
    );
  }
}
