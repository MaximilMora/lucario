'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useAuth } from '@clerk/nextjs';
import { getSupabase } from '../lib/supabaseClient';
import BattleHPBar from './BattleHPBar';
import BattleMessages from './BattleMessages';
import BattleActions from './BattleActions';
import BattleTurnTimer from './BattleTurnTimer';

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
  const [timerKey, setTimerKey] = useState(0);
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

  const handleAttack = useCallback(
    async attackId => {
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
        setTimerKey(k => k + 1);
        if (data.status && data.status !== 'active') {
          setBattle(prev => (prev ? { ...prev, status: data.status } : null));
          if (onBattleEnd) setTimeout(() => onBattleEnd(data.status), 2000);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setIsAttacking(false);
      }
    },
    [isMyTurn, isAttacking, battle, battleId, onBattleEnd]
  );

  const handleTimerExpire = useCallback(() => {
    if (!isMyTurn || isAttacking || !battle || !mySide) return;
    const pokemonData =
      mySide === 'player1'
        ? battle.player1_pokemon_data
        : battle.player2_pokemon_data;
    const attacks = pokemonData?.attacks;
    if (!attacks?.length) return;
    const randomAttack = attacks[Math.floor(Math.random() * attacks.length)];
    handleAttack(randomAttack.id);
  }, [isMyTurn, isAttacking, battle, mySide, handleAttack]);

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        <p className="ml-4 text-gray-600">Cargando batalla...</p>
      </div>
    );
  }

  if (error && !battle) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="text-center bg-white rounded-xl shadow-md p-6 max-w-md">
          <p className="text-red-600 font-semibold mb-4">{error}</p>
          {onBattleEnd && (
            <button
              type="button"
              onClick={() => onBattleEnd('error')}
              className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
            >
              Volver
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!battle || !player || !opponent) return null;

  const isBattleActive = battle.status === 'active';
  const iWon =
    (battle.status === 'player1_won' && mySide === 'player1') ||
    (battle.status === 'player2_won' && mySide === 'player2');

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="p-8 max-w-6xl mx-auto">
        <div className="mb-4 flex justify-between items-center">
          <Link
            href="/battle"
            className="inline-block px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            ← Volver
          </Link>
          {isBattleActive && (
            <button
              onClick={handleForfeit}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
            >
              Rendirse
            </button>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-md p-6 mb-4">
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
          <div className="bg-white rounded-xl shadow-md p-4">
            {isMyTurn && (
              <div className="mb-3">
                <BattleTurnTimer
                  key={timerKey}
                  active={isMyTurn && !isAttacking}
                  onExpire={handleTimerExpire}
                />
              </div>
            )}
            <h3 className="text-lg font-bold mb-3 text-gray-900">
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
            className={`bg-white rounded-xl shadow-md p-6 text-center ${
              iWon ? 'ring-2 ring-green-500' : 'ring-2 ring-red-500'
            }`}
          >
            <h2 className="text-2xl font-bold mb-4 text-gray-900">
              {iWon ? '¡Victoria!' : 'Derrota'}
            </h2>
            <p className="text-lg mb-4 text-gray-600">
              {iWon ? '¡Has ganado el combate!' : 'Has perdido el combate...'}
            </p>
            {onBattleEnd && (
              <button
                onClick={() => onBattleEnd(battle.status)}
                className="px-6 py-3 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-semibold"
              >
                Volver
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
