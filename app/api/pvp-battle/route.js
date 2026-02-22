import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { supabaseServer as supabase } from '../../lib/supabaseServerClient';
import {
  calculateDamage,
  getEffectivenessMessage,
} from '../../utils/battleCalculations';

/** Obtiene la batalla por id; debe ser PvP y estar activa para atacar. */
async function getPvPBattle(battleId) {
  const { data, error } = await supabase
    .from('battles')
    .select('*')
    .eq('id', battleId)
    .single();
  if (error || !data) return null;
  if (data.battle_mode !== 'pvp') return null;
  return data;
}

/** Actualiza stats de usuario (ganar/perder) igual que en /api/battle */
async function updateUserStats(userId, result) {
  const { data: existing } = await supabase
    .from('user_battle_stats')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  const isWin = result === 'win';
  const nowIso = new Date().toISOString();

  if (existing) {
    const newWinStreak = isWin ? (existing.current_win_streak || 0) + 1 : 0;
    const newBestStreak = Math.max(existing.best_win_streak || 0, newWinStreak);
    await supabase
      .from('user_battle_stats')
      .update({
        total_battles: (existing.total_battles || 0) + 1,
        wins: (existing.wins || 0) + (isWin ? 1 : 0),
        losses: (existing.losses || 0) + (isWin ? 0 : 1),
        current_win_streak: newWinStreak,
        best_win_streak: newBestStreak,
        last_battle_at: nowIso,
        updated_at: nowIso,
      })
      .eq('user_id', userId);
  } else {
    await supabase.from('user_battle_stats').insert({
      user_id: userId,
      total_battles: 1,
      wins: isWin ? 1 : 0,
      losses: isWin ? 0 : 1,
      current_win_streak: isWin ? 1 : 0,
      best_win_streak: isWin ? 1 : 0,
      rating: 1000,
      peak_rating: 1000,
      first_battle_at: nowIso,
      last_battle_at: nowIso,
    });
  }
}

/**
 * POST /api/pvp-battle
 * Body: { action: 'attack' | 'forfeit', battleId, attackId? }
 */
