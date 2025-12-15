'use client';

import { capitalize } from '../utils/battleUtils';

/**
 * Componente de barra de HP simple
 */
export default function BattleHPBar({
  pokemon,
  currentHP,
  maxHP,
  isPlayer = false,
}) {
  const hpPercentage = Math.max(0, Math.min(100, (currentHP / maxHP) * 100));
  const hpColor =
    hpPercentage > 50
      ? 'bg-green-500'
      : hpPercentage > 25
        ? 'bg-yellow-500'
        : 'bg-red-500';

  const pokemonName = pokemon?.name || 'Pokémon';
  const displayName = capitalize(pokemonName);

  return (
    <div
      className={`w-full ${isPlayer ? 'bg-blue-100' : 'bg-red-100'} border-2 border-gray-800 rounded p-2`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold text-sm">{displayName}</span>
        <span className="text-xs font-semibold">
          HP: {Math.floor(currentHP)} / {maxHP}
        </span>
      </div>
      <div className="w-full bg-gray-300 border-2 border-gray-800 rounded h-4 overflow-hidden">
        <div
          className={`h-full ${hpColor} transition-all duration-500 ease-out`}
          style={{ width: `${hpPercentage}%` }}
        />
      </div>
    </div>
  );
}
