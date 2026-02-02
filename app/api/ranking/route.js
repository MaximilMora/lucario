import { NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServerClient';

/**
 * GET /api/ranking
 * Obtiene el ranking de jugadores basado en rating ELO
 * 
 * Query params:
 * - limit: número de jugadores a retornar (default: 10, max: 100)
 * - offset: para paginación (default: 0)
 * - user_id: obtener posición específica de un usuario
 * 
 * Respuesta:
 * - ranking: array de jugadores con su posición
 * - total: número total de jugadores en el ranking
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') || '10', 10), 100);
    const offset = parseInt(searchParams.get('offset') || '0', 10);
    const userId = searchParams.get('user_id');

    // Si se solicita un usuario específico
    if (userId) {
      const { data: userStats, error: userError } = await supabaseServer
        .from('user_battle_stats')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        return NextResponse.json(
          { error: 'Failed to fetch user ranking', details: userError.message },
          { status: 500 }
        );
      }

      if (!userStats) {
        return NextResponse.json({
          success: true,
          ranking: null,
          message: 'User not found in ranking',
        });
      }

      // Calcular posición
      const { count } = await supabaseServer
        .from('user_battle_stats')
        .select('*', { count: 'exact', head: true })
        .gt('rating', userStats.rating);

      const position = (count || 0) + 1;

      return NextResponse.json({
        success: true,
        ranking: {
          position,
          userId: userStats.user_id,
          username: userStats.username || 'Player',
          rating: userStats.rating,
          peakRating: userStats.peak_rating,
          totalBattles: userStats.total_battles,
          wins: userStats.wins,
          losses: userStats.losses,
          draws: userStats.draws,
          winRate: userStats.total_battles > 0
            ? Math.round((userStats.wins / userStats.total_battles) * 100 * 10) / 10
            : 0,
          bestWinStreak: userStats.best_win_streak,
        },
      });
    }

    // Obtener total de jugadores
    const { count: total } = await supabaseServer
      .from('user_battle_stats')
      .select('*', { count: 'exact', head: true })
      .gt('total_battles', 0);

    // Obtener ranking paginado
    const { data, error } = await supabaseServer
      .from('user_battle_stats')
      .select('*')
      .gt('total_battles', 0)
      .order('rating', { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('Supabase select error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ranking', details: error.message },
        { status: 500 }
      );
    }

    // Formatear con posiciones
    const ranking = (data || []).map((player, index) => ({
      position: offset + index + 1,
      userId: player.user_id,
      username: player.username || 'Player',
      rating: player.rating,
      peakRating: player.peak_rating,
      totalBattles: player.total_battles,
      wins: player.wins,
      losses: player.losses,
      draws: player.draws,
      winRate: player.total_battles > 0
        ? Math.round((player.wins / player.total_battles) * 100 * 10) / 10
        : 0,
      bestWinStreak: player.best_win_streak,
    }));

    return NextResponse.json({
      success: true,
      ranking,
      pagination: {
        total: total || 0,
        limit,
        offset,
        hasMore: offset + limit < (total || 0),
      },
    });
  } catch (error) {
    console.error('Ranking API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    );
  }
}
