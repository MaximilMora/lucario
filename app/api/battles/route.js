import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '../../lib/supabaseServerClient';

async function resolvePokemonName(pokemonId) {
  try {
    if (!pokemonId) {
      return '';
    }

    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
    );

    if (!response.ok) {
      return '';
    }

    const data = await response.json();
    return data?.name || '';
  } catch (error) {
    console.error('Error resolving Pokemon name:', error);
    return '';
  }
}

async function updateUserStats({
  userId,
  winnerSide,
  playerPokemonId,
  playerPokemonName,
  finishedAt,
}) {
  if (!userId) {
    return;
  }

  const nowIso = finishedAt || new Date().toISOString();
  const { data: existing, error: fetchError } = await supabaseServer
    .from('user_stats')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    console.error('Supabase ranking fetch error:', fetchError);
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

  const payload = {
    user_id: userId,
    total_battles: nextTotalBattles,
    wins: nextWins,
    losses: nextLosses,
    draws: nextDraws,
    current_win_streak: nextCurrentWinStreak,
    best_win_streak: nextBestWinStreak,
    most_used_pokemon_id:
      playerPokemonId || existing?.most_used_pokemon_id || null,
    most_used_pokemon_name:
      playerPokemonName || existing?.most_used_pokemon_name || null,
    first_battle_at: existing?.first_battle_at || nowIso,
    last_battle_at: nowIso,
    updated_at: nowIso,
  };

  const { error: upsertError } = await supabaseServer
    .from('user_stats')
    .upsert(payload, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('Supabase ranking upsert error:', upsertError);
  }
}

async function updateRanking({ userId, username, winnerSide, finishedAt }) {
  if (!userId) {
    return;
  }

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

  const payload = {
    user_id: userId,
    username: username || existing?.username || null,
    ranked_battles: nextRankedBattles,
    ranked_wins: nextRankedWins,
    ranked_losses: nextRankedLosses,
    last_ranked_battle_at: nowIso,
    updated_at: nowIso,
  };

  const { error: upsertError } = await supabaseServer
    .from('ranking')
    .upsert(payload, { onConflict: 'user_id' });

  if (upsertError) {
    console.error('Supabase ranking upsert error:', upsertError);
  }
}

/**
 * POST /api/battles
 * Guarda una batalla en la base de datos
 */
