'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { capitalize } from '../utils/battleUtils';
import PokemonBattle from './PokemonBattle';
import BattleModeSelector from './BattleModeSelector';
import WaitingLobby from './WaitingLobby';
import PvPBattle from './PvPBattle';

/**
 * Componente para iniciar un combate (vs AI o vs Jugador PvP).
 */
export default function BattleStarter() {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerPokemonId, setPlayerPokemonId] = useState(null);
  const [opponentPokemonId, setOpponentPokemonId] = useState(null);
  const [showBattle, setShowBattle] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);
  const [battleMode, setBattleMode] = useState(null);
  const [showWaitingLobby, setShowWaitingLobby] = useState(false);
  const [pvpBattleId, setPvpBattleId] = useState(null);

  useEffect(() => {
    fetchPokemons();
  }, []);

  const fetchPokemons = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        'https://pokeapi.co/api/v2/pokemon?limit=151'
      );
      if (!response.ok) throw new Error('Error al cargar Pokémon');

      const data = await response.json();
      setPokemons(data.results);
    } catch (error) {
      console.error('Error fetching pokemons:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartBattle = () => {
    if (playerPokemonId) {
      // Seleccionar oponente aleatorio (que no sea el mismo que el jugador)
      let randomOpponentId;
      do {
        randomOpponentId = Math.floor(Math.random() * pokemons.length) + 1;
      } while (randomOpponentId === playerPokemonId);

      setOpponentPokemonId(randomOpponentId);
      setSelectedOpponent(pokemons[randomOpponentId - 1]);
      setShowBattle(true);
    }
  };

  const handleBattleEnd = result => {
    console.log('Combate terminado:', result);
    setTimeout(() => {
      setShowBattle(false);
      setPlayerPokemonId(null);
      setOpponentPokemonId(null);
    }, 3000);
  };

  const handlePvPBattleEnd = () => {
    setPvpBattleId(null);
    setPlayerPokemonId(null);
  };

  if (pvpBattleId) {
    return (
      <PvPBattle battleId={pvpBattleId} onBattleEnd={handlePvPBattleEnd} />
    );
  }

  if (showWaitingLobby && battleMode === 'pvp' && playerPokemonId) {
    const selectedPokemon = pokemons[playerPokemonId - 1];
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="p-8 max-w-6xl mx-auto">
          <div className="mb-4">
            <Link
              href="/battle"
              className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              ← Volver
            </Link>
          </div>
          <div className="bg-white rounded-xl shadow-md p-6">
            <WaitingLobby
              pokemonId={playerPokemonId}
              pokemonName={selectedPokemon?.name}
              onMatched={setPvpBattleId}
              onCancel={() => setShowWaitingLobby(false)}
            />
          </div>
        </div>
      </div>
    );
  }

  if (showBattle && playerPokemonId && opponentPokemonId) {
    return (
      <PokemonBattle
        playerPokemonId={playerPokemonId}
        opponentPokemonId={opponentPokemonId}
        onBattleEnd={handleBattleEnd}
      />
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-4">
          <Link
            href="/"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            ← Volver
          </Link>
        </div>
        <div className="bg-white rounded-xl shadow-md p-6">
          <h1 className="text-3xl font-bold text-center mb-2 text-gray-900">
            Sistema de Combate Pokémon
          </h1>
          {!battleMode ? (
            <p className="text-center text-gray-600 mb-4">
              Elige el modo de batalla y tu Pokémon.
            </p>
          ) : battleMode === 'ai' ? (
            <p className="text-center text-gray-600 mb-4">
              Selecciona tu Pokémon. El oponente será elegido al azar.
            </p>
          ) : (
            <p className="text-center text-gray-600 mb-4">
              Selecciona tu Pokémon y busca un rival en línea.
            </p>
          )}

          {!battleMode && <BattleModeSelector onSelect={setBattleMode} />}

          {battleMode && (
            <div className="flex justify-center mb-4">
              <button
                type="button"
                onClick={() => {
                  setBattleMode(null);
                  setPlayerPokemonId(null);
                  setSelectedOpponent(null);
                  setShowWaitingLobby(false);
                }}
                className="text-sm text-gray-600 hover:text-gray-800 underline"
              >
                ← Cambiar modo de batalla
              </button>
            </div>
          )}

          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
              <p className="ml-4 text-gray-600">Cargando Pokémon...</p>
            </div>
          ) : (
            <div className="max-w-2xl mx-auto">
              {/* Selección del jugador - mismo estilo que galería (tarjetas) */}
              <div>
                <h2 className="text-xl font-bold mb-4 text-gray-900 text-center">
                  Tu Pokémon
                </h2>
                <div className="bg-gray-50 rounded-xl shadow-sm p-4 max-h-96 overflow-y-auto">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 justify-items-center">
                    {pokemons.map((pokemon, index) => {
                      const pokemonId = index + 1;
                      const isSelected = playerPokemonId === pokemonId;
                      return (
                        <button
                          key={pokemon.name}
                          onClick={() => setPlayerPokemonId(pokemonId)}
                          className={`
                            w-full max-w-[200px] bg-white rounded-xl shadow-md hover:shadow-lg
                            p-3 flex flex-col items-center justify-center min-h-[80px]
                            transition-all duration-200
                            ${
                              isSelected
                                ? 'ring-2 ring-red-500 shadow-lg'
                                : 'hover:scale-105'
                            }
                          `}
                        >
                          <span className="text-sm font-semibold text-gray-800 capitalize">
                            {pokemon.name}
                          </span>
                          <span className="text-xs text-gray-600">
                            #{pokemonId.toString().padStart(3, '0')}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Información del oponente (solo modo AI) */}
              {battleMode === 'ai' && selectedOpponent && (
                <div className="mt-6 p-4 bg-white rounded-xl shadow-md border-l-4 border-red-500">
                  <h3 className="text-lg font-bold text-gray-900 mb-1">
                    Pokémon Rival (Aleatorio)
                  </h3>
                  <p className="text-gray-600">
                    Tu oponente será:{' '}
                    <span className="font-semibold text-gray-800">
                      {capitalize(selectedOpponent.name)}
                    </span>
                  </p>
                </div>
              )}
              {battleMode === 'pvp' && playerPokemonId && (
                <div className="mt-6 p-4 bg-white rounded-xl shadow-md border-l-4 border-gray-400">
                  <p className="text-gray-600">
                    Tu Pokémon:{' '}
                    <span className="font-semibold text-gray-800">
                      {capitalize(pokemons[playerPokemonId - 1]?.name)}
                    </span>
                    . Haz clic en Buscar rival para entrar en la cola.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Botones principales - mismo estilo que HomePage (rojo primario) */}
          <div className="mt-8 text-center">
            {battleMode === 'ai' && (
              <button
                onClick={handleStartBattle}
                disabled={!playerPokemonId || loading}
                className={`
                  px-8 py-4 text-lg font-semibold rounded-lg transition-colors
                  ${
                    playerPokemonId && !loading
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {playerPokemonId
                  ? '¡Comenzar Combate!'
                  : 'Selecciona tu Pokémon'}
              </button>
            )}
            {battleMode === 'pvp' && (
              <button
                onClick={() => setShowWaitingLobby(true)}
                disabled={!playerPokemonId || loading}
                className={`
                  px-8 py-4 text-lg font-semibold rounded-lg transition-colors
                  ${
                    playerPokemonId && !loading
                      ? 'bg-red-500 text-white hover:bg-red-600'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }
                `}
              >
                {playerPokemonId ? 'Buscar rival' : 'Selecciona tu Pokémon'}
              </button>
            )}
            {!battleMode && (
              <p className="text-gray-500 mt-4">
                Selecciona un modo y tu Pokémon para continuar.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
