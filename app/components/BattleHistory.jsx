'use client';

import { useState, useEffect } from 'react';

/**
 * Componente para mostrar el historial de batallas guardadas en Supabase
 */
export default function BattleHistory() {
  const [battles, setBattles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchBattles();
  }, []);

  const fetchBattles = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/battles?limit=20');
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al cargar batallas');
      }

      setBattles(data.battles || []);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching battles:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = dateString => {
    const date = new Date(dateString);
    return date.toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getWinnerBadge = winner => {
    if (winner === 'player') {
      return (
        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs font-semibold">
          Victoria
        </span>
      );
    } else if (winner === 'opponent') {
      return (
        <span className="px-2 py-1 bg-red-100 text-red-800 rounded text-xs font-semibold">
          Derrota
        </span>
      );
    }
    return (
      <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs font-semibold">
        Empate
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-500 rounded-lg p-4 text-center">
        <p className="text-red-600 font-bold mb-2">Error</p>
        <p className="text-gray-700">{error}</p>
        <button
          onClick={fetchBattles}
          className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (battles.length === 0) {
    return (
      <div className="text-center py-12 bg-gray-50 rounded-lg">
        <p className="text-gray-600">No hay batallas registradas aún.</p>
        <p className="text-sm text-gray-500 mt-2">
          ¡Comienza una batalla para ver tu historial aquí!
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Historial de Batallas
        </h2>
        <button
          onClick={fetchBattles}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors text-sm"
        >
          Actualizar
        </button>
      </div>

      <div className="space-y-4">
        {battles.map(battle => (
          <div
            key={battle.id}
            className="border-2 border-gray-200 rounded-lg p-4 hover:border-blue-400 transition-colors"
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className="font-semibold text-gray-800 capitalize">
                    {battle.player_pokemon_name}
                  </span>
                  <span className="text-gray-500">vs</span>
                  <span className="font-semibold text-gray-800 capitalize">
                    {battle.opponent_pokemon_name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(battle.created_at)}
                  </span>
                  {getWinnerBadge(battle.winner)}
                </div>
              </div>
            </div>
            {battle.log?.messages && (
              <details className="mt-2">
                <summary className="text-sm text-gray-600 cursor-pointer hover:text-gray-800">
                  Ver detalles del combate
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded text-sm text-gray-700 max-h-40 overflow-y-auto">
                  {battle.log.messages.map((msg, idx) => (
                    <p key={idx}>{msg}</p>
                  ))}
                </div>
              </details>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
