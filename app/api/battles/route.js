import { NextResponse } from 'next/server';
import { supabaseServer } from '../../lib/supabaseServerClient';

/**
 * POST /api/battles
 * Guarda una batalla en la base de datos
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const {
      playerPokemonId,
      opponentPokemonId,
      playerPokemonName,
      opponentPokemonName,
      battleStatus,
      messages,
      user_id,
    } = body;

    // Validar campos requeridos
    if (
      !playerPokemonId ||
      !opponentPokemonId ||
      !playerPokemonName ||
      !opponentPokemonName ||
      !battleStatus
    ) {
      return NextResponse.json(
        {
          error: 'Missing required fields',
          required: [
            'playerPokemonId',
            'opponentPokemonId',
            'playerPokemonName',
            'opponentPokemonName',
            'battleStatus',
          ],
        },
        { status: 400 }
      );
    }

    // Mapear battleStatus a winner
    // battleStatus puede ser: 'playerWon', 'opponentWon', 'draw'
    let winner;
    if (battleStatus === 'playerWon') {
      winner = 'player';
    } else if (battleStatus === 'opponentWon') {
      winner = 'opponent';
    } else if (battleStatus === 'draw') {
      winner = 'draw';
    } else {
      // Si no coincide, intentar inferir del status
      winner = battleStatus.includes('player') ? 'player' : 'opponent';
    }

    // Insertar en Supabase
    const { data, error } = await supabaseServer.from('battles').insert({
      player_pokemon_id: playerPokemonId,
      opponent_pokemon_id: opponentPokemonId,
      player_pokemon_name: playerPokemonName,
      opponent_pokemon_name: opponentPokemonName,
      winner: winner, // 'player' | 'opponent' | 'draw'
      battle_status: battleStatus,
      log: messages ? { messages } : null, // Guardar mensajes como JSON
      user_id: user_id || null, // Opcional: ID del usuario de Clerk
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
