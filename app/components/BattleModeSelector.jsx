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
        className="px-8 py-4 text-lg font-bold rounded-lg bg-blue-600 text-white hover:bg-blue-700 shadow-lg hover:shadow-xl transition-all"
      >
        Batalla vs AI
      </button>
      <button
        type="button"
        onClick={() => onSelect('pvp')}
        className="px-8 py-4 text-lg font-bold rounded-lg bg-purple-600 text-white hover:bg-purple-700 shadow-lg hover:shadow-xl transition-all"
      >
        Batalla vs Jugador
      </button>
    </div>
  );
}
