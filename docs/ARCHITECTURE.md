# 🏗️ System Architecture - Cricket Auction System

## High-Level Architecture

```
┌───────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                           │
│                                                                │
│  ┌────────────────┐         ┌────────────────┐               │
│  │  Host Browser  │         │  Team Browser  │               │
│  │                │         │                │               │
│  │ • CreateAuction│         │ • JoinAuction  │               │
│  │ • HostLobby    │         │ • TeamLobby    │               │
│  │ • HostAuction  │         │ • TeamAuction  │               │
│  │ • Scoreboard   │         │ • Scoreboard   │               │
│  └────────┬───────┘         └────────┬───────┘               │
│           │                          │                        │
│           │   React 18 + TypeScript  │                        │
│           │   Tailwind + shadcn/ui   │                        │
└───────────┼──────────────────────────┼────────────────────────┘
            │                          │
            │  REST API (HTTP)         │  REST API (HTTP)
            │  WebSocket (WS)          │  WebSocket (WS)
            │                          │
┌───────────▼──────────────────────────▼────────────────────────┐
│                      APPLICATION LAYER                         │
│                                                                │
│              ┌─────────────────────────┐                      │
│              │    Express Server       │                      │
│              │    Port 3000            │                      │
│              └───────────┬─────────────┘                      │
│                          │                                     │
│        ┌─────────────────┴─────────────────┐                 │
│        │                                   │                 │
│    ┌───▼────┐                        ┌────▼─────┐           │
│    │  HTTP  │                        │ WebSocket│           │
│    │ Routes │                        │  Server  │           │
│    └───┬────┘                        └────┬─────┘           │
│        │                                  │                  │
│        │   REST Endpoints                 │ Real-time Events│
│        │                                  │                  │
│  ┌─────▼──────────────────────────────────▼─────────┐       │
│  │           SERVICE LAYER                           │       │
│  │                                                   │       │
│  │  ┌─────────────┐  ┌──────────────┐             │       │
│  │  │  Auction    │  │   Player     │             │       │
│  │  │  Service    │  │   Service    │             │       │
│  │  │             │  │              │             │       │
│  │  │ • Create    │  │ • Fetch      │             │       │
│  │  │ • Join      │  │ • Available  │             │       │
│  │  │ • Start     │  │ • Sell       │             │       │
│  │  └─────────────┘  └──────────────┘             │       │
│  │                                                   │       │
│  │  ┌─────────────┐  ┌──────────────┐             │       │
│  │  │  Bidding    │  │   Scoring    │             │       │
│  │  │  Service    │  │   Service    │             │       │
│  │  │             │  │              │             │       │
│  │  │ • Validate  │  │ • Calculate  │             │       │
│  │  │ • Track     │  │ • Formulas   │             │       │
│  │  │ • Broadcast │  │ • Rank       │             │       │
│  │  └─────────────┘  └──────────────┘             │       │
│  └───────────────────────────────────────────────────┘       │
│                          │                                    │
│              ┌───────────┴──────────┐                        │
│              │                      │                        │
│      ┌───────▼────────┐    ┌────────▼────────┐             │
│      │  In-Memory     │    │   Supabase      │             │
│      │  State         │    │   Client        │             │
│      │                │    │                 │             │
│      │ • Active       │    │ • Query Builder │             │
│      │   Auctions     │    │ • Type Safety   │             │
│      │ • Teams        │    │                 │             │
│      │ • Current Bids │    │                 │             │
│      └────────────────┘    └─────────┬───────┘             │
└────────────────────────────────────────┼────────────────────┘
                                        │
                                        │  PostgreSQL Protocol
                                        │
┌───────────────────────────────────────▼────────────────────────┐
│                      DATA LAYER                                 │
│                                                                 │
│                    ┌──────────────────┐                        │
│                    │    Supabase      │                        │
│                    │   PostgreSQL     │                        │
│                    └────────┬─────────┘                        │
│                             │                                   │
│   ┌─────────────────────────┼─────────────────────────┐       │
│   │                         │                         │       │
│ ┌─▼──────┐  ┌──────────┐  ┌▼────┐  ┌────────────┐  ┌▼─────┐ │
│ │players │  │auctions  │  │teams│  │sold_players│  │scores│ │
│ └────────┘  └──────────┘  └─────┘  └────────────┘  └──────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Auction Creation Flow (Host)

```
┌─────────┐
│  Host   │
│ Browser │
└────┬────┘
     │
     │ 1. POST /api/auctions/create
     │    { host_name, auction_name, ... }
     │
     ▼
