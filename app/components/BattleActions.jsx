'use client';

/**
 * Selector de acciones de combate
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
      {attacks.map(attack => (
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
          <div className="font-semibold text-sm text-gray-800">
            {attack.name}
          </div>
          <div className="text-xs text-gray-600">Poder: {attack.power}</div>
        </button>
      ))}
    </div>
  );
}
