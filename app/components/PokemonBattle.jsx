'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import BattleHPBar from './BattleHPBar';
import BattleMessages from './BattleMessages';
import BattleActions from './BattleActions';

/**
 * Componente principal del sistema de combate por turnos
 */
export default function PokemonBattle({
  playerPokemonId,
  opponentPokemonId,
  onBattleEnd,
}) {
  const { user, isLoaded } = useUser(); // Obtener usuario de Clerk
  const [battleState, setBattleState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const battleStartTimeRef = useRef(null);
  const turnCountRef = useRef(0);

  // Inicializar combate
  useEffect(() => {
    if (playerPokemonId && opponentPokemonId) {
      initializeBattle();
    }
  }, [playerPokemonId, opponentPokemonId]);

  const initializeBattle = async () => {
    try {
      setLoading(true);
      setError(null);

      let username = null;
      if (isLoaded && user) {
        username =
          user.username ||
          user.firstName ||
          (user.primaryEmailAddress?.emailAddress
            ? user.primaryEmailAddress.emailAddress.split('@')[0]
            : null) ||
          'Player';
      }

      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          playerPokemonId,
          opponentPokemonId,
          username,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al inicializar el combate');
      }

      setBattleState(data.battleState);
      battleStartTimeRef.current = Date.now(); // Guardar tiempo de inicio
      turnCountRef.current = 0; // Resetear contador de turnos
    } catch (err) {
      setError(err.message);
      console.error('Error initializing battle:', err);
    } finally {
      setLoading(false);
    }
  };

  // Función para guardar la batalla en Supabase
  const saveBattleToDatabase = async (finalBattleState) => {
    try {
      const { player, opponent, battleStatus, messages, battleId, startedAt } =
        finalBattleState;
      const resolvedPlayerId = playerPokemonId ?? player?.pokemon?.id;
      const resolvedOpponentId = opponentPokemonId ?? opponent?.pokemon?.id;
      const resolvedPlayerName =
        player?.pokemon?.name ||
        (resolvedPlayerId ? `${resolvedPlayerId}` : '');
      const resolvedOpponentName =
        opponent?.pokemon?.name ||
        (resolvedOpponentId ? `${resolvedOpponentId}` : '');

      // Calcular duración (aproximada)
      const durationSeconds = battleStartTimeRef.current
        ? Math.floor((Date.now() - battleStartTimeRef.current) / 1000)
        : 0;

      // Obtener username del usuario de forma segura
      let username = 'Guest';
      let userId = 'guest';

      if (isLoaded && user) {
        userId = user.id || 'guest';
        username =
          user.username ||
          user.firstName ||
          (user.primaryEmailAddress?.emailAddress
            ? user.primaryEmailAddress.emailAddress.split('@')[0]
            : null) ||
          'Guest';
      }

      const response = await fetch('/api/battles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          // Jugador 1 (usuario actual)
          player1UserId: userId,
          player1Username: username,
          player1PokemonId: playerPokemonId,
          player1PokemonName: player.pokemon?.name || '',
          // Jugador 2 (AI oponente por ahora)
          player2UserId: 'ai', // AI tiene user_id fijo
          player2Username: 'AI Opponent',
          player2PokemonId: opponentPokemonId,
          player2PokemonName: opponent.pokemon?.name || '',
          // Estado de la batalla
          battleStatus: battleStatus,
          totalTurns: turnCountRef.current,
          durationSeconds: durationSeconds,
          messages: messages || [],
          startedAt: battleStartTimeRef.current
            ? new Date(battleStartTimeRef.current).toISOString()
            : new Date().toISOString(),
          finishedAt: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const errorPayload = await response.json().catch(() => ({}));
        console.error('Error guardando batalla en /api/battles', {
          status: response.status,
          errorPayload,
        });
      }
    } catch (error) {
      // No bloqueamos la UI si falla guardar en BD
      console.error('Error saving battle to database:', error);
      // Log adicional para debugging
      if (error instanceof ReferenceError) {
        console.error('ReferenceError details:', error.message, error.stack);
      }
    }
  };

  const handleAttack = async (attackId) => {
    if (!battleState || battleState.battleStatus !== 'active' || isAttacking) {
      return;
    }

    try {
      setIsAttacking(true);

      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'attack',
          attackId,
          battleState,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al ejecutar el ataque');
      }

      // Actualizar estado con delay para animación
      setTimeout(() => {
        setBattleState(data.battleState);
        setIsAttacking(false);
        turnCountRef.current += 1; // Incrementar contador de turnos

        // Si el combate terminó, guardar en BD y notificar
        if (data.battleState.battleStatus !== 'active') {
          // Guardar en Supabase (no bloquea la UI)
          saveBattleToDatabase(data.battleState);

          // Notificar al componente padre
          if (onBattleEnd) {
            setTimeout(() => {
              onBattleEnd(data.battleState.battleStatus);
            }, 2000);
          }
        }
      }, 500);
    } catch (err) {
      setError(err.message);
      setIsAttacking(false);
      console.error('Error executing attack:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Iniciando combate...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center bg-red-50 border-2 border-red-500 rounded-lg p-6">
          <p className="text-red-600 font-bold mb-2">Error</p>
          <p className="text-gray-700">{error}</p>
          <button
            onClick={initializeBattle}
            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!battleState) {
    return null;
  }

  const { player, opponent, messages, battleStatus } = battleState;
  const isBattleActive = battleStatus === 'active';

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-blue-200 to-green-200 min-h-screen p-4">
      <div className="mb-4">
        <Link
          href="/battle"
          className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
        >
          ← Volver
        </Link>
      </div>

      {/* Área de combate */}
      <div className="bg-white border-4 border-gray-900 rounded-lg p-6 mb-4">
        {/* Pokémon Oponente */}
        <div className="flex justify-end items-start mb-8">
          <div className="text-right mr-4">
            <BattleHPBar
              pokemon={opponent.pokemon}
              currentHP={opponent.currentHP}
              maxHP={opponent.maxHP}
              isPlayer={false}
            />
          </div>
          <div
            className={`relative w-48 h-48 ${
              isAttacking ? 'animate-bounce' : ''
            } transition-transform duration-300`}
          >
            {opponent.pokemon?.sprites?.front_default && (
              <Image
                src={opponent.pokemon.sprites.front_default}
                alt={opponent.pokemon.name}
                fill
                className="object-contain"
                unoptimized
              />
            )}
          </div>
        </div>

        {/* Pokémon Jugador */}
        <div className="flex justify-start items-start">
          <div
            className={`relative w-48 h-48 ${
              isAttacking ? 'animate-pulse' : ''
            } transition-transform duration-300`}
          >
            {player.pokemon?.sprites?.back_default && (
              <Image
                src={player.pokemon.sprites.back_default}
                alt={player.pokemon.name}
                fill
                className="object-contain"
                unoptimized
              />
            )}
            {!player.pokemon?.sprites?.back_default &&
              player.pokemon?.sprites?.front_default && (
                <Image
                  src={player.pokemon.sprites.front_default}
                  alt={player.pokemon.name}
                  fill
                  className="object-contain scale-x-[-1]"
                  unoptimized
                />
              )}
          </div>
          <div className="text-left ml-4">
            <BattleHPBar
              pokemon={player.pokemon}
              currentHP={player.currentHP}
              maxHP={player.maxHP}
              isPlayer={true}
            />
          </div>
        </div>
      </div>

      {/* Mensajes de combate */}
      <div className="mb-4">
        <BattleMessages messages={messages} />
      </div>

      {/* Acciones de combate */}
      {isBattleActive && (
        <div className="bg-white border-4 border-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3 text-gray-800">
            ¿Qué debería hacer {player.pokemon?.name}?
          </h3>
          <BattleActions
            attacks={player.attacks}
            onSelectAttack={handleAttack}
            disabled={isAttacking}
          />
        </div>
      )}

      {/* Resultado del combate */}
      {!isBattleActive && (
        <div
          className={`bg-white border-4 border-gray-900 rounded-lg p-6 text-center ${
            battleStatus === 'playerWon' ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <h2 className="text-2xl font-bold mb-4 text-black">
            {battleStatus === 'playerWon' ? '¡Victoria!' : 'Derrota'}
          </h2>
          <p className="text-lg mb-4 text-black">
            {battleStatus === 'playerWon'
              ? '¡Has ganado el combate!'
              : 'Has perdido el combate...'}
          </p>
          {onBattleEnd && (
            <button
              onClick={() => onBattleEnd(battleStatus)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold text-black"
            >
              Volver
            </button>
          )}
        </div>
      )}
    </div>
  );
}
