'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { getSupabase } from '../lib/supabaseClient';
import BattleHPBar from './BattleHPBar';
import BattleMessages from './BattleMessages';
import BattleActions from './BattleActions';

/**
 * Batalla PvP en tiempo real.
 * Recibe battleId; determina si el usuario es player1 o player2 y se suscribe a battles.
 */
export default function PvPBattle({ battleId, onBattleEnd }) {
  const { userId } = useAuth();
  const [battle, setBattle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isAttacking, setIsAttacking] = useState(false);
  const channelRef = useRef(null);

  useEffect(() => {
    if (!battleId || !userId) return;

    const supabase = getSupabase();
    if (!supabase) {
      setError('Supabase no configurado');
      setLoading(false);
      return;
    }

    const fetchBattle = async () => {
      const { data, err } = await supabase
        .from('battles')
        .select('*')
        .eq('id', battleId)
        .single();
      if (err || !data) {
        setError('Batalla no encontrada');
        setLoading(false);
        return;
      }
      setBattle(data);
      setLoading(false);
    };

    fetchBattle();

    const channel = supabase
      .channel(`pvp-battle-${battleId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'battles',
          filter: `id=eq.${battleId}`,
        },
        payload => {
          if (payload?.new) setBattle(payload.new);
        }
      )
      .subscribe();

    channelRef.current = channel;
    return () => {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    };
  }, [battleId, userId]);

  const mySide =
    battle && userId
      ? battle.player1_user_id === userId
        ? 'player1'
        : battle.player2_user_id === userId
          ? 'player2'
          : null
      : null;

  const buildPlayerFromData = (pData, currentHp, maxHp) => {
    if (!pData)
      return { pokemon: { name: '?' }, currentHP: 0, maxHP: 1, attacks: [] };
    return {
      pokemon: {
        name: pData.name,
        sprites: {
          front_default: pData.sprite_front,
          back_default: pData.sprite_back,
        },
      },
      currentHP: currentHp ?? 0,
      maxHP: maxHp ?? pData.hp ?? 1,
      attacks: Array.isArray(pData.attacks) ? pData.attacks : [],
    };
  };

  const isMyTurn =
    battle?.status === 'active' && mySide && battle.current_turn === mySide;

  const player =
    battle && mySide
      ? mySide === 'player1'
        ? buildPlayerFromData(
            battle.player1_pokemon_data,
            battle.player1_current_hp,
            battle.player1_max_hp
          )
        : buildPlayerFromData(
            battle.player2_pokemon_data,
            battle.player2_current_hp,
            battle.player2_max_hp
          )
      : null;

  const opponent =
    battle && mySide
      ? mySide === 'player1'
        ? buildPlayerFromData(
            battle.player2_pokemon_data,
            battle.player2_current_hp,
            battle.player2_max_hp
          )
        : buildPlayerFromData(
            battle.player1_pokemon_data,
            battle.player1_current_hp,
            battle.player1_max_hp
          )
      : null;

  const handleAttack = async attackId => {
    if (!isMyTurn || isAttacking || battle?.status !== 'active') return;
    try {
      setIsAttacking(true);
      const res = await fetch('/api/pvp-battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'attack', battleId, attackId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al atacar');
      if (data.status && data.status !== 'active') {
        setBattle(prev => (prev ? { ...prev, status: data.status } : null));
        if (onBattleEnd) setTimeout(() => onBattleEnd(data.status), 2000);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsAttacking(false);
    }
  };

  const handleForfeit = async () => {
    try {
      await fetch('/api/pvp-battle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'forfeit', battleId }),
      });
      if (onBattleEnd) onBattleEnd('forfeit');
    } catch (err) {
      console.error('Error forfeit:', err);
    }
  };

  const lastAction = battle?.last_action;
  const messages = [];
  if (lastAction?.type === 'attack') {
    messages.push(
      `${lastAction.attackName || 'Ataque'} - ${lastAction.damage ?? 0} de daño`
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (error && !battle) {
    return (
      <div className="text-center py-8">
        <p className="text-red-600 font-semibold mb-4">{error}</p>
        {onBattleEnd && (
          <button
            type="button"
            onClick={() => onBattleEnd('error')}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg"
          >
            Volver
          </button>
        )}
      </div>
    );
  }

  if (!battle || !player || !opponent) return null;

  const isBattleActive = battle.status === 'active';
  const iWon =
    (battle.status === 'player1_won' && mySide === 'player1') ||
    (battle.status === 'player2_won' && mySide === 'player2');

  return (
    <div className="w-full max-w-4xl mx-auto bg-gradient-to-b from-blue-200 to-green-200 min-h-screen p-4">
      <div className="mb-4 flex justify-between items-center">
        <Link
          href="/battle"
          className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 font-semibold"
        >
          ← Volver
        </Link>
        {isBattleActive && (
          <button
            onClick={handleForfeit}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 font-semibold"
          >
            Rendirse
          </button>
        )}
      </div>

      <div className="bg-white border-4 border-gray-900 rounded-lg p-6 mb-4">
        <div className="flex justify-end items-start mb-8">
          <div className="text-right mr-4">
            <BattleHPBar
              pokemon={opponent.pokemon}
              currentHP={opponent.currentHP}
              maxHP={opponent.maxHP}
              isPlayer={false}
            />
          </div>
          <div className="relative w-48 h-48">
            {opponent.pokemon?.sprites?.front_default && (
              <Image
                src={opponent.pokemon.sprites.front_default}
                alt={opponent.pokemon.name}
                fill
                className="object-contain"
                unoptimized
              />
            )}
          </div>
        </div>

        <div className="flex justify-start items-start">
          <div className="relative w-48 h-48">
            {player.pokemon?.sprites?.back_default ? (
              <Image
                src={player.pokemon.sprites.back_default}
                alt={player.pokemon.name}
                fill
                className="object-contain"
                unoptimized
              />
            ) : (
              player.pokemon?.sprites?.front_default && (
                <Image
                  src={player.pokemon.sprites.front_default}
                  alt={player.pokemon.name}
                  fill
                  className="object-contain scale-x-[-1]"
                  unoptimized
                />
              )
            )}
          </div>
          <div className="text-left ml-4">
            <BattleHPBar
              pokemon={player.pokemon}
              currentHP={player.currentHP}
              maxHP={player.maxHP}
              isPlayer={true}
            />
          </div>
        </div>
      </div>

      {messages.length > 0 && (
        <div className="mb-4">
          <BattleMessages messages={messages} />
        </div>
      )}

      {isBattleActive && (
        <div className="bg-white border-4 border-gray-900 rounded-lg p-4">
          <h3 className="text-lg font-bold mb-3 text-gray-800">
            {isMyTurn
              ? `¿Qué debería hacer ${player.pokemon?.name}?`
              : 'Esperando al rival...'}
          </h3>
          <BattleActions
            attacks={player.attacks}
            onSelectAttack={handleAttack}
            disabled={!isMyTurn || isAttacking}
          />
        </div>
      )}

      {!isBattleActive && (
        <div
          className={`bg-white border-4 border-gray-900 rounded-lg p-6 text-center ${
            iWon ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <h2 className="text-2xl font-bold mb-4 text-black">
            {iWon ? '¡Victoria!' : 'Derrota'}
          </h2>
          <p className="text-lg mb-4 text-black">
            {iWon ? '¡Has ganado el combate!' : 'Has perdido el combate...'}
          </p>
          {onBattleEnd && (
            <button
              onClick={() => onBattleEnd(battle.status)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold"
            >
              Volver
            </button>
          )}
        </div>
      )}
    </div>
  );
}
