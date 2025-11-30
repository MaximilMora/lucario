import { NextResponse } from 'next/server';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';

/**
 * POST /api/battles
 * Create a new battle record or update an existing one
 */
export async function POST(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', success: false },
      { status: 503 }
    );
  }

  try {
    const body = await request.json();
    const { action } = body;

    // Start a new battle
    if (action === 'start') {
      const {
        playerPokemonId,
        playerPokemonName,
        opponentPokemonId,
        opponentPokemonName,
      } = body;

      if (
        !playerPokemonId ||
        !playerPokemonName ||
        !opponentPokemonId ||
        !opponentPokemonName
      ) {
        return NextResponse.json(
          { error: 'Missing required Pokemon data', success: false },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('battles')
        .insert({
          player_pokemon_id: playerPokemonId,
          player_pokemon_name: playerPokemonName,
          opponent_pokemon_id: opponentPokemonId,
          opponent_pokemon_name: opponentPokemonName,
        })
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json(
          { error: 'Failed to save battle', success: false },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        battleId: data.id,
        message: 'Battle started and saved',
      });
    }

    // End a battle (update with winner)
    if (action === 'end') {
      const { battleId, winner, playerFinalHp, opponentFinalHp } = body;

      if (!battleId || !winner) {
        return NextResponse.json(
          { error: 'Battle ID and winner are required', success: false },
          { status: 400 }
        );
      }

      const { data, error } = await supabase
        .from('battles')
        .update({
          winner: winner,
          ended_at: new Date().toISOString(),
          player_final_hp: playerFinalHp ?? null,
          opponent_final_hp: opponentFinalHp ?? null,
        })
        .eq('id', battleId)
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        return NextResponse.json(
          { error: 'Failed to update battle', success: false },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        battle: data,
        message: 'Battle ended and saved',
      });
    }

    return NextResponse.json(
      { error: 'Invalid action', success: false },
      { status: 400 }
    );
  } catch (error) {
    console.error('Battles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process request', success: false },
      { status: 500 }
    );
  }
}

/**
 * GET /api/battles
 * Retrieve battle history
 */
export async function GET(request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { error: 'Database not configured', battles: [] },
      { status: 503 }
    );
  }

  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    const { data, error } = await supabase
      .from('battles')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch battles', battles: [] },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      battles: data,
      count: data.length,
    });
  } catch (error) {
    console.error('Battles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch battles', battles: [] },
      { status: 500 }
    );
  }
}
