import { NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { supabaseServer as supabase } from '../../lib/supabaseServerClient';

// --------------------------------------------
// HELPERS: PokeAPI (mismo criterio que /api/battle)
// --------------------------------------------
async function fetchPokemonData(pokemonNameOrId) {
  try {
    const res = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId}`
    );
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    console.error('Error fetching Pokemon data:', e);
    return null;
  }
}

function extractPokemonStats(pokemonData) {
  const getStat = name =>
    pokemonData.stats?.find(s => s.stat.name === name)?.base_stat || 50;
  const baseHP = getStat('hp');
  const level = 50;
  const maxHP = Math.floor(baseHP * (level / 50)) + 50;
  return {
    hp: maxHP,
    attack: getStat('attack'),
    defense: getStat('defense'),
    speed: getStat('speed'),
  };
}

function generatePokemonAttacks(pokemonData) {
  const types = pokemonData.types?.map(t => t.type.name) || ['normal'];
  const primaryType = types[0];
  return [
    { id: 1, name: 'Ataque Rápido', power: 30, type: primaryType },
    { id: 2, name: 'Ataque Normal', power: 50, type: primaryType },
    { id: 3, name: 'Ataque Fuerte', power: 70, type: primaryType },
    { id: 4, name: 'Ataque Especial', power: 90, type: primaryType },
  ];
}

/** Construye el JSONB para player1_pokemon_data / player2_pokemon_data en battles */
function buildPokemonData(pokemonData) {
  const stats = extractPokemonStats(pokemonData);
  return {
    id: pokemonData.id,
    name: pokemonData.name,
    types: pokemonData.types?.map(t => t.type.name) || [],
    attacks: generatePokemonAttacks(pokemonData),
    sprite_front: pokemonData.sprites?.front_default,
    sprite_back: pokemonData.sprites?.back_default,
    hp: stats.hp,
    attack: stats.attack,
    defense: stats.defense,
    speed: stats.speed,
  };
}

// --------------------------------------------
// POST /api/matchmaking
// Body: { action: 'join' | 'leave' | 'check', pokemonId?, pokemonName? }
// --------------------------------------------
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await currentUser();
    const username =
      user?.username || user?.firstName || user?.emailAddresses?.[0]?.emailAddress || 'Player';

    const body = await request.json().catch(() => ({}));
    const action = body.action || 'check';
    const pokemonId = body.pokemonId != null ? Number(body.pokemonId) : null;
    const pokemonName = body.pokemonName || (pokemonId ? null : '');

    if (action === 'leave') {
      const { error } = await supabase
        .from('matchmaking_queue')
        .delete()
        .eq('user_id', userId);

      if (error) {
        console.error('Matchmaking leave error:', error);
        return NextResponse.json(
          { error: 'Failed to leave queue', details: error.message },
          { status: 500 }
        );
      }
      return NextResponse.json({ success: true, left: true });
    }

    if (action === 'check') {
      const { data: row } = await supabase
        .from('matchmaking_queue')
        .select('id, status, battle_id, matched_with_user_id')
        .eq('user_id', userId)
        .in('status', ['waiting', 'matched'])
        .order('joined_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return NextResponse.json({
        success: true,
        inQueue: !!row,
        status: row?.status ?? null,
        battleId: row?.battle_id ?? null,
        matchedWithUserId: row?.matched_with_user_id ?? null,
      });
    }

    if (action === 'join') {
      if (pokemonId == null && !pokemonName) {
        return NextResponse.json(
          { error: 'pokemonId or pokemonName required for join' },
          { status: 400 }
        );
      }

      const { data: existing } = await supabase
        .from('matchmaking_queue')
        .select('id, status, battle_id')
        .eq('user_id', userId)
        .in('status', ['waiting', 'matched'])
        .maybeSingle();

      if (existing) {
        if (existing.status === 'matched' && existing.battle_id) {
          return NextResponse.json({
            success: true,
            matched: true,
            battleId: existing.battle_id,
          });
        }
        return NextResponse.json({
          success: true,
          inQueue: true,
          status: existing.status,
          message: 'Already in queue',
        });
      }

      const nameForApi = pokemonName || String(pokemonId);
      const pokemonData = await fetchPokemonData(nameForApi);
      if (!pokemonData) {
        return NextResponse.json(
          { error: 'Could not load Pokemon data' },
          { status: 400 }
        );
      }
      const pkmId = pokemonData.id;
      const pkmName = pokemonData.name;

      const { data: waitingOpponent } = await supabase
        .from('matchmaking_queue')
        .select('id, user_id, username, pokemon_id, pokemon_name')
        .eq('status', 'waiting')
        .neq('user_id', userId)
        .order('joined_at', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (waitingOpponent) {
        const opponentPokemonData = await fetchPokemonData(
          waitingOpponent.pokemon_name || waitingOpponent.pokemon_id
        );
        if (!opponentPokemonData) {
          return NextResponse.json(
            { error: 'Could not load opponent Pokemon data' },
            { status: 500 }
          );
        }

        const player1Data = buildPokemonData(opponentPokemonData);
        const player2Data = buildPokemonData(pokemonData);
        const p1Hp = player1Data.hp;
        const p2Hp = player2Data.hp;

        const { data: newBattle, error: battleErr } = await supabase
          .from('battles')
          .insert({
            battle_mode: 'pvp',
            player1_user_id: waitingOpponent.user_id,
            player1_username: waitingOpponent.username,
            player2_user_id: userId,
            player2_username: username,
            player1_pokemon_id: waitingOpponent.pokemon_id,
            player2_pokemon_id: pkmId,
            status: 'active',
            started_at: new Date().toISOString(),
            current_turn: 'player1',
            player1_current_hp: p1Hp,
            player2_current_hp: p2Hp,
            player1_max_hp: p1Hp,
            player2_max_hp: p2Hp,
            player1_pokemon_data: player1Data,
            player2_pokemon_data: player2Data,
          })
          .select('id')
          .single();

        if (battleErr || !newBattle) {
          console.error('Error creating PvP battle:', battleErr);
          return NextResponse.json(
            { error: 'Failed to create battle', details: battleErr?.message },
            { status: 500 }
          );
        }

        const battleId = newBattle.id;

        await supabase
          .from('matchmaking_queue')
          .update({
            status: 'matched',
            battle_id: battleId,
            matched_with_user_id: userId,
          })
          .eq('id', waitingOpponent.id);

        return NextResponse.json({
          success: true,
          matched: true,
          battleId,
        });
      }

      const { error: insertErr } = await supabase.from('matchmaking_queue').insert({
        user_id: userId,
        username,
        pokemon_id: pkmId,
        pokemon_name: pkmName,
        status: 'waiting',
      });

      if (insertErr) {
        console.error('Matchmaking join insert error:', insertErr);
        return NextResponse.json(
          { error: 'Failed to join queue', details: insertErr.message },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        inQueue: true,
        status: 'waiting',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('Matchmaking error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
