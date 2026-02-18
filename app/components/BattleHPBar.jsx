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
      className={`w-full rounded-xl shadow-sm p-2 ${
        isPlayer ? 'bg-gray-100' : 'bg-gray-50'
      }`}
    >
      <div className="flex justify-between items-center mb-1">
        <span className="font-semibold text-sm text-gray-800">
          {displayName}
        </span>
        <span className="text-xs text-gray-600">
          HP: {Math.floor(currentHP)} / {maxHP}
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
        <div
          className={`h-full ${hpColor} transition-all duration-500 ease-out`}
          style={{ width: `${hpPercentage}%` }}
        />
      </div>
    </div>
  );
}