┌────────────────┐
│  Express API   │
└────┬───────────┘
     │
     │ 2. Generate unique code (e.g., "ABC123")
     │
     ▼
┌────────────────┐
│ Auction Service│
└────┬───────────┘
     │
     │ 3. INSERT INTO auctions
     │
     ▼
┌────────────────┐
│   Supabase     │
└────┬───────────┘
     │
     │ 4. Return auction_id
     │
     ▼
┌────────────────┐
│ Auction Service│
└────┬───────────┘
     │
     │ 5. Create in-memory auction room
     │
     ▼
┌────────────────┐
│   Memory Map   │
│ auctions.set() │
└────┬───────────┘
     │
     │ 6. Return { auction_code, auction_id }
     │
     ▼
┌─────────┐
│  Host   │
│ Browser │
└─────────┘
```

### 2. Team Join Flow

```
┌─────────┐
│  Team   │
│ Browser │
└────┬────┘
     │
     │ 1. POST /api/auctions/join
     │    { auction_code, team_name, logo_url }
     │
     ▼
┌────────────────┐
│ Auction Service│
└────┬───────────┘
     │
     │ 2. Validate auction exists & is waiting
     │ 3. Check team count < max_teams
     │
     ▼
┌────────────────┐
│   Supabase     │
│ INSERT team    │
└────┬───────────┘
     │
     │ 4. Return team_id
     │
     ▼
┌────────────────┐
│ Auction Service│
└────┬───────────┘
     │
     │ 5. Add team to in-memory room
     │
     ▼
┌────────────────┐
│   Memory Map   │
│ teams.set()    │
└────┬───────────┘
     │
     │ 6. Return { team_id, auction_id }
     │
     ▼
┌─────────┐
│  Team   │
│ Browser │
└─────────┘
     │
     │ 7. Connect WebSocket
     │    { type: 'join_auction', payload: { auction_code } }
     │
     ▼
┌────────────────┐
│ WebSocket      │
│ Server         │
└────┬───────────┘
     │
     │ 8. Broadcast 'teams_update' to all clients
     │
     ▼
┌──────────────────────────────┐
│ All Browsers in Auction Room │
└──────────────────────────────┘
```

### 3. Bidding Flow (Real-Time)

```
┌─────────┐                                           ┌─────────┐
│ Team 1  │                                           │ Team 2  │
│ Browser │                                           │ Browser │
└────┬────┘                                           └────┬────┘
     │                                                      │
     │ 1. POST /api/auctions/:code/bid                    │
     │    { team_id: 1, amount: 5000 }                    │
     │                                                      │
     ▼                                                      │
┌────────────────┐                                         │
│ Bidding Service│                                         │
└────┬───────────┘                                         │
     │                                                      │
     │ 2. Validate:                                        │
     │    • Team has balance                               │
     │    • Amount > current bid + 100                     │
     │    • Player is on auction                           │
     │                                                      │
     ▼                                                      │
┌────────────────┐                                         │
│   Memory Map   │                                         │
│ Update current │                                         │
│ bid            │                                         │
└────┬───────────┘                                         │
     │                                                      │
     │ 3. WebSocket broadcast                              │
     │    { type: 'new_bid',                              │
     │      payload: { team_id: 1,                        │
     │                 team_name: 'Team A',               │
     │                 amount: 5000 } }                   │
     │                                                      │
     ├──────────────────────────────────────────────────►  │
     │                                                      │
     ▼                                                      ▼
