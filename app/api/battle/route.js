import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import {
  calculateDamage,
  calculateMaxHP,
  getPokemonAttacks,
  getAttackStat,
  getDefenseStat,
  getHPStat,
} from '../../utils/battleUtils';
import { supabaseServer } from '../../lib/supabaseServerClient';

// Helper function to fetch Pokemon data from PokeAPI
async function fetchPokemonData(pokemonNameOrId) {
  try {
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${pokemonNameOrId}`
    );
    if (!response.ok) {
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('Error fetching Pokemon data:', error);
    return null;
  }
}

export const maxDuration = 30;

async function createBattleRecord({
  playerPokemonId,
  opponentPokemonId,
  playerPokemonName,
  opponentPokemonName,
  userId,
  username,
}) {
  try {
    const nowIso = new Date().toISOString();

    // Si no hay userId, usar un valor por defecto
    if (!userId) {
      console.warn('No user_id provided for battle creation');
      userId = 'guest';
    }

    // Si no hay username, usar un valor por defecto
    if (!username) {
      username = userId === 'guest' ? 'Guest' : 'Player';
    }

    // Player2 es siempre la IA/bot en modo single-player
    const player2UserId = 'ai';
    const player2Username = 'AI Opponent';

    const { data, error } = await supabaseServer
      .from('battles')
      .insert({
        player1_user_id: userId,
        player1_username: username,
        player2_user_id: player2UserId,
        player2_username: player2Username,
        player1_pokemon_id: playerPokemonId,
        player2_pokemon_id: opponentPokemonId,
        player1_pokemon_name: playerPokemonName,
        player2_pokemon_name: opponentPokemonName,
        status: 'active',
        started_at: nowIso,
        finished_at: null,
      })
      .select('id, started_at')
      .single();

    if (error) {
      console.error('Supabase create battle error:', error);
      return { battleId: null, startedAt: nowIso };
    }

    return {
      battleId: data?.id || null,
      startedAt: data?.started_at || nowIso,
    };
  } catch (error) {
    console.error('Supabase create battle exception:', error);
    return { battleId: null, startedAt: new Date().toISOString() };
  }
}

async function logBattleTurn(turn) {
  try {
    if (!turn?.battle_id) {
      return;
    }

    const { error } = await supabaseServer.from('battle_turns').insert(turn);

    if (error) {
      console.error('Supabase insert battle_turns error:', error);
    }
  } catch (error) {
    console.error('Supabase insert battle_turns exception:', error);
  }
}

async function finalizeBattle({ battleId, status, winnerSide, totalTurns }) {
  try {
    if (!battleId) {
      return;
    }

    const nowIso = new Date().toISOString();
    const { error } = await supabaseServer
      .from('battles')
      .update({
        status,
        winner_side: winnerSide,
        total_turns: Number.isFinite(totalTurns) ? totalTurns : 0,
        finished_at: nowIso,
      })
      .eq('id', battleId);

    if (error) {
      console.error('Supabase finalize battle error:', error);
    }
  } catch (error) {
    console.error('Supabase finalize battle exception:', error);
  }
}

/**
 * POST /api/battle
 * Maneja las acciones del combate
 */
export async function POST(request) {
  try {
    const { userId: clerkUserId } = auth();
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json(
        { error: 'Action is required' },
        { status: 400 }
      );
    }

    // Inicializar combate
    if (action === 'init') {
      const { playerPokemonId, opponentPokemonId, username } = body;

      if (!playerPokemonId || !opponentPokemonId) {
        return NextResponse.json(
          { error: 'Player and opponent Pokemon IDs are required' },
          { status: 400 }
        );
      }

      // Obtener datos de los Pokémon
      const [playerData, opponentData] = await Promise.all([
        fetchPokemonData(playerPokemonId),
        fetchPokemonData(opponentPokemonId),
      ]);

      if (!playerData || !opponentData) {
        return NextResponse.json(
          { error: 'Could not fetch Pokemon data' },
          { status: 404 }
        );
      }

      // Calcular HP máximo
      const playerHP = getHPStat(playerData);
      const opponentHP = getHPStat(opponentData);
      const playerMaxHP = calculateMaxHP(playerHP);
      const opponentMaxHP = calculateMaxHP(opponentHP);

      // Obtener ataques
      const playerAttacks = getPokemonAttacks(playerData);
      const opponentAttacks = getPokemonAttacks(opponentData);

      const { battleId, startedAt } = await createBattleRecord({
        playerPokemonId,
        opponentPokemonId,
        playerPokemonName: playerData.name,
        opponentPokemonName: opponentData.name,
        userId: clerkUserId || null,
        username: username || null,
      });

      // Estado inicial del combate
      const initialState = {
        battleId,
        startedAt,
        playerUserId: clerkUserId || 'guest', // Guardar user_id para usar en turnos
        turnNumber: 0,
        player: {
          pokemon: playerData,
          currentHP: playerMaxHP,
          maxHP: playerMaxHP,
          attacks: playerAttacks,
        },
        opponent: {
          pokemon: opponentData,
          currentHP: opponentMaxHP,
          maxHP: opponentMaxHP,
          attacks: opponentAttacks,
        },
        turn: 'player',
        messages: [
          `¡${playerData.name} vs ${opponentData.name}!`,
          '¡Comienza el combate!',
        ],
        battleStatus: 'active',
      };

      return NextResponse.json({
        success: true,
        battleState: initialState,
      });
    }

    // Ejecutar ataque
    if (action === 'attack') {
      const { battleState, attackId } = body;

      if (!battleState) {
        return NextResponse.json(
          { error: 'BattleState is required for attack action' },
          { status: 400 }
        );
      }

      if (attackId === undefined) {
        return NextResponse.json(
          { error: 'Attack ID is required' },
          { status: 400 }
        );
      }

      const { player, opponent } = battleState;

      // Verificar que el combate esté activo
      if (battleState.battleStatus !== 'active') {
        return NextResponse.json(
          { error: 'Battle is not active' },
          { status: 400 }
        );
      }

      // Obtener el ataque seleccionado
      const selectedAttack = player.attacks.find((a) => a.id === attackId);
      if (!selectedAttack) {
        return NextResponse.json({ error: 'Invalid attack' }, { status: 400 });
      }

      const messages = [...battleState.messages];
      const newBattleState = { ...battleState };
      const battleId = battleState.battleId;
      const playerUserId = battleState.playerUserId || clerkUserId || 'guest';
      let nextTurnNumber = Number.isFinite(battleState.turnNumber)
        ? battleState.turnNumber
        : 0;
      const nowIso = new Date().toISOString();

      // Ataque del jugador
      const playerAttack = getAttackStat(player.pokemon);
      const opponentDefense = getDefenseStat(opponent.pokemon);
      const playerDamage = calculateDamage(
        playerAttack,
        opponentDefense,
        selectedAttack.power
      );

      const opponentHpBefore = opponent.currentHP;
      messages.push(`${player.pokemon.name} usó ${selectedAttack.name}!`);
      newBattleState.opponent.currentHP = Math.max(
        0,
        opponent.currentHP - playerDamage
      );
      const opponentHpAfter = newBattleState.opponent.currentHP;
      messages.push(
        `El rival ${opponent.pokemon.name} recibió ${playerDamage} de daño.`
      );

      nextTurnNumber += 1;
      await logBattleTurn({
        battle_id: battleId,
        turn_number: nextTurnNumber,
        player_user_id: playerUserId,
        player_side: 'player1',
        action_type: 'attack',
        attack_id: selectedAttack.id ?? attackId ?? null,
        attack_name: selectedAttack.name ?? null,
        damage_dealt: playerDamage,
        target_hp_before: opponentHpBefore,
        target_hp_after: opponentHpAfter,
        player1_hp_after: player.currentHP,
        player2_hp_after: opponentHpAfter,
        message: `${player.pokemon.name} usó ${selectedAttack.name}!`,
        executed_at: nowIso,
      });

      // Verificar si el oponente fue derrotado
      if (newBattleState.opponent.currentHP <= 0) {
        newBattleState.opponent.currentHP = 0;
        newBattleState.battleStatus = 'playerWon';
        messages.push(`¡${opponent.pokemon.name} se debilitó!`);
        messages.push(`¡Has ganado el combate!`);
        newBattleState.turnNumber = nextTurnNumber;

        await finalizeBattle({
          battleId,
          status: 'playerWon',
          winnerSide: 'player1',
          totalTurns: nextTurnNumber,
        });

        return NextResponse.json({
          success: true,
          battleState: newBattleState,
          messages,
        });
      }

      // Ataque del oponente (IA simple: ataque aleatorio)
      const opponentAttack =
        opponent.attacks[Math.floor(Math.random() * opponent.attacks.length)];
      const opponentAttackStat = getAttackStat(opponent.pokemon);
      const playerDefense = getDefenseStat(player.pokemon);
      const opponentDamage = calculateDamage(
        opponentAttackStat,
        playerDefense,
        opponentAttack.power
      );

      const playerHpBefore = player.currentHP;
      messages.push(
        `El rival ${opponent.pokemon.name} usó ${opponentAttack.name}!`
      );
      newBattleState.player.currentHP = Math.max(
        0,
        player.currentHP - opponentDamage
      );
      const playerHpAfter = newBattleState.player.currentHP;
      messages.push(
        `${player.pokemon.name} recibió ${opponentDamage} de daño.`
      );

      nextTurnNumber += 1;
      // Para player2 (IA), usar 'ai' como user_id
      await logBattleTurn({
        battle_id: battleId,
        turn_number: nextTurnNumber,
        player_user_id: 'ai',
        player_side: 'player2',
        action_type: 'attack',
        attack_id: opponentAttack.id ?? null,
        attack_name: opponentAttack.name ?? null,
        damage_dealt: opponentDamage,
        target_hp_before: playerHpBefore,
        target_hp_after: playerHpAfter,
        player1_hp_after: playerHpAfter,
        player2_hp_after: opponent.currentHP,
        message: `El rival ${opponent.pokemon.name} usó ${opponentAttack.name}!`,
        executed_at: nowIso,
      });

      // Verificar si el jugador fue derrotado
      if (newBattleState.player.currentHP <= 0) {
        newBattleState.player.currentHP = 0;
        newBattleState.battleStatus = 'opponentWon';
        messages.push(`¡${player.pokemon.name} se debilitó!`);
        messages.push(`Has perdido el combate...`);
        newBattleState.turnNumber = nextTurnNumber;

        await finalizeBattle({
          battleId,
          status: 'opponentWon',
          winnerSide: 'player2',
          totalTurns: nextTurnNumber,
        });

        return NextResponse.json({
          success: true,
          battleState: newBattleState,
          messages,
        });
      }

      newBattleState.messages = messages;
      newBattleState.turn = 'player'; // Siguiente turno del jugador
      newBattleState.turnNumber = nextTurnNumber;

      return NextResponse.json({
        success: true,
        battleState: newBattleState,
        messages,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Battle API Error:', error);
    return NextResponse.json(
      { error: 'Failed to process battle action' },
      { status: 500 }
    );
  }
}
