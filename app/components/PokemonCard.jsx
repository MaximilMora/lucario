'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

export default function PokemonCard({ pokemon }) {
  const router = useRouter();

  // Extract Pokemon ID from pokemon.url
  // Example: "https://pokeapi.co/api/v2/pokemon/1/" -> 1
  const pokemonId = pokemon.url.split('/').filter(Boolean).pop();

  const handleClick = () => {
    // Navigate to Pokemon details page
    router.push(`/pokemon/${pokemonId}`);
  };

  return (
    <div
      className="bg-white rounded-xl shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 cursor-pointer w-[200px] h-[250px] flex flex-col items-center justify-center p-4"
      onClick={handleClick}
    >
      <div className="w-24 h-24 mb-4 flex items-center justify-center">
        <Image
          src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemonId}.png`}
          alt={pokemon.name}
          width={96}
          height={96}
          className="w-24 h-24"
          onError={e => {
            e.target.style.display = 'none';
            e.target.nextSibling.style.display = 'flex';
          }}
        />
        <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center hidden">
          <span className="text-gray-500 text-sm">Image</span>
        </div>
      </div>

      <h3 className="font-semibold text-gray-800 mb-2 capitalize">
        {pokemon.name}
      </h3>

      <p className="text-sm text-gray-600">#{pokemonId.padStart(3, '0')}</p>
    </div>
  );
}