┌─────────┐                                           ┌─────────┐
│ Team 1  │                                           │ Team 2  │
│ Shows:  │                                           │ Shows:  │
│ "You're │                                           │ "Team A │
│ leading"│                                           │ bid 5K" │
└─────────┘                                           └─────────┘
```

### 4. Player Sold Flow

```
┌─────────┐
│  Host   │
│ Browser │
└────┬────┘
     │
     │ 1. Click "Sold" button
     │    POST /api/auctions/:code/sell-player
     │    { player_id, team_id, sold_price }
     │
     ▼
┌────────────────┐
│ Player Service │
└────┬───────────┘
     │
     │ 2. INSERT INTO sold_players
     │    UPDATE teams SET balance, player_count, role_count
     │
     ▼
┌────────────────┐
│   Supabase     │
└────┬───────────┘
     │
     │ 3. Update in-memory team state
     │
     ▼
┌────────────────┐
│   Memory Map   │
│ team.balance   │
│ -= sold_price  │
└────┬───────────┘
     │
     │ 4. WebSocket broadcast 'player_sold'
     │
     ▼
┌──────────────────────────────┐
│ All Browsers in Auction Room │
└────┬─────────────────────┬───┘
     │                     │
     ▼                     ▼
┌─────────┐           ┌─────────┐
│ Winning │           │  Other  │
│  Team   │           │  Teams  │
│ Shows:  │           │ Show:   │
│ "You    │           │ "Player │
│ won!"   │           │ sold to │
│         │           │ Team X" │
└─────────┘           └─────────┘
```

### 5. Scoring Calculation Flow

```
┌─────────┐
│  Host   │
│ Browser │
└────┬────┘
     │
     │ 1. POST /api/auctions/:code/calculate-scores
     │
     ▼
┌────────────────┐
│ Scoring Service│
└────┬───────────┘
     │
     │ 2. For each team:
     │    ├─ Fetch sold_players from Supabase
     │    ├─ Calculate player score from stats × formulas
     │    ├─ Sum to team total
     │    └─ Check if player_count >= 15
     │
     ▼
┌────────────────┐
│   Supabase     │
│ INSERT INTO    │
│ final_scores   │
└────┬───────────┘
     │
     │ 3. Sort teams by score
     │ 4. Assign ranks
     │
     ▼
┌────────────────┐
│ WebSocket      │
│ Broadcast      │
│ 'scoreboard'   │
└────┬───────────┘
     │
     ▼
