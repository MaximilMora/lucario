'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import BattleHPBar from './BattleHPBar';
import BattleMessages from './BattleMessages';
import BattleActions from './BattleActions';

/**
 * Componente principal del sistema de combate por turnos
 *
 * SEGURIDAD: El cliente solo envía IDs al servidor.
 * El servidor mantiene el estado real en Supabase.
 */
export default function PokemonBattle({
  playerPokemonId,
  opponentPokemonId,
  onBattleEnd,
}) {
  const [battleState, setBattleState] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const battleIdRef = useRef(null);

  /**
   * Inicializa la batalla enviando los IDs de Pokémon al servidor
   */
  const initializeBattle = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'init',
          playerPokemonId,
          opponentPokemonId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al inicializar el combate');
      }

      // Guardar battleId para futuras acciones
      battleIdRef.current = data.battleState.battleId;
      setBattleState(data.battleState);
    } catch (err) {
      setError(err.message);
      console.error('Error initializing battle:', err);
    } finally {
      setLoading(false);
    }
  };

  // Inicializar combate
  useEffect(() => {
    if (playerPokemonId && opponentPokemonId) {
      initializeBattle();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playerPokemonId, opponentPokemonId]);

  /**
   * Ejecuta un ataque enviando SOLO el battleId y attackId
   * El servidor calcula todo y devuelve el nuevo estado
   */
  const handleAttack = async attackId => {
    if (!battleState || battleState.status !== 'active' || isAttacking) {
      return;
    }

    try {
      setIsAttacking(true);

      // SEGURIDAD: Solo enviamos IDs, no el estado
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'attack',
          battleId: battleIdRef.current,
          attackId,
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

        // Si el combate terminó, notificar
        if (data.battleState.status !== 'active') {
          if (onBattleEnd) {
            setTimeout(() => {
              onBattleEnd(data.battleState.status);
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

  /**
   * Abandona la batalla actual
   */
  const handleAbandon = async () => {
    if (!battleIdRef.current) return;

    try {
      await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'abandon',
          battleId: battleIdRef.current,
        }),
      });

      if (onBattleEnd) {
        onBattleEnd('abandoned');
      }
    } catch (err) {
      console.error('Error abandoning battle:', err);
    }
  };

  // Estado de carga
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

  // Estado de error
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

  // Sin estado de batalla
  if (!battleState) {
    return null;
  }

  const { player, opponent, status } = battleState;
  const isBattleActive = status === 'active';

  // Convertir mensajes al formato esperado por BattleMessages
  const formattedMessages = (battleState.messages || []).map(msg =>
    typeof msg === 'string' ? msg : msg.text
  );

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-blue-200 to-green-200 min-h-screen p-4">
      {/* Header con navegación */}
      <div className="mb-4 flex justify-between items-center">
        <Link
          href="/battle"
          className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
        >
          ← Volver
        </Link>
        {isBattleActive && (
          <button
            onClick={handleAbandon}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
          >
            Abandonar
          </button>
        )}
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
        <BattleMessages messages={formattedMessages} />
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
            status === 'player1_won' ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <h2 className="text-2xl font-bold mb-4 text-black">
            {status === 'player1_won' ? '¡Victoria!' : 'Derrota'}
          </h2>
          <p className="text-lg mb-4 text-black">
            {status === 'player1_won'
              ? '¡Has ganado el combate!'
              : 'Has perdido el combate...'}
          </p>
          {onBattleEnd && (
            <button
              onClick={() => onBattleEnd(status)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
            >
              Volver
            </button>
          )}
        </div>
      )}

      {/* Indicador de turno */}
      {isBattleActive && (
        <div className="mt-4 text-center text-sm text-gray-600">
          Turno #{battleState.turnNumber || 0}
          {isAttacking && (
            <span className="ml-2 animate-pulse">Procesando...</span>
          )}
        </div>
      )}
    </div>
  );
}
