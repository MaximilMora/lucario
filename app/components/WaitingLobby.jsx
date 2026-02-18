'use client';

import { useEffect, useRef, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import { getSupabase } from '../lib/supabaseClient';

/**
 * Lobby de espera para matchmaking PvP.
 * Al montar: join a la cola y suscripción Realtime a matchmaking_queue.
 * Si llega matched + battle_id, llama onMatched(battleId).
 */
export default function WaitingLobby({
  pokemonId,
  pokemonName,
  onMatched,
  onCancel,
}) {
  const { userId } = useAuth();
  const [joining, setJoining] = useState(true);
  const [error, setError] = useState(null);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!userId || (pokemonId == null && !pokemonName)) return;

    let cancelled = false;

    const run = async () => {
      try {
        const res = await fetch('/api/matchmaking', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'join',
            pokemonId: pokemonId ?? undefined,
            pokemonName: pokemonName || undefined,
          }),
        });
        const data = await res.json();

        if (cancelled) return;

        if (!res.ok) {
          setError(data.error || 'Error al unirse a la cola');
          setJoining(false);
          return;
        }

        if (data.matched && data.battleId) {
          onMatched(data.battleId);
          return;
        }

        setJoining(false);

        const supabase = getSupabase();
        if (!supabase) {
          setError('Supabase no configurado para Realtime');
          return;
        }

        const channel = supabase
          .channel(`matchmaking-${userId}`)
          .on(
            'postgres_changes',
            {
              event: 'UPDATE',
              schema: 'public',
              table: 'matchmaking_queue',
              filter: `user_id=eq.${userId}`,
            },
            payload => {
              const row = payload?.new;
              if (row?.status === 'matched' && row?.battle_id && !cancelled) {
                onMatched(row.battle_id);
              }
            }
          )
          .subscribe();

        channelRef.current = channel;
      } catch (err) {
        if (!cancelled) {
          setError(err.message || 'Error al unirse a la cola');
          setJoining(false);
        }
      }
    };

    run();
    return () => {
      cancelled = true;
      if (channelRef.current) {
        const supabase = getSupabase();
        if (supabase) supabase.removeChannel(channelRef.current);
        channelRef.current = null;
      }
    };
  }, [userId, pokemonId, pokemonName, onMatched]);

  const handleLeave = async () => {
    try {
      await fetch('/api/matchmaking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'leave' }),
      });
    } catch (e) {
      console.error('Error leaving queue:', e);
    }
    if (channelRef.current) {
      const supabase = getSupabase();
      if (supabase) supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
    onCancel();
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
        >
          Volver
        </button>
      </div>
    );
  }

  return (
    <div className="text-center py-8">
      {joining ? (
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
      ) : null}
      <p className="text-lg font-semibold text-gray-800 mb-6">
        {joining ? 'Uniendo a la cola...' : 'Esperando rival...'}
      </p>
      <button
        type="button"
        onClick={handleLeave}
        disabled={joining}
        className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 disabled:opacity-50 font-semibold"
      >
        Cancelar
      </button>
    </div>
  );
}
