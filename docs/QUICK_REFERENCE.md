# 🎯 Quick Reference - Cricket Auction System

## 🚀 Start Commands

```bash
# Install dependencies
npm install

# Start backend server (Terminal 1)
npm run server

# Start frontend dev server (Terminal 2)
npm run dev

# Open browser
http://localhost:8080
```

---

## 📡 API Quick Reference

### Base URL
```
http://localhost:3000/api
```

### Auction Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auctions/create` | Create new auction |
| POST | `/auctions/join` | Join as team |
| POST | `/auctions/start` | Start auction |
| GET | `/auctions/:code` | Get auction info |
| GET | `/auctions/:code/teams` | Get all teams |

### Player Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/players` | Get all players |
| GET | `/auctions/:code/available-players` | Get unsold players |
| POST | `/auctions/:code/set-player` | Set current player |
| POST | `/auctions/:code/sell-player` | Mark as sold |

### Bidding Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auctions/:code/bid` | Place bid |

### Scoring Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/auctions/:code/scoring-formulas` | Set formulas |
| POST | `/auctions/:code/calculate-scores` | Calculate scores |

---

## 🔌 WebSocket Events

### Client → Server

```javascript
// Join auction room
{ type: 'join_auction', payload: { auction_code: 'ABC123' } }

// Place bid
{ type: 'bid', payload: { team_id: 1, team_name: 'Team A', amount: 5000 } }

// Set player (host)
{ type: 'set_player', payload: { player: {...}, base_price: 1000 } }

// Mark sold (host)
{ type: 'player_sold', payload: { player, team_id, team_name, sold_price } }

// Mark unsold (host)
{ type: 'player_unsold', payload: {} }

// Show scoreboard (host)
{ type: 'show_scoreboard', payload: { scoreboard: [...] } }
```

### Server → Client

```javascript
// Joined confirmation
{ type: 'joined', payload: { auction_code } }

// New bid broadcast
{ type: 'new_bid', payload: { team_id, team_name, amount } }

// Player on auction
{ type: 'player_auction', payload: { player, base_price } }

// Player sold
{ type: 'player_sold', payload: { player, team_id, team_name, sold_price } }

// Player unsold
{ type: 'player_unsold', payload: {} }

// Teams updated
{ type: 'teams_update', payload: { teams: [...] } }

// Final scoreboard
{ type: 'show_scoreboard', payload: { scoreboard: [...] } }
```

---

## 🎨 WebSocket Hook Usage

### Import
```typescript
import { useAuctionWebSocket } from '@/hooks/useAuctionWebSocket';
```

### Host Example
```typescript
const { 
  isConnected, 
  setPlayer, 
  markPlayerSold, 
  markPlayerUnsold,
  showScoreboard 
} = useAuctionWebSocket({
  auctionCode: 'ABC123',
  
  onJoined: () => console.log('Connected'),
  onBid: (data) => console.log('New bid:', data),
  onTeamsUpdate: (data) => setTeams(data.teams),
});

// Use in handlers
setPlayer(player, 1000);
markPlayerSold(player, teamId, teamName, price);
```

### Team Example
```typescript
const { 
  isConnected, 
  placeBid 
} = useAuctionWebSocket({
  auctionCode: 'ABC123',
  
  onPlayerAuction: (data) => setCurrentPlayer(data.player),
  onBid: (data) => setCurrentBid(data),
  onPlayerSold: (data) => {
    if (data.team_id === myTeamId) {
      toast.success('You won!');
    }
  },
});

// Place bid
placeBid(teamId, teamName, amount);
```

---

## 🗄️ Database Tables

### Players
```typescript
{
  id: number
  name: string
  role: 'batsman' | 'bowler' | 'wicketkeeper' | 'allrounder'
  stats: {
    // Batsman: runs, highest_score, strike_rate, average
    // Bowler: wickets, catches, runout, economy
    // Wicketkeeper: runs, highest_score, strike_rate, stumpings, catches
    // Allrounder: runs, highest_score, strike_rate, wickets
  }
}
```

### Auctions
```typescript
{
  id: number
  auction_code: string
  name: string | null
  host_name: string
  starting_balance: number
  max_teams: number
  status: 'waiting' | 'live' | 'completed'
}
```

