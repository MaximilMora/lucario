import { NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServerClient';

/**
 * GET /api/ranking
 * Obtiene el ranking de jugadores
 * Query params opcionales:
 * - limit: número de jugadores a retornar (default: 10)
 * - user_id: obtener posición específica de un usuario
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const user_id = searchParams.get('user_id');

    if (user_id) {
      // Obtener posición específica de un usuario
      const { data: userRanking, error: userError } = await supabaseServer
        .from('ranking')
        .select('*')
        .eq('user_id', user_id)
        .single();

      if (userError && userError.code !== 'PGRST116') {
        // PGRST116 = no rows returned (usuario no está en ranking)
        return NextResponse.json(
          {
            error: 'Failed to fetch user ranking',
            details: userError.message,
          },
          { status: 500 }
        );
      }

      // Calcular posición si existe
      if (userRanking) {
        const { count } = await supabaseServer
          .from('ranking')
          .select('*', { count: 'exact', head: true })
          .gt('rating', userRanking.rating);

        userRanking.rank_position = (count || 0) + 1;
      }

      return NextResponse.json({
        success: true,
        ranking: userRanking || null,
      });
    }

    // Obtener top ranking
    const { data, error } = await supabaseServer
      .from('ranking')
      .select('*')
      .order('rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase select error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch ranking', details: error.message },
        { status: 500 }
      );
    }

    // Agregar posiciones
    const rankingWithPositions = data.map((player, index) => ({
      ...player,
      rank_position: index + 1,
    }));

    return NextResponse.json({
      success: true,
      ranking: rankingWithPositions,
      count: rankingWithPositions.length,
    });
  } catch (error) {
    console.error('Ranking API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch ranking' },
      { status: 500 }
    );
  }
}
