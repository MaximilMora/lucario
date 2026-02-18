'use client';

/**
 * Selector de modo de batalla: vs AI o vs Jugador.
 * Solo elección de modo; el flujo lo orquesta BattleStarter.
 */
export default function BattleModeSelector({ onSelect }) {
  return (
    <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-6">
      <button
        type="button"
        onClick={() => onSelect('ai')}
        className="px-6 py-3 text-lg font-semibold rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors shadow-md hover:shadow-lg"
      >
        Batalla vs AI
      </button>
      <button
        type="button"
        onClick={() => onSelect('pvp')}
        className="px-6 py-3 text-lg font-semibold rounded-lg bg-gray-600 text-white hover:bg-gray-700 transition-colors shadow-md hover:shadow-lg"
      >
        Batalla vs Jugador
      </button>
    </div>
  );
}
