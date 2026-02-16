import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';

// Helper para obtener Supabase de forma segura
function getSupabase() {
  try {
    const { supabaseServer } = require('../../lib/supabaseServerClient');
    return supabaseServer;
  } catch (error) {
    console.error('Supabase not configured:', error.message);
    return null;
  }
}

/**
 * Helper para obtener nombre de Pokémon desde PokeAPI
 */
async function getPokemonName(pokemonId) {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
    );
    if (!response.ok) return null;
    const data = await response.json();
    return data.name;
  } catch (error) {
    console.error('Error fetching Pokemon name:', error);
    return null;
  }
}

/**
 * GET /api/battles
 * Obtiene el historial de batallas
 *
 * Query params:
 * - limit: número de batallas a retornar (default: 10, max: 50)
 * - offset: para paginación (default: 0)
 * - user_id: filtrar por usuario específico
 * - status: filtrar por estado ('active', 'player1_won', 'player2_won', 'draw', 'abandoned')
 *
 * Nota: La creación y gestión de batallas activas se hace en /api/battle
 */
export async function GET(request) {
  try {
    const { userId: clerkUserId } = await auth();
    const { searchParams } = new URL(request.url);

    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 50);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const filterUserId = searchParams.get('user_id');
    const filterStatus = searchParams.get('status');

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          success: true,
          battles: [],
          pagination: { total: 0, limit, offset, hasMore: false },
          message: 'Database not configured',
        },
        { status: 200 }
      );
    }

    // Construir query base
    let query = supabase
      .from('battles')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false });

    // Filtrar por usuario si se especifica
    if (filterUserId) {
      query = query.or(
        `player1_user_id.eq.${filterUserId},player2_user_id.eq.${filterUserId}`
      );
    }

    // Filtrar por estado si se especifica
    if (filterStatus) {
      query = query.eq('status', filterStatus);
    }

    // Aplicar paginación
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('Supabase select error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch battles', details: error.message },
        { status: 500 }
      );
    }

    // Formatear batallas para la respuesta con nombres de Pokémon
    const battles = await Promise.all(
      (data || []).map(async battle => {
        // Obtener nombres de Pokémon en paralelo
        const [player1Name, player2Name] = await Promise.all([
          getPokemonName(battle.player1_pokemon_id),
          getPokemonName(battle.player2_pokemon_id),
        ]);

        // Determinar ganador para el badge
        let winner = null;
        if (battle.status === 'player1_won') {
          winner = 'player';
        } else if (battle.status === 'player2_won') {
          winner = 'opponent';
        } else if (battle.status === 'draw') {
          winner = 'draw';
        }

        return {
          id: battle.id,
          player_pokemon_name:
            player1Name || `Pokemon #${battle.player1_pokemon_id}`,
          opponent_pokemon_name:
            player2Name || `Pokemon #${battle.player2_pokemon_id}`,
          player1: {
            userId: battle.player1_user_id,
            username: battle.player1_username,
            pokemonId: battle.player1_pokemon_id,
            pokemonName: player1Name,
          },
          player2: {
            userId: battle.player2_user_id,
            username: battle.player2_username,
            pokemonId: battle.player2_pokemon_id,
            pokemonName: player2Name,
          },
          status: battle.status,
          winner,
          winnerUserId: battle.winner_user_id,
          totalTurns: battle.total_turns,
          durationSeconds: battle.duration_seconds,
          startedAt: battle.started_at,
          finishedAt: battle.finished_at,
          created_at: battle.created_at,
        };
      })
    );

    return NextResponse.json({
      success: true,
      battles,
      pagination: {
        total: count || 0,
        limit,
        offset,
        hasMore: offset + limit < (count || 0),
      },
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
 * GET /api/battles/[id]
 * Obtiene los detalles de una batalla específica incluyendo el historial de turnos
 *
 * Nota: Para obtener una batalla específica, usar /api/battle?id=xxx
 */