### Teams
```typescript
{
  id: number
  auction_id: number
  team_name: string
  logo_url: string | null
  balance: number
  player_count: number
  role_count: { batsman, bowler, allrounder, wicketkeeper }
  status: 'active' | 'disqualified'
}
```

---

## 🎯 Common Flows

### Host Creates Auction
```typescript
// 1. Create auction
POST /api/auctions/create
{ host_name, auction_name, starting_balance, max_teams }
→ Returns: { auction_code, auction_id }

// 2. Connect WebSocket
ws.send({ type: 'join_auction', payload: { auction_code } })

// 3. Wait for teams
GET /api/auctions/:code/teams

// 4. Start auction
POST /api/auctions/:code/start

// 5. Select player
POST /api/auctions/:code/set-player
ws.send({ type: 'set_player', payload: { player, base_price } })

// 6. Mark sold
POST /api/auctions/:code/sell-player
ws.send({ type: 'player_sold', payload: { ... } })

// 7. Calculate scores
POST /api/auctions/:code/calculate-scores
ws.send({ type: 'show_scoreboard', payload: { scoreboard } })
```

### Team Joins Auction
```typescript
// 1. Join auction
POST /api/auctions/join
{ auction_code, team_name, logo_url }
→ Returns: { team_id, auction_id }

// 2. Connect WebSocket
ws.send({ type: 'join_auction', payload: { auction_code } })

// 3. Place bid
POST /api/auctions/:code/bid
{ team_id, amount }
ws.send({ type: 'bid', payload: { team_id, team_name, amount } })
```

---

## 🧪 Test Data

### Sample Player (Batsman)
```json
{
  "name": "Virat Kohli",
  "role": "batsman",
  "stats": {
    "runs": 12000,
    "highest_score": 183,
    "strike_rate": 92,
    "average": 57
  }
}
```

### Sample Scoring Formula
```json
{
  "batsman": {
    "runs_multiplier": 0.1,
    "highest_score_multiplier": 0.5,
    "strike_rate_multiplier": 0.2,
    "average_multiplier": 0.3
  },
  "bowler": {
    "wickets_multiplier": 10,
    "catches_multiplier": 5,
    "runout_multiplier": 8,
    "economy_multiplier": -2
  },
  "wicketkeeper": {
    "runs_multiplier": 0.1,
    "highest_score_multiplier": 0.5,
    "strike_rate_multiplier": 0.2,
    "stumpings_multiplier": 15,
    "catches_multiplier": 10
  },
  "allrounder": {
    "runs_multiplier": 0.1,
    "highest_score_multiplier": 0.5,
    "strike_rate_multiplier": 0.2,
    "wickets_multiplier": 10
  }
}
```

---

## 🔧 Environment Variables

```env
# Supabase
VITE_SUPABASE_URL=https://xxx.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJxxx...

# Backend
PORT=3000

# Frontend (for production)
VITE_API_URL=https://your-backend.com
VITE_WS_URL=wss://your-backend.com
```

---

## 🐛 Common Issues

### Port in Use
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill
```

### WebSocket Not Connecting
1. Check backend is running
2. Verify port 3000 is accessible
3. Check browser console for errors

### Supabase Errors
1. Verify `.env` has correct credentials
2. Check database tables exist
3. Run `schema.sql` if missing tables

---

## 📚 File Locations

| File | Purpose |
|------|---------|
| `backend/server.ts` | Main server |
| `backend/services/` | Business logic |
| `src/hooks/useAuctionWebSocket.ts` | WebSocket hook |
| `src/pages/host/` | Host pages |
| `src/pages/team/` | Team pages |
| `supabase/schema.sql` | Database schema |

---

## 🎓 Learn More

- **Full Setup**: [SETUP.md](../SETUP.md)
- **API Docs**: [backend/README.md](../backend/README.md)
- **Integration**: [docs/INTEGRATION_CHECKLIST.md](INTEGRATION_CHECKLIST.md)
- **Examples**: [src/examples/](../src/examples/)

---

**Pro Tip**: Keep this reference open while developing! 🚀
