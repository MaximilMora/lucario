import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '../../lib/supabaseServerClient';

/**
 * POST /api/battles
 * Guarda una batalla en la base de datos (nueva estructura multijugador)
 */
export async function POST(request) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const {
      // Datos del jugador (player1)
      player1UserId,
      player1Username,
      player1PokemonId,
      player1PokemonName,
      // Datos del oponente (player2 - puede ser AI o jugador real)
      player2UserId,
      player2Username,
      player2PokemonId,
      player2PokemonName,
      // Estado de la batalla
      battleStatus, // 'playerWon', 'opponentWon', 'draw'
      totalTurns,
      durationSeconds,
      messages,
      startedAt,
      finishedAt,
    } = body;

    // Validar campos requeridos
    if (
      !player1UserId ||
      !player1Username ||
      !player1PokemonId ||
      !player1PokemonName ||
      !player2PokemonId ||
      !player2PokemonName ||
      !battleStatus
    ) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: [
            'player1UserId',
            'player1Username',
            'player1PokemonId',
            'player1PokemonName',
            'player2PokemonId',
            'player2PokemonName',
            'battleStatus',
          ],
        },
        { status: 400 }
      );
    }

    // Mapear battleStatus a winner_side y winner_user_id
    let winnerSide;
    let winnerUserId = null;

    if (battleStatus === 'playerWon') {
      winnerSide = 'player1';
      winnerUserId = player1UserId;
    } else if (battleStatus === 'opponentWon') {
      winnerSide = 'player2';
      winnerUserId = player2UserId || null; // null si es AI
    } else if (battleStatus === 'draw') {
      winnerSide = 'draw';
      winnerUserId = null;
    } else {
      // Intentar inferir
      winnerSide = battleStatus.includes('player') ? 'player1' : 'player2';
      winnerUserId = battleStatus.includes('player')
        ? player1UserId
        : player2UserId;
    }

    // Preparar datos para insertar
    const battleData = {
      player1_user_id: player1UserId,
      player1_username: player1Username,
      player2_user_id: player2UserId || 'ai_opponent', // Si no hay player2, es AI
      player2_username: player2Username || 'AI Opponent',
      player1_pokemon_id: player1PokemonId,
      player1_pokemon_name: player1PokemonName,
      player2_pokemon_id: player2PokemonId,
      player2_pokemon_name: player2PokemonName,
      winner_user_id: winnerUserId,
      winner_side: winnerSide,
      total_turns: totalTurns || 0,
      duration_seconds: durationSeconds || null,
      status: 'finished',
      battle_log: messages ? { messages } : null,
      started_at: startedAt || new Date().toISOString(),
      finished_at: finishedAt || new Date().toISOString(),
    };

    // Insertar en Supabase
    const { data, error } = await supabaseServer
      .from('battles')
      .insert(battleData)
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save battle', details: error.message },
        { status: 500 }
      );
    }

    // Actualizar estadísticas de usuario (si no es AI)
    if (player1UserId && player1UserId !== 'ai_opponent') {
      const isWin = winnerSide === 'player1';
      await updateUserStats(
        player1UserId,
        player1Username,
        isWin,
        player1PokemonId,
        player1PokemonName
      );
    }

    if (player2UserId && player2UserId !== 'ai_opponent') {
      const isWin = winnerSide === 'player2';
      await updateUserStats(
        player2UserId,
        player2Username,
        isWin,
        player2PokemonId,
        player2PokemonName
      );
    }

    return NextResponse.json({
      success: true,
      battle: data,
      message: 'Battle saved successfully',
    });
  } catch (error) {
    console.error('Battles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process battle save request', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/battles
 * Obtiene las batallas recientes
 * Query params opcionales:
 * - limit: número de batallas a retornar (default: 10)
 * - user_id: filtrar por usuario (muestra batallas donde participó)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const user_id = searchParams.get('user_id');

    // Construir query
    let query = supabaseServer
      .from('battles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Filtrar por usuario si se proporciona
    if (user_id) {
      query = query.or(
        `player1_user_id.eq.${user_id},player2_user_id.eq.${user_id}`
      );
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase select error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch battles', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      battles: data || [],
      count: data?.length || 0,
    });
  } catch (error) {
    console.error('Battles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch battles' },
      { status: 500 }
    );
  }
}

/**
 * Función helper para actualizar estadísticas de usuario
 */
async function updateUserStats(userId, username, won, pokemonId, pokemonName) {
  try {
    // Obtener estadísticas actuales
    const { data: currentStats } = await supabaseServer
      .from('user_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    const isNewUser = !currentStats;
    const newWins = isNewUser
      ? won
        ? 1
        : 0
      : currentStats.wins + (won ? 1 : 0);
    const newLosses = isNewUser
      ? won
        ? 0
        : 1
      : currentStats.losses + (won ? 0 : 1);
    const newTotal = isNewUser ? 1 : currentStats.total_battles + 1;
    const newStreak = won
      ? isNewUser
        ? 1
        : currentStats.current_win_streak + 1
      : 0;
    const newBestStreak = isNewUser
      ? newStreak
      : Math.max(currentStats.best_win_streak, newStreak);

    const statsData = {
      user_id: userId,
      total_battles: newTotal,
      wins: newWins,
      losses: newLosses,
      current_win_streak: newStreak,
      best_win_streak: newBestStreak,
      most_used_pokemon_id: pokemonId,
      most_used_pokemon_name: pokemonName,
      first_battle_at: isNewUser
        ? new Date().toISOString()
        : currentStats.first_battle_at,
      last_battle_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    // Upsert (insertar o actualizar)
    const { error } = await supabaseServer
      .from('user_stats')
      .upsert(statsData, { onConflict: 'user_id' });

    if (error) {
      console.error('Error updating user stats:', error);
    }
  } catch (error) {
    console.error('Error in updateUserStats:', error);
  }
}
