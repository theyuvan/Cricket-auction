# Cricket Auction System Backend

This backend implements a complete real-time auction system with host-controlled player auctions, WebSocket-based bidding, and automated scoring.

## Architecture Overview

```
backend/
├── server.ts              # Main server with Express & WebSocket
├── types/
│   └── index.ts          # TypeScript interfaces and types
├── services/
│   ├── auctionService.ts # Auction creation & management
│   ├── playerService.ts  # Player data from Supabase
│   ├── biddingService.ts # Real-time bidding logic
│   └── scoringService.ts # Score calculation engine
├── routes/
│   └── api.ts            # REST API endpoints
└── utils/
    └── codeGenerator.ts  # Auction code generation
```

## Features

### 1. **Auction Management**
- Host creates auction with unique 6-character code
- Teams join using auction code (no authentication required)
- In-memory auction rooms with persistent Supabase storage
- Status tracking: `waiting` → `live` → `completed`

### 2. **Real-Time Bidding**
- WebSocket-based communication for instant updates
- Host controls player selection and auction flow
- Automatic bid validation (balance, minimum increment)
- Current bid tracking with team identification

### 3. **Player Management**
- Role-based player stats (batsman, bowler, wicketkeeper, allrounder)
- Host-only access to player database
- Automatic role count tracking per team
- Sold player records with price history

### 4. **Scoring System**
- Customizable formulas per player role
- Automatic disqualification for teams with <15 players
- Real-time score calculation from player stats
- Final scoreboard with rankings and breakdowns

## API Endpoints

### Auction Routes
```
POST   /api/auctions/create              Create new auction
POST   /api/auctions/join                Join as team
POST   /api/auctions/start               Start auction (host)
GET    /api/auctions/:code               Get auction details
GET    /api/auctions/:code/teams         Get all teams
GET    /api/auctions/:code/state         Get current state
```

### Player Routes
```
GET    /api/players                      Get all players (host)
GET    /api/players/:id                  Get single player
GET    /api/auctions/:code/available-players  Get unsold players
POST   /api/auctions/:code/sell-player   Mark player as sold
```

### Bidding Routes
```
POST   /api/auctions/:code/set-player    Set current player (host)
POST   /api/auctions/:code/bid           Place bid
```

### Scoring Routes
```
POST   /api/auctions/:code/scoring-formulas    Set formulas (host)
POST   /api/auctions/:code/calculate-scores    Calculate final scores
```

## WebSocket Events

### Client → Server
```javascript
{ type: 'join_auction', payload: { auction_code } }
{ type: 'bid', payload: { team_id, team_name, amount } }
{ type: 'set_player', payload: { player, base_price } }
{ type: 'player_sold', payload: { player, team_id, team_name, sold_price } }
{ type: 'player_unsold', payload: {} }
{ type: 'show_scoreboard', payload: { scoreboard } }
{ type: 'update_teams', payload: {} }
```

### Server → Client
```javascript
{ type: 'joined', payload: { auction_code } }
{ type: 'new_bid', payload: { team_id, team_name, amount } }
{ type: 'player_auction', payload: { player, base_price } }
{ type: 'player_sold', payload: { player, team_id, team_name, sold_price } }
{ type: 'player_unsold', payload: {} }
{ type: 'teams_update', payload: { teams } }
{ type: 'show_scoreboard', payload: { scoreboard } }
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create `.env` file:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key
PORT=3000
```

### 3. Database Setup
Run the provided SQL schema in Supabase to create tables:
- `players` - Player data with role-based stats
- `auctions` - Auction configuration
- `teams` - Team details and balances
- `sold_players` - Auction results
- `final_scores` - Calculated scores

### 4. Run Backend Server
```bash
# Development mode (auto-reload)
npm run server

# Production mode
npm run server:prod
```

### 5. Run Frontend
```bash
npm run dev
```

## Usage Flow

### Host Workflow
1. Create auction → Get auction code
2. Share code with teams
3. Wait for teams to join
4. Start auction
5. For each player:
   - Select player → Set base price
   - Monitor bids in real-time
   - Mark as sold/unsold
6. Set scoring formulas
7. Calculate final scores
8. Display scoreboard

### Team Workflow
1. Join auction using code
2. Wait in lobby
3. During auction:
   - View current player
   - Place bids if interested
   - Monitor team balance
4. View final scoreboard

## Key Implementation Details

### In-Memory State
- Auction rooms stored in `Map<auction_code, AuctionRoom>`
- Real-time updates without database queries
- Periodic sync to Supabase for persistence

### Validation Rules
- Minimum bid increment: 100
- Team balance validation before bid
- 15-player minimum for qualification
- One active player at a time

### Scoring Formula Example
```javascript
{
  batsman: {
    runs_multiplier: 0.1,
    highest_score_multiplier: 0.5,
    strike_rate_multiplier: 0.2,
    average_multiplier: 0.3
  },
  // ... other roles
}
```

## Frontend Integration

Use the provided React hook:

```typescript
import { useAuctionWebSocket } from '@/hooks/useAuctionWebSocket';

const { isConnected, placeBid, setPlayer } = useAuctionWebSocket({
  auctionCode: 'ABC123',
  onBid: (data) => console.log('New bid:', data),
  onPlayerSold: (data) => console.log('Player sold:', data),
});
```

## Security Notes

- No authentication required (by design)
- Teams cannot access player database directly
- Host controls all auction flow
- WebSocket connections isolated per auction
- Balance validation prevents overspending

## Performance Considerations

- In-memory operations for real-time speed
- Database writes only for persistence
- WebSocket broadcast to specific auction rooms
- Automatic cleanup of closed connections

## Future Enhancements

- Add authentication for hosts
- Implement auction replay feature
- Add chat functionality
- Export scoreboard as PDF
- Admin dashboard for managing players
