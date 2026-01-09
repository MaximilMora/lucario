import { NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServerClient';

/**
 * GET /api/stats?user_id=xxx
 * Obtiene las estadísticas de un usuario
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const user_id = searchParams.get('user_id');

    if (!user_id) {
      return NextResponse.json(
        { error: 'user_id is required' },
        { status: 400 }
      );
    }

    // Obtener estadísticas
    const { data: stats, error: statsError } = await supabaseServer
      .from('user_stats')
      .select('*')
      .eq('user_id', user_id)
      .single();

    if (statsError && statsError.code !== 'PGRST116') {
      return NextResponse.json(
        { error: 'Failed to fetch stats', details: statsError.message },
        { status: 500 }
      );
    }

    // Obtener ranking si existe
    const { data: ranking } = await supabaseServer
      .from('ranking')
      .select('*')
      .eq('user_id', user_id)
      .single();

    return NextResponse.json({
      success: true,
      stats: stats || null,
      ranking: ranking || null,
    });
  } catch (error) {
    console.error('Stats API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stats' },
      { status: 500 }
    );
  }
}
