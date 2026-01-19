# Multiplayer Battle System Implementation Plan

## Overview

Add real-time PvP (Player vs Player) battles with random matchmaking using Supabase Realtime.

## User Flow

```
Select "Battle Player" → Pick Pokemon → Join Queue → "Waiting for opponent..."
→ Match Found → Battle Starts → Take Turns → Battle Ends → Results Saved
```

---

## 1. Database Schema

### New Table: `matchmaking_queue`

Holds players waiting to be matched with opponents.

```sql
CREATE TABLE matchmaking_queue (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  username TEXT NOT NULL,
  pokemon_id INTEGER NOT NULL,
  pokemon_name TEXT NOT NULL,
  status TEXT DEFAULT 'waiting' CHECK (status IN ('waiting', 'matched', 'cancelled')),
  matched_with_user_id TEXT,
  battle_id UUID,
  joined_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_queue_waiting ON matchmaking_queue(status) WHERE status = 'waiting';

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE matchmaking_queue;
```

### Add Columns to `battles` Table

```sql
ALTER TABLE battles ADD COLUMN IF NOT EXISTS battle_mode TEXT DEFAULT 'ai';
ALTER TABLE battles ADD COLUMN IF NOT EXISTS current_turn TEXT;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_current_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_current_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_max_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_max_hp INTEGER;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player1_pokemon_data JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS player2_pokemon_data JSONB;
ALTER TABLE battles ADD COLUMN IF NOT EXISTS last_action JSONB;

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE battles;
```

---

## 2. How Supabase Realtime Works

Supabase Realtime uses WebSockets to push database changes to connected clients instantly.

### Architecture

```
┌─────────────┐     WebSocket      ┌─────────────┐
│   Browser   │◄──────────────────►│  Supabase   │
│  (Client)   │                    │  Realtime   │
└─────────────┘                    └──────┬──────┘
                                          │ listens to
                                   ┌──────▼──────┐
                                   │  PostgreSQL │
                                   │   Database  │
                                   └─────────────┘
```

### Client Subscription Example

```javascript
const supabase = createClient(url, anonKey);

// Subscribe to changes on the matchmaking_queue table
const channel = supabase
  .channel('matchmaking')
  .on(
    'postgres_changes',
    {
      event: 'UPDATE',
      schema: 'public',
      table: 'matchmaking_queue',
      filter: `user_id=eq.${myUserId}`,
    },
    (payload) => {
      if (payload.new.status === 'matched') {
        goToBattle(payload.new.battle_id);
      }
    }
  )
  .subscribe();
```

### For Multiplayer Battles

**Matchmaking:**
1. Player 1 joins queue → inserts row with `status: 'waiting'`
2. Player 1 subscribes to their row via WebSocket
3. Player 2 joins → server finds Player 1, creates battle, updates both rows to `status: 'matched'`
4. Both receive update instantly → redirect to battle

**During Battle:**
1. Both players subscribe to `battles` table for their `battle_id`
2. Player 1 attacks → server updates HP, sets `current_turn: 'player2'`
3. Player 2 receives update instantly → sees damage, knows it's their turn
4. Repeat until battle ends

---

## 3. New Files to Create

| File | Purpose |
|------|---------|
| `app/lib/supabaseClient.js` | Client-side Supabase for Realtime subscriptions |
| `app/api/matchmaking/route.js` | Join/leave queue, match players |
| `app/api/pvp-battle/route.js` | PvP attack/forfeit actions |
| `app/components/BattleModeSelector.jsx` | Choose "Battle AI" vs "Battle Player" |
| `app/components/WaitingLobby.jsx` | Queue waiting screen with cancel button |
| `app/components/PvPBattle.jsx` | Real-time PvP battle component |

---

## 4. Files to Modify

| File | Changes |
|------|---------|
| `app/components/BattleStarter.jsx` | Add mode selection, integrate waiting lobby and PvP battle |

---

## 5. API Endpoints

### POST `/api/matchmaking`

**Actions:**
- `join` - Add player to queue, try to find match
- `leave` - Remove player from queue
- `check` - Check if player has been matched

**Join Flow:**
1. Check if user already in queue
2. Look for another waiting player
3. If found: create battle, update both queue entries to `matched`
4. If not found: insert with `status: 'waiting'`

### POST `/api/pvp-battle`

**Actions:**
- `attack` - Submit attack (validates it's player's turn)
- `forfeit` - Surrender the battle

**Attack Flow:**
1. Fetch battle from DB
2. Verify it's this player's turn
3. Calculate damage, update HP
4. Switch `current_turn` to opponent
5. Check for battle end
6. Save to DB (triggers Realtime update to opponent)

---

## 6. Implementation Order

1. **Database** - Run SQL migrations in Supabase dashboard
2. **Supabase Client** - Create `app/lib/supabaseClient.js`
3. **Matchmaking API** - Create `app/api/matchmaking/route.js`
4. **PvP Battle API** - Create `app/api/pvp-battle/route.js`
5. **UI Components** - Create mode selector, waiting lobby, PvP battle
6. **Integration** - Update `BattleStarter.jsx` to wire everything together

---

## 7. Environment Variables Required

Add to `.env`:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
```

Note: `NEXT_PUBLIC_` prefix makes these available in the browser (required for Realtime).

---

## 8. Verification Steps

1. Open two browser windows with different logged-in users
2. Both select "Battle Player" mode
3. Both select a Pokemon and click to join queue
4. Verify both show "Waiting for opponent..."
5. When matched, both should redirect to battle automatically
6. Take turns attacking - verify opponent sees updates instantly
7. Complete battle - verify winner/loser shown correctly
8. Check Supabase `battles` table for correct record

---

## 9. Future Enhancements

- Turn timer with auto-forfeit on timeout
- Skill-based matchmaking using ELO rating
- Private lobbies with invite codes
- Spectator mode
- Battle replay from `battle_turns` table
