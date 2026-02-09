'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useUser } from '@clerk/nextjs';
import BattleHPBar from './BattleHPBar';
import BattleMessages from './BattleMessages';
import BattleActions from './BattleActions';

/**
 * Componente principal del sistema de combate por turnos.
 * El estado de la batalla se maneja completamente en el servidor (Supabase).
 * El cliente solo envía battleId + attackId en cada turno.
 */
export default function PokemonBattle({
  playerPokemonId,
  opponentPokemonId,
  onBattleEnd,
}) {
  const { user, isLoaded } = useUser();

  // Battle identity
  const [battleId, setBattleId] = useState(null);

  // Player data (set once on init, sprites/attacks don't change)
  const [playerPokemon, setPlayerPokemon] = useState(null);
  const [opponentPokemon, setOpponentPokemon] = useState(null);

  // HP state (updated on each attack)
  const [playerHP, setPlayerHP] = useState(0);
  const [playerMaxHP, setPlayerMaxHP] = useState(0);
  const [opponentHP, setOpponentHP] = useState(0);
  const [opponentMaxHP, setOpponentMaxHP] = useState(0);

  // Messages & status
  const [messages, setMessages] = useState([]);
  const [battleStatus, setBattleStatus] = useState('active');

  // UI state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isAttacking, setIsAttacking] = useState(false);

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

      // Store battleId and display data
      setBattleId(data.battleId);
      setPlayerPokemon({
        name: data.player.pokemonName,
        sprites: data.player.sprites,
        attacks: data.player.attacks,
      });
      setOpponentPokemon({
        name: data.opponent.pokemonName,
        sprites: data.opponent.sprites,
        attacks: data.opponent.attacks,
      });
      setPlayerHP(data.player.currentHP);
      setPlayerMaxHP(data.player.maxHP);
      setOpponentHP(data.opponent.currentHP);
      setOpponentMaxHP(data.opponent.maxHP);
      setMessages(data.messages);
      setBattleStatus('active');
    } catch (err) {
      setError(err.message);
      console.error('Error initializing battle:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAttack = async (attackId) => {
    if (!battleId || battleStatus !== 'active' || isAttacking) return;

    try {
      setIsAttacking(true);

      // Only send battleId + attackId (server loads state from DB)
      const response = await fetch('/api/battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'attack',
          battleId,
          attackId,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al ejecutar el ataque');
      }

      // Update UI with animation delay
      setTimeout(() => {
        setPlayerHP(data.playerHP);
        setOpponentHP(data.opponentHP);
        setMessages((prev) => [...prev, ...data.messages]);
        setBattleStatus(data.battleStatus);
        setIsAttacking(false);

        // If battle ended, notify parent
        if (data.battleStatus !== 'active' && onBattleEnd) {
          setTimeout(() => {
            onBattleEnd(data.battleStatus);
          }, 2000);
        }
      }, 500);
    } catch (err) {
      setError(err.message);
      setIsAttacking(false);
      console.error('Error executing attack:', err);
    }
  };

  // ── Render states ──

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

  if (!playerPokemon || !opponentPokemon) {
    return null;
  }

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
              pokemon={{ name: opponentPokemon.name }}
              currentHP={opponentHP}
              maxHP={opponentMaxHP}
              isPlayer={false}
            />
          </div>
          <div
            className={`relative w-48 h-48 ${
              isAttacking ? 'animate-bounce' : ''
            } transition-transform duration-300`}
          >
            {opponentPokemon.sprites?.front_default && (
              <Image
                src={opponentPokemon.sprites.front_default}
                alt={opponentPokemon.name}
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
            {playerPokemon.sprites?.back_default && (
              <Image
                src={playerPokemon.sprites.back_default}
                alt={playerPokemon.name}
                fill
                className="object-contain"
                unoptimized
              />
            )}
            {!playerPokemon.sprites?.back_default &&
              playerPokemon.sprites?.front_default && (
                <Image
                  src={playerPokemon.sprites.front_default}
                  alt={playerPokemon.name}
                  fill
                  className="object-contain scale-x-[-1]"
                  unoptimized
                />
              )}
          </div>
          <div className="text-left ml-4">
            <BattleHPBar
              pokemon={{ name: playerPokemon.name }}
              currentHP={playerHP}
              maxHP={playerMaxHP}
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
            ¿Qué debería hacer {playerPokemon.name}?
          </h3>
          <BattleActions
            attacks={playerPokemon.attacks}
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
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
            >
              Volver
            </button>
          )}
        </div>
      )}
    </div>
  );
}
