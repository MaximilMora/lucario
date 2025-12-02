'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import PokemonDetailsSkeleton from './PokemonDetailsSkeleton';

export default function PokemonDetails({ pokemonId }) {
  const [pokemon, setPokemon] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animateStats, setAnimateStats] = useState(false);

  useEffect(() => {
    const fetchPokemon = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `https://pokeapi.co/api/v2/pokemon/${pokemonId}`
        );

        if (!response.ok) {
          throw new Error('Pokemon not found');
        }

        const data = await response.json();
        setPokemon(data);

        // Activate animation after loading data
        setTimeout(() => {
          setAnimateStats(true);
        }, 300);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (pokemonId) {
      fetchPokemon();
    }
  }, [pokemonId]);

  if (loading) {
    return <PokemonDetailsSkeleton />;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error</h1>
          <p className="text-gray-600 mb-4">{error}</p>
          <Link href="/" className="text-blue-600 hover:underline">
            ← Back to Pokemon List
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back Button */}
        <Link 
          href="/" 
          className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-8 bg-blue-200 rounded-full px-4 py-2 hover:bg-blue-100"
        >
          ← Back to Pokemon List
        </Link>
        {/* Pokemon Card */}
        
        <div className="bg-white rounded-2xl shadow-lg p-8">
          <div className="grid md:grid-cols-2 gap-8">
            {/* Image Section */}
            <div className="flex flex-col items-center">
              <div className="w-64 h-64 mb-6 flex items-center justify-center">
                <Image
                  src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${pokemon.id}.png`}
                  alt={pokemon.name}
                  width={256}
                  height={256}
                  className="w-64 h-64"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    e.target.nextSibling.style.display = 'flex';
                  }}
                />
              </div>

              <h1 className="text-3xl font-bold text-gray-800 capitalize mb-2">
                {pokemon.name}
              </h1>

              <p className="text-xl text-gray-600 mb-4">
                #{pokemon.id.toString().padStart(3, '0')}
              </p>
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Types */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Types
                </h2>
                <div className="flex gap-2">
                  {pokemon.types.map((type, index) => (
                    <div
                      key={index}
                      className="text-blue-800 bg-blue-100 px-3 py-1 rounded-full"
                    >
                      {type.type.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Stats */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Base Stats
                </h2>
                <div className="space-y-3">
                  {pokemon.stats.map((stat, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between"
                    >
                      <div className="text-gray-700 w-28 capitalize">
                        {stat.stat.name}:
                      </div>
                      <div className="flex-1 mx-4">
                        <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                          <div
                            className="bg-blue-600 h-2 rounded-full"
                            style={{
                              width: animateStats
                                ? `${(stat.base_stat / 255) * 100}%`
                                : '0%',
                              transitionProperty: 'width',
                              transitionDuration: '0.3s',
                              transitionTimingFunction: 'linear',
                              transitionDelay: `${index * 100}ms`,
                            }}
                          ></div>
                        </div>
                      </div>
                      <div className="font-bold text-black text-right w-12">
                        {stat.base_stat}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Abilities */}
              <div>
                <h2 className="text-xl font-semibold text-gray-800 mb-3">
                  Abilities
                </h2>
                <div className="text-xl ">
                  {pokemon.abilities.map((ability, index) => (
                    <div key={index} className="text-black mr-2 h-8 capitalize">
                      {ability.ability.name}
                    </div>
                  ))}
                </div>
              </div>

              {/* Physical Characteristics */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-xl">
                  <div className="text-black py-1 w-20 mr-2">
                    <strong>Height:</strong>
                    <br />
                    {pokemon.height / 10}m
                  </div>
                </div>
                <div className="text-xl">
                  <div className="text-black py-1 mr-2 ">
                    <strong>Weight:</strong>
                    <br /> {pokemon.weight / 10}Kg
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
