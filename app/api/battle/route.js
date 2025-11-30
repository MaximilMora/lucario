import { NextResponse } from 'next/server';
import {
  calculateDamage,
  calculateMaxHP,
  getPokemonAttacks,
  getAttackStat,
  getDefenseStat,
  getHPStat,
} from '../../utils/battleUtils';

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

/**
 * POST /api/battle
 * Maneja las acciones del combate
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { action } = body;

    if (!action) {
      return NextResponse.json({ error: 'Action is required' }, { status: 400 });
    }

    // Inicializar combate
    if (action === 'init') {
      const { playerPokemonId, opponentPokemonId } = body;

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

      // Estado inicial del combate
      const initialState = {
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

      // Ataque del jugador
      const playerAttack = getAttackStat(player.pokemon);
      const opponentDefense = getDefenseStat(opponent.pokemon);
      const playerDamage = calculateDamage(
        playerAttack,
        opponentDefense,
        selectedAttack.power
      );

      messages.push(`${player.pokemon.name} usó ${selectedAttack.name}!`);
      newBattleState.opponent.currentHP = Math.max(
        0,
        opponent.currentHP - playerDamage
      );
      messages.push(
        `El rival ${opponent.pokemon.name} recibió ${playerDamage} de daño.`
      );

      // Verificar si el oponente fue derrotado
      if (newBattleState.opponent.currentHP <= 0) {
        newBattleState.opponent.currentHP = 0;
        newBattleState.battleStatus = 'playerWon';
        messages.push(`¡${opponent.pokemon.name} se debilitó!`);
        messages.push(`¡Has ganado el combate!`);

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

      messages.push(
        `El rival ${opponent.pokemon.name} usó ${opponentAttack.name}!`
      );
      newBattleState.player.currentHP = Math.max(
        0,
        player.currentHP - opponentDamage
      );
      messages.push(
        `${player.pokemon.name} recibió ${opponentDamage} de daño.`
      );

      // Verificar si el jugador fue derrotado
      if (newBattleState.player.currentHP <= 0) {
        newBattleState.player.currentHP = 0;
        newBattleState.battleStatus = 'opponentWon';
        messages.push(`¡${player.pokemon.name} se debilitó!`);
        messages.push(`Has perdido el combate...`);

        return NextResponse.json({
          success: true,
          battleState: newBattleState,
          messages,
        });
      }

      newBattleState.messages = messages;
      newBattleState.turn = 'player'; // Siguiente turno del jugador

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