┌──────────────────────────────┐
│ All Browsers in Auction Room │
│ Navigate to /scoreboard      │
└──────────────────────────────┘
```

---

## Component Communication

### Host Components

```
┌──────────────────────────────────────────────────────┐
│              HOST APPLICATION                         │
│                                                       │
│  ┌────────────────┐                                  │
│  │ CreateAuction  │                                  │
│  │                │                                  │
│  │ [Form]         │────────► POST /auctions/create  │
│  └────────┬───────┘                                  │
│           │                                           │
│           │ Navigate with auction_code               │
│           ▼                                           │
│  ┌────────────────┐                                  │
│  │  HostLobby     │                                  │
│  │                │                                  │
│  │ [Team List]    │◄──────── WebSocket: teams_update│
│  │ [Start Button] │────────► POST /auctions/start   │
│  └────────┬───────┘                                  │
│           │                                           │
│           │ Navigate on start                        │
│           ▼                                           │
│  ┌────────────────┐                                  │
│  │  HostAuction   │                                  │
│  │                │                                  │
│  │ [Player List]  │────────► GET /available-players │
│  │ [Current Bid]  │◄──────── WebSocket: new_bid     │
│  │ [Sold Button]  │────────► POST /sell-player      │
│  │                │────────► WebSocket: player_sold │
│  │ [Calculate]    │────────► POST /calculate-scores │
│  └────────┬───────┘                                  │
│           │                                           │
│           │ Navigate to scoreboard                   │
│           ▼                                           │
│  ┌────────────────┐                                  │
│  │  Scoreboard    │                                  │
│  │                │                                  │
│  │ [Rankings]     │◄──────── WebSocket: scoreboard  │
│  │ [Breakdown]    │          OR                      │
│  │                │◄──────── Supabase: final_scores │
│  └────────────────┘                                  │
└──────────────────────────────────────────────────────┘
```

### Team Components

```
┌──────────────────────────────────────────────────────┐
│              TEAM APPLICATION                         │
│                                                       │
│  ┌────────────────┐                                  │
│  │  JoinAuction   │                                  │
│  │                │                                  │
│  │ [Form]         │────────► POST /auctions/join    │
│  └────────┬───────┘                                  │
│           │                                           │
│           │ Store team_id, navigate                  │
│           ▼                                           │
│  ┌────────────────┐                                  │
│  │  TeamLobby     │                                  │
│  │                │                                  │
│  │ [Team List]    │◄──────── WebSocket: teams_update│
│  │ [Waiting...]   │◄──────── WebSocket: player_auction│
│  └────────┬───────┘          (triggers navigation)   │
│           │                                           │
│           │ Auto-navigate on start                   │
│           ▼                                           │
│  ┌────────────────┐                                  │
│  │  TeamAuction   │                                  │
│  │                │                                  │
│  │ [Player Info]  │◄──────── WebSocket: player_auction│
│  │ [Bid Input]    │────────► POST /bid              │
│  │ [Bid Button]   │────────► WebSocket: bid         │
│  │ [My Balance]   │◄──────── WebSocket: new_bid     │
│  │                │◄──────── WebSocket: player_sold │
│  └────────┬───────┘                                  │
│           │                                           │
│           │ Navigate on auction end                  │
│           ▼                                           │
│  ┌────────────────┐                                  │
│  │  Scoreboard    │                                  │
│  │                │                                  │
│  │ [My Rank]      │◄──────── WebSocket: scoreboard  │
│  │ [All Scores]   │                                  │
│  └────────────────┘                                  │
└──────────────────────────────────────────────────────┘
```

---

## State Management

### Backend State (In-Memory)

```
activeAuctions: Map<auction_code, AuctionRoom>

AuctionRoom {
  auction_id: number
  auction_code: string
  status: 'waiting' | 'live' | 'completed'
  teams: Map<team_id, Team>
  current_player: Player | null
  current_bid: { team_id, team_name, amount } | null
  base_price: number
  auctioned_players: number[]
  scoring_formulas: ScoringFormulas | null
}
```

### Frontend State (React)

```typescript
// Host State
{
  auctionCode: string
  auctionId: number
  teams: Team[]
  currentPlayer: Player | null
  currentBid: BidInfo | null
  availablePlayers: Player[]
  isConnected: boolean
}

// Team State
{
  auctionCode: string
  teamId: number
  teamName: string
  balance: number
  currentPlayer: Player | null
  currentBid: BidInfo | null
  isLeading: boolean
  isConnected: boolean
}
```

---

## Security & Validation

```
┌─────────────────────────────────────────────────────┐
│              VALIDATION LAYERS                       │
│                                                      │
│  1. Frontend Validation                             │
│     ├─ Form input validation                        │
│     ├─ Balance checks before bid                    │
│     └─ Button state management                      │
│                                                      │
│  2. Backend API Validation                          │
│     ├─ Request body validation                      │
│     ├─ Auction state checks                         │
│     ├─ Team existence verification                  │
│     └─ Balance validation                           │
│                                                      │
│  3. Business Logic Validation                       │
│     ├─ Minimum bid enforcement                      │
│     ├─ Role count limits                            │
│     ├─ Player count requirements                    │
│     └─ Auction status transitions                   │
│                                                      │
│  4. Database Constraints                            │
│     ├─ Foreign key constraints                      │
│     ├─ Check constraints (role types)               │
│     ├─ NOT NULL constraints                         │
│     └─ Unique constraints (auction_code)            │
└─────────────────────────────────────────────────────┘
```

---

This architecture ensures:
- ✅ **Scalability**: In-memory state for speed, DB for persistence
- ✅ **Real-time**: WebSocket for instant updates
- ✅ **Security**: Backend validates everything
- ✅ **Reliability**: Database backup for all critical data
- ✅ **Simplicity**: Clear separation of concerns
