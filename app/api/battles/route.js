import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer } from '../../lib/supabaseServerClient';

/**
 * GET /api/battles
 * Obtiene las batallas recientes.
 * Query params opcionales:
 * - limit: número de batallas a retornar (default: 10)
 * - status: filtrar por status ('playerWon' | 'opponentWon' | 'active' | 'draw')
 * - user_id: filtrar por usuario
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const status = searchParams.get('status');
    const user_id = searchParams.get('user_id');

    let query = supabaseServer
      .from('battles')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (status) {
      query = query.eq('status', status);
    }
    if (user_id) {
      query = query.eq('player1_user_id', user_id);
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
 * POST /api/battles
 * Actualiza una batalla existente (por battle_id).
 * Las batallas nuevas se crean desde /api/battle con action=init.
 * Stats y ranking se actualizan desde /api/battle al finalizar la batalla.
 */
export async function POST(request) {
  try {
    // Auth check (unused for now but available for future authorization)
    try {
      await auth();
    } catch {
      // Continue without auth
    }

    const body = await request.json();
    const { battle_id } = body;

    if (!battle_id) {
      return NextResponse.json(
        {
          error:
            'battle_id is required. New battles should be created via POST /api/battle with action=init.',
        },
        { status: 400 }
      );
    }

    // Build update payload from provided fields
    const updatePayload = {};

    if (body.status) updatePayload.status = body.status;
    if (body.winner_side) updatePayload.winner_side = body.winner_side;
    if (body.finished_at) updatePayload.finished_at = body.finished_at;
    if (Number.isFinite(body.total_turns))
      updatePayload.total_turns = body.total_turns;
    if (Number.isFinite(body.duration_seconds))
      updatePayload.duration_seconds = body.duration_seconds;
    if (body.battle_log) updatePayload.battle_log = body.battle_log;
    if (body.battle_state) updatePayload.battle_state = body.battle_state;

    // Player IDs (without names)
    if (body.player1_pokemon_id)
      updatePayload.player1_pokemon_id = body.player1_pokemon_id;
    if (body.player2_pokemon_id)
      updatePayload.player2_pokemon_id = body.player2_pokemon_id;
    if (body.player1_user_id)
      updatePayload.player1_user_id = body.player1_user_id;
    if (body.player1_username)
      updatePayload.player1_username = body.player1_username;
    if (body.player2_user_id)
      updatePayload.player2_user_id = body.player2_user_id;
    if (body.player2_username)
      updatePayload.player2_username = body.player2_username;
    if (body.winner_user_id) updatePayload.winner_user_id = body.winner_user_id;

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'No fields to update' },
        { status: 400 }
      );
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

    return NextResponse.json({
      success: true,
      battle: data,
      message: 'Battle updated successfully',
    });
  } catch (error) {
    console.error('Battles API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process battle request' },
      { status: 500 }
    );
  }
}
