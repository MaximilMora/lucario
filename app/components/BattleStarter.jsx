'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { capitalize } from '../utils/battleUtils';
import PokemonBattle from './PokemonBattle';

/**
 * Componente para iniciar un combate
 */
export default function BattleStarter() {
  const [pokemons, setPokemons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [playerPokemonId, setPlayerPokemonId] = useState(null);
  const [opponentPokemonId, setOpponentPokemonId] = useState(null);
  const [showBattle, setShowBattle] = useState(false);
  const [selectedOpponent, setSelectedOpponent] = useState(null);

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
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-blue-200 to-green-200 min-h-screen p-4">
      <div className="mb-4">
        <Link
          href="/"
          className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
        >
          ← Volver
        </Link>
      </div>
      <div className="bg-white border-4 border-gray-900 rounded-lg p-6">
        <h1 className="text-3xl font-bold text-center mb-6 text-gray-800">
          Sistema de Combate Pokémon
        </h1>
        <p className="text-center text-gray-600 mb-8">
          Selecciona tu Pokémon. El oponente será elegido al azar.
        </p>

        {loading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto">
            {/* Selección del jugador */}
            <div>
              <h2 className="text-xl font-bold mb-4 text-blue-600 text-center">
                Tu Pokémon
              </h2>
              <div className="border-2 border-blue-500 rounded-lg p-4 bg-blue-50 max-h-96 overflow-y-auto">
                <div className="grid grid-cols-2 gap-2">
                  {pokemons.map((pokemon, index) => {
                    const pokemonId = index + 1;
                    const isSelected = playerPokemonId === pokemonId;
                    return (
                      <button
                        key={pokemon.name}
                        onClick={() => setPlayerPokemonId(pokemonId)}
                        className={`
                          p-3 border-2 rounded-lg text-left
                          transition-all duration-150
                          ${
                            isSelected
                              ? 'border-blue-600 bg-blue-200 font-bold'
                              : 'border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50'
                          }
                        `}
                      >
                        <span className="text-sm font-semibold text-black">
                          #{pokemonId} {capitalize(pokemon.name)}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Información del oponente aleatorio */}
            {selectedOpponent && (
              <div className="mt-6 p-4 bg-red-50 border-2 border-red-500 rounded-lg">
                <h3 className="text-lg font-bold text-red-600 mb-2">
                  Pokémon Rival (Aleatorio)
                </h3>
                <p className="text-gray-700">
                  Tu oponente será:{' '}
                  <span className="font-bold">
                    {capitalize(selectedOpponent.name)}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}

        {/* Botón para iniciar combate */}
        <div className="mt-8 text-center">
          <button
            onClick={handleStartBattle}
            disabled={!playerPokemonId || loading}
            className={`
              px-8 py-4 text-xl font-bold rounded-lg
              transition-all duration-200
              ${
                playerPokemonId && !loading
                  ? 'bg-green-600 text-white hover:bg-green-700 shadow-lg hover:shadow-xl'
                  : 'bg-gray-400 text-gray-200 cursor-not-allowed'
              }
            `}
          >
            {playerPokemonId ? '¡Comenzar Combate!' : 'Selecciona tu Pokémon'}
          </button>
        </div>
      </div>
    </div>
  );
}
