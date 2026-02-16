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
 * GET /api/stats
 * Obtiene las estadísticas de un usuario
 *
 * Query params:
 * - user_id: ID del usuario (opcional si está autenticado)
 *
 * Respuesta:
 * - stats: estadísticas del usuario (batallas, victorias, rachas, etc.)
 * - ranking: posición en el ranking y rating ELO
 * - recentBattles: últimas 5 batallas del usuario
 */
export async function GET(request) {
  try {
    const { userId: clerkUserId } = await auth();
    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('user_id');

    // Usar el user_id del request o el del usuario autenticado
    const userId = requestedUserId || clerkUserId;

    if (!userId) {
      return NextResponse.json(
        { error: 'user_id is required (or be authenticated)' },
        { status: 400 }
      );
    }

    const supabase = getSupabase();
    if (!supabase) {
      return NextResponse.json(
        {
          success: true,
          stats: null,
          ranking: null,
          recentBattles: [],
          message: 'Database not configured',
        },
        { status: 200 }
      );
    }

    // Obtener estadísticas del usuario desde user_battle_stats
    const { data: stats, error: statsError } = await supabase
      .from('user_battle_stats')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      console.error('Error fetching user stats:', statsError);
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: statsError.message },
        { status: 500 }
      );
    }

    // Calcular posición en el ranking si tiene stats
    let rankPosition = null;
    if (stats) {
      const { count } = await supabase
        .from('user_battle_stats')
        .select('*', { count: 'exact', head: true })
        .gt('rating', stats.rating);

      rankPosition = (count || 0) + 1;
    }

    // Obtener últimas batallas del usuario
    const { data: recentBattles } = await supabase
      .from('battles')
      .select(
        'id, player1_pokemon_id, player2_pokemon_id, status, winner_user_id, total_turns, created_at'
      )
      .or(`player1_user_id.eq.${userId},player2_user_id.eq.${userId}`)
      .order('created_at', { ascending: false })
      .limit(5);

    // Formatear respuesta
    const response = {
      success: true,
      stats: stats
        ? {
            userId: stats.user_id,
            username: stats.username,
            totalBattles: stats.total_battles,
            wins: stats.wins,
            losses: stats.losses,
            draws: stats.draws,
            winRate:
              stats.total_battles > 0
                ? Math.round((stats.wins / stats.total_battles) * 100 * 10) / 10
                : 0,
            currentWinStreak: stats.current_win_streak,
            bestWinStreak: stats.best_win_streak,
            rating: stats.rating,
            peakRating: stats.peak_rating,
            mostUsedPokemon: stats.most_used_pokemon_id
              ? {
                  id: stats.most_used_pokemon_id,
                  name: stats.most_used_pokemon_name,
                  count: stats.most_used_pokemon_count,
                }
              : null,
            firstBattleAt: stats.first_battle_at,
            lastBattleAt: stats.last_battle_at,
          }
        : null,
      ranking: stats
        ? {
            position: rankPosition,
            rating: stats.rating,
            peakRating: stats.peak_rating,
          }
        : null,
      recentBattles: recentBattles || [],
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
