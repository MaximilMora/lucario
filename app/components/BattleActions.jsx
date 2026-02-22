'use client';

const TYPE_COLORS = {
  normal: 'bg-gray-400 text-white',
  fire: 'bg-orange-500 text-white',
  water: 'bg-blue-500 text-white',
  electric: 'bg-yellow-400 text-gray-900',
  grass: 'bg-green-500 text-white',
  ice: 'bg-cyan-300 text-gray-900',
  fighting: 'bg-red-700 text-white',
  poison: 'bg-purple-600 text-white',
  ground: 'bg-yellow-700 text-white',
  flying: 'bg-indigo-400 text-white',
  psychic: 'bg-pink-500 text-white',
  bug: 'bg-lime-600 text-white',
  rock: 'bg-yellow-800 text-white',
  ghost: 'bg-purple-900 text-white',
  dragon: 'bg-indigo-700 text-white',
  dark: 'bg-gray-800 text-white',
  steel: 'bg-slate-500 text-white',
  fairy: 'bg-pink-300 text-gray-900',
};

/**
 * Selector de acciones de combate con badges de tipo.
 */
export default function BattleActions({
  attacks = [],
  onSelectAttack,
  disabled = false,
}) {
  if (!attacks || attacks.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gray-50 rounded-xl shadow-sm p-3 text-center">
          <p className="text-gray-500 text-sm">Sin ataques</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3">
      {attacks.map(attack => {
        const typeClass =
          TYPE_COLORS[attack.type] || 'bg-gray-400 text-white';
        return (
          <button
            key={attack.id}
            onClick={() => onSelectAttack(attack.id)}
            disabled={disabled}
            className={`
              bg-white rounded-xl shadow-md hover:shadow-lg p-3 text-left
              transition-all duration-200
              ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer hover:scale-[1.02]'}
            `}
          >
            <div className="font-semibold text-sm text-gray-800 mb-1">
              {attack.name}
            </div>
            <div className="flex items-center gap-2">
              {attack.type && (
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${typeClass}`}
                >
                  {attack.type}
                </span>
              )}
              <span className="text-xs text-gray-600">
                Poder: {attack.power}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