export async function POST(request) {
  try {
    const { userId: clerkUserId } = auth();
    const body = await request.json();
    const {
      playerPokemonId,
      opponentPokemonId,
      playerPokemonName,
      opponentPokemonName,
      battleStatus,
      messages,
      user_id,
      battle_id,
      player1_user_id,
      player1_username,
      player2_user_id,
      player2_username,
      player1_pokemon_id,
      player1_pokemon_name,
      player2_pokemon_id,
      player2_pokemon_name,
      winner_user_id,
      winner_side,
      total_turns,
      duration_seconds,
      status,
      battle_log,
      started_at,
      finished_at,
    } = body;

    const resolvedPlayer1Id = player1_pokemon_id ?? playerPokemonId;
    const resolvedPlayer2Id = player2_pokemon_id ?? opponentPokemonId;

    const [fallbackPlayerName, fallbackOpponentName] = await Promise.all([
      player1_pokemon_name || playerPokemonName
        ? Promise.resolve(player1_pokemon_name || playerPokemonName)
        : resolvePokemonName(resolvedPlayer1Id),
      player2_pokemon_name || opponentPokemonName
        ? Promise.resolve(player2_pokemon_name || opponentPokemonName)
        : resolvePokemonName(resolvedPlayer2Id),
    ]);

    const resolvedPlayer1Name = fallbackPlayerName;
    const resolvedPlayer2Name = fallbackOpponentName;
    const resolvedStatus = status || battleStatus;
    const resolvedUserId = player1_user_id || user_id || clerkUserId || null;

    // Mapear battleStatus a winner_side si no viene definido
    let resolvedWinnerSide = winner_side;
    if (!resolvedWinnerSide) {
      if (resolvedStatus === 'playerWon') {
        resolvedWinnerSide = 'player1';
      } else if (resolvedStatus === 'opponentWon') {
        resolvedWinnerSide = 'player2';
      } else if (resolvedStatus === 'draw') {
        resolvedWinnerSide = 'draw';
      }
    }

    if (battle_id) {
      const nowIso = new Date().toISOString();
      const updatePayload = {
        status: resolvedStatus,
        winner_side: resolvedWinnerSide || null,
        finished_at: finished_at || nowIso,
      };

      if (Number.isFinite(total_turns)) {
        updatePayload.total_turns = total_turns;
      }
      if (Number.isFinite(duration_seconds)) {
        updatePayload.duration_seconds = duration_seconds;
      }
      if (resolvedPlayer1Id) {
        updatePayload.player1_pokemon_id = resolvedPlayer1Id;
      }
      if (resolvedPlayer2Id) {
        updatePayload.player2_pokemon_id = resolvedPlayer2Id;
      }
      if (resolvedPlayer1Name) {
        updatePayload.player1_pokemon_name = resolvedPlayer1Name;
      }
      if (resolvedPlayer2Name) {
        updatePayload.player2_pokemon_name = resolvedPlayer2Name;
      }
      if (player1_user_id || user_id) {
        updatePayload.player1_user_id = player1_user_id || user_id;
      }
      if (player1_username) {
        updatePayload.player1_username = player1_username;
      }
      if (player2_user_id) {
        updatePayload.player2_user_id = player2_user_id;
      }
      if (player2_username) {
        updatePayload.player2_username = player2_username;
      }
      if (winner_user_id) {
        updatePayload.winner_user_id = winner_user_id;
      }
      if (battle_log || messages) {
        updatePayload.battle_log =
          battle_log || (messages ? { messages } : null);
      }
      if (started_at) {
        updatePayload.started_at = started_at;
      }

      const { data, error } = await supabaseServer
        .from('battles')
        .update(updatePayload)
        .eq('id', battle_id)
        .select()
        .single();

      if (error) {
        console.error('Supabase update battle error:', error);
        return NextResponse.json(
          { error: 'Failed to update battle', details: error.message },
          { status: 500 }
        );
      }

      await updateUserStats({
        userId: resolvedUserId,
        winnerSide: resolvedWinnerSide,
        playerPokemonId: resolvedPlayer1Id,
        playerPokemonName: resolvedPlayer1Name,
        finishedAt: updatePayload.finished_at,
      });

      await updateRanking({
        userId: resolvedUserId,
        username: player1_username || null,
        winnerSide: resolvedWinnerSide,
        finishedAt: updatePayload.finished_at,
      });

      return NextResponse.json({
        success: true,
        battle: data,
        message: 'Battle updated successfully',
      });
    }

    // Validar campos requeridos para el esquema actual
    if (
      !resolvedPlayer1Id ||
      !resolvedPlayer2Id ||
      !resolvedPlayer1Name ||
      !resolvedPlayer2Name ||
      !resolvedStatus
    ) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: [
            'player1_pokemon_id',
            'player2_pokemon_id',
            'player1_pokemon_name',
            'player2_pokemon_name',
            'status',
          ],
        },
        { status: 400 }
      );
    }

    const nowIso = new Date().toISOString();

    // Insertar en Supabase usando el esquema actual
    const { data, error } = await supabaseServer.from('battles').insert({
      player1_user_id: resolvedUserId,
      player1_username: player1_username || null,
      player2_user_id: player2_user_id || null,
      player2_username: player2_username || null,
      player1_pokemon_id: resolvedPlayer1Id,
      player1_pokemon_name: resolvedPlayer1Name,
      player2_pokemon_id: resolvedPlayer2Id,
      player2_pokemon_name: resolvedPlayer2Name,
      winner_user_id: winner_user_id || null,
      winner_side: resolvedWinnerSide || null,
      total_turns: Number.isFinite(total_turns) ? total_turns : 0,
      duration_seconds: Number.isFinite(duration_seconds)
        ? duration_seconds
        : 0,
      status: resolvedStatus,
      battle_log: battle_log || (messages ? { messages } : null),
      started_at: started_at || nowIso,
      finished_at: finished_at || nowIso,
    });

    if (error) {
      console.error('Supabase insert error:', error);
      return NextResponse.json(
        { error: 'Failed to save battle', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      battle: data[0],
      message: 'Battle saved successfully',
    });
  } catch (error) {
    console.error('Battles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process battle save request' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/battles
 * Obtiene las batallas recientes
 * Query params opcionales:
 * - limit: número de batallas a retornar (default: 10)
 * - winner: filtrar por ganador ('player' | 'opponent' | 'draw')
 * - user_id: filtrar por usuario (si implementaste autenticación)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const winner = searchParams.get('winner');
    const user_id = searchParams.get('user_id');

    // Construir query
    let query = supabaseServer
      .from('battles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    // Aplicar filtros opcionales
    if (winner) {
      query = query.eq('winner', winner);
    }
    if (user_id) {
      query = query.eq('user_id', user_id);
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