export async function POST(request) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const action = body.action;
    const battleId = body.battleId;
    const attackId = body.attackId != null ? Number(body.attackId) : null;

    if (!battleId) {
      return NextResponse.json(
        { error: 'battleId is required' },
        { status: 400 }
      );
    }

    const battle = await getPvPBattle(battleId);
    if (!battle) {
      return NextResponse.json(
        { error: 'Battle not found or not PvP' },
        { status: 404 }
      );
    }

    const isPlayer1 = battle.player1_user_id === userId;
    const isPlayer2 = battle.player2_user_id === userId;
    if (!isPlayer1 && !isPlayer2) {
      return NextResponse.json({ error: 'Not a participant' }, { status: 403 });
    }

    if (battle.status !== 'active') {
      return NextResponse.json(
        { error: 'Battle is not active' },
        { status: 400 }
      );
    }

    if (action === 'forfeit') {
      const winnerSide = isPlayer1 ? 'player2' : 'player1';
      const winnerUserId =
        winnerSide === 'player1'
          ? battle.player1_user_id
          : battle.player2_user_id;
      const loserUserId =
        winnerSide === 'player1'
          ? battle.player2_user_id
          : battle.player1_user_id;

      await supabase
        .from('battles')
        .update({
          status: winnerSide === 'player1' ? 'player1_won' : 'player2_won',
          winner_user_id: winnerUserId,
          finished_at: new Date().toISOString(),
          last_action: {
            type: 'forfeit',
            forfeited_by: userId,
          },
        })
        .eq('id', battleId);

      if (winnerUserId && winnerUserId !== 'ai') {
        await updateUserStats(winnerUserId, 'win');
      }
      if (loserUserId && loserUserId !== 'ai') {
        await updateUserStats(loserUserId, 'loss');
      }

      return NextResponse.json({
        success: true,
        status: winnerSide === 'player1' ? 'player1_won' : 'player2_won',
        winnerSide,
      });
    }

    if (action === 'attack') {
      if (attackId == null) {
        return NextResponse.json(
          { error: 'attackId is required for attack' },
          { status: 400 }
        );
      }

      const currentTurn = battle.current_turn;
      if (
        (currentTurn === 'player1' && !isPlayer1) ||
        (currentTurn === 'player2' && !isPlayer2)
      ) {
        return NextResponse.json({ error: 'Not your turn' }, { status: 400 });
      }

      const p1Data = battle.player1_pokemon_data || {};
      const p2Data = battle.player2_pokemon_data || {};
      const attackerData = currentTurn === 'player1' ? p1Data : p2Data;
      const defenderData = currentTurn === 'player1' ? p2Data : p1Data;

      const attacks = Array.isArray(attackerData.attacks)
        ? attackerData.attacks
        : [];
      const selectedAttack = attacks.find(a => a.id === attackId);
      if (!selectedAttack) {
        return NextResponse.json({ error: 'Invalid attack' }, { status: 400 });
      }

      const attackerAttack = attackerData.attack ?? 50;
      const defenderDefense = defenderData.defense ?? 50;
      const defenderTypes = Array.isArray(defenderData.types)
        ? defenderData.types
        : [];
      const { damage, effectiveness } = calculateDamage(
        attackerAttack,
        defenderDefense,
        selectedAttack.power ?? 50,
        selectedAttack.type,
        defenderTypes
      );
      const effMsg = getEffectivenessMessage(effectiveness);

      let p1Hp = battle.player1_current_hp ?? 0;
      let p2Hp = battle.player2_current_hp ?? 0;

      if (currentTurn === 'player1') {
        p2Hp = Math.max(0, p2Hp - damage);
      } else {
        p1Hp = Math.max(0, p1Hp - damage);
      }

      const nextTurn = currentTurn === 'player1' ? 'player2' : 'player1';
      let newStatus = 'active';
      let winnerUserId = null;

      if (p1Hp <= 0 || p2Hp <= 0) {
        newStatus = p2Hp <= 0 ? 'player1_won' : 'player2_won';
        winnerUserId =
          newStatus === 'player1_won'
            ? battle.player1_user_id
            : battle.player2_user_id;
      }

      const lastAction = {
        type: 'attack',
        turn: currentTurn,
        attackId: selectedAttack.id,
        attackName: selectedAttack.name,
        effectiveness: String(effectiveness),
        effectivenessMessage: effMsg?.text ?? null,
        damage,
        targetHpAfter: currentTurn === 'player1' ? p2Hp : p1Hp,
      };

      const updatePayload = {
        player1_current_hp: p1Hp,
        player2_current_hp: p2Hp,
        current_turn: newStatus === 'active' ? nextTurn : null,
        last_action: lastAction,
        status: newStatus,
      };
      if (newStatus !== 'active') {
        updatePayload.winner_user_id = winnerUserId;
        updatePayload.finished_at = new Date().toISOString();
      }

      const { error: updateErr } = await supabase
        .from('battles')
        .update(updatePayload)
        .eq('id', battleId);

      if (updateErr) {
        console.error('PvP battle update error:', updateErr);
        return NextResponse.json(
          { error: 'Failed to update battle', details: updateErr.message },
          { status: 500 }
        );
      }

      if (newStatus !== 'active' && winnerUserId && winnerUserId !== 'ai') {
        const loserUserId =
          winnerUserId === battle.player1_user_id
            ? battle.player2_user_id
            : battle.player1_user_id;
        await updateUserStats(winnerUserId, 'win');
        if (loserUserId && loserUserId !== 'ai') {
          await updateUserStats(loserUserId, 'loss');
        }
      }

      return NextResponse.json({
        success: true,
        status: newStatus,
        player1_current_hp: p1Hp,
        player2_current_hp: p2Hp,
        current_turn: newStatus === 'active' ? nextTurn : null,
        last_action: lastAction,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err) {
    console.error('PvP battle error:', err);
    return NextResponse.json(
      { error: 'Internal server error', details: err.message },
      { status: 500 }
    );
  }
}
