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
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-gray-200 border-2 border-gray-400 rounded p-3 text-center">
          <p className="text-gray-500 text-sm">Sin ataques</p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2">
      {attacks.map(attack => (
        <button
          key={attack.id}
          onClick={() => onSelectAttack(attack.id)}
          disabled={disabled}
          className={`
            bg-white border-2 border-gray-800 rounded-lg p-3 text-left
            hover:bg-blue-50 hover:border-blue-500
            active:bg-blue-100
            transition-all duration-150
            ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
          `}
        >
          <div className="font-bold text-sm text-gray-900">{attack.name}</div>
          <div className="text-xs text-gray-600">Poder: {attack.power}</div>
        </button>
      ))}
    </div>
  );
}
