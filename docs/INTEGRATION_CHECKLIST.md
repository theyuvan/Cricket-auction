# Backend Integration Checklist

This document provides step-by-step instructions for integrating the backend with your existing frontend pages.

## 📋 Prerequisites

- [x] Backend server running (`npm run server`)
- [x] Frontend running (`npm run dev`)
- [x] Supabase database configured
- [x] Environment variables set

---

## 🎯 Integration Tasks

### 1. Host: Create Auction Page

**File**: `src/pages/host/CreateAuction.tsx`

**API Call**:
```typescript
const handleCreateAuction = async () => {
  const response = await fetch('http://localhost:3000/api/auctions/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      host_name: hostName,
      auction_name: auctionName,
      starting_balance: 10000,
      max_teams: 10,
    }),
  });
  
  const data = await response.json();
  // data.auction_code - Use this for navigation
  // data.auction_id - Store in context/state
  
  navigate(`/host/lobby?code=${data.auction_code}`);
};
```

**State to Store**:
- `auction_code` (in URL params or context)
- `auction_id` (in context for API calls)

---

### 2. Host: Lobby Page

**File**: `src/pages/host/HostLobby.tsx`

**WebSocket Integration**:
```typescript
import { useAuctionWebSocket } from '@/hooks/useAuctionWebSocket';

const { isConnected, updateTeams } = useAuctionWebSocket({
  auctionCode: auctionCodeFromParams,
  onJoined: () => fetchTeams(),
  onTeamsUpdate: (data) => setTeams(data.teams),
});
```

**API Calls**:
```typescript
// Fetch teams
const fetchTeams = async () => {
  const response = await fetch(`http://localhost:3000/api/auctions/${auctionCode}/teams`);
  const data = await response.json();
  setTeams(data.teams);
};

// Start auction
const handleStartAuction = async () => {
  await fetch(`http://localhost:3000/api/auctions/${auctionCode}/start`, {
    method: 'POST',
  });
  navigate(`/host/auction?code=${auctionCode}`);
};
```

**Real-time Updates**:
- Listen to `onTeamsUpdate` event
- Display team count, names, logos
- Enable "Start" button when ready

---

### 3. Host: Auction Page

**File**: `src/pages/host/HostAuction.tsx`

**WebSocket Setup**:
```typescript
const {
  isConnected,
  setPlayer,
  markPlayerSold,
  markPlayerUnsold,
  showScoreboard,
} = useAuctionWebSocket({
  auctionCode,
  onBid: (data) => {
    setCurrentBid(data);
    toast.info(`${data.team_name} bid ₹${data.amount}`);
  },
  onPlayerSold: (data) => {
    setCurrentPlayer(null);
    setCurrentBid(null);
    fetchAvailablePlayers();
  },
  onTeamsUpdate: (data) => setTeams(data.teams),
});
```

**Fetch Players**:
```typescript
const fetchAvailablePlayers = async () => {
  const response = await fetch(
    `http://localhost:3000/api/auctions/${auctionCode}/available-players`
  );
  const data = await response.json();
  setAvailablePlayers(data.players);
};
```

**Select Player**:
```typescript
const handleSelectPlayer = async (player) => {
  await fetch(`http://localhost:3000/api/auctions/${auctionCode}/set-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ player_id: player.id, base_price: 1000 }),
  });
  
  setPlayer(player, 1000); // Broadcast via WebSocket
  setCurrentPlayer(player);
};
```

**Sell Player**:
```typescript
const handleSold = async () => {
  await fetch(`http://localhost:3000/api/auctions/${auctionCode}/sell-player`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      player_id: currentPlayer.id,
      team_id: currentBid.team_id,
      sold_price: currentBid.amount,
    }),
  });
  
  markPlayerSold(currentPlayer, currentBid.team_id, currentBid.team_name, currentBid.amount);
};
```

**Calculate Scores**:
```typescript
const handleCompleteAuction = async () => {
  // First, set scoring formulas
  await fetch(`http://localhost:3000/api/auctions/${auctionCode}/scoring-formulas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(scoringFormulas),
  });
  
  // Calculate scores
  const response = await fetch(
    `http://localhost:3000/api/auctions/${auctionCode}/calculate-scores`,
    { method: 'POST' }
  );
  const data = await response.json();
  
  showScoreboard(data.scoreboard); // Broadcast via WebSocket
  navigate(`/scoreboard?code=${auctionCode}`);
};
```

---

### 4. Team: Join Auction Page

**File**: `src/pages/team/JoinAuction.tsx`

**API Call**:
```typescript
const handleJoinAuction = async () => {
  const response = await fetch('http://localhost:3000/api/auctions/join', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      auction_code: auctionCode,
      team_name: teamName,
      logo_url: logoUrl,
    }),
  });
  
  const data = await response.json();
  // data.team_id - Store in localStorage/context
  // data.auction_id - Store in context
  
  localStorage.setItem('team_id', data.team_id.toString());
  localStorage.setItem('team_name', teamName);
  
  navigate(`/team/lobby?code=${auctionCode}`);
};
```

**Error Handling**:
- Invalid auction code
- Auction already started
- Auction full

---

### 5. Team: Lobby Page

**File**: `src/pages/team/TeamLobby.tsx`

**WebSocket Integration**:
```typescript
const { isConnected } = useAuctionWebSocket({
  auctionCode,
  onTeamsUpdate: (data) => setTeams(data.teams),
  onPlayerAuction: () => {
    // Auction started!
    navigate(`/team/auction?code=${auctionCode}`);
  },
});
```

**Display**:
- Show all joined teams
- Show waiting status
- Auto-navigate when auction starts

---

### 6. Team: Auction Page

**File**: `src/pages/team/TeamAuction.tsx`

**WebSocket Setup**:
```typescript
const teamId = localStorage.getItem('team_id');
const teamName = localStorage.getItem('team_name');

const { placeBid } = useAuctionWebSocket({
  auctionCode,
  
  onPlayerAuction: (data) => {
    setCurrentPlayer(data.player);
    setBasePrice(data.base_price);
    setMinBid(data.base_price);
  },
  
  onBid: (data) => {
    setCurrentBid(data);
    setMinBid(data.amount + 100);
    
    if (data.team_id === Number(teamId)) {
      setIsLeading(true);
    } else {
      setIsLeading(false);
    }
  },
  
  onPlayerSold: (data) => {
    if (data.team_id === Number(teamId)) {
      toast.success(`You won ${data.player.name}!`);
      setBalance(prev => prev - data.sold_price);
    }
    setCurrentPlayer(null);
    setCurrentBid(null);
  },
  
  onPlayerUnsold: () => {
    setCurrentPlayer(null);
    setCurrentBid(null);
  },
  
  onShowScoreboard: () => {
    navigate(`/scoreboard?code=${auctionCode}`);
  },
});
```

**Place Bid**:
```typescript
const handleBid = async () => {
  const response = await fetch(
    `http://localhost:3000/api/auctions/${auctionCode}/bid`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        team_id: Number(teamId),
        amount: bidAmount,
      }),
    }
  );
  
  if (response.ok) {
    placeBid(Number(teamId), teamName, bidAmount);
  } else {
    const error = await response.json();
    toast.error(error.error);
  }
};
```

---

### 7. Scoreboard Page

**File**: `src/pages/Scoreboard.tsx`

**Fetch Scoreboard**:
```typescript
// Option 1: From WebSocket event
const { } = useAuctionWebSocket({
  auctionCode,
  onShowScoreboard: (data) => {
    setScoreboard(data.scoreboard);
  },
});

// Option 2: From Supabase (for page refresh)
const fetchScoreboard = async () => {
  const { data: auction } = await supabase
    .from('auctions')
    .select('id')
    .eq('auction_code', auctionCode)
    .single();
    
  const { data: scores } = await supabase
    .from('final_scores')
    .select('*, teams(*)')
    .eq('auction_id', auction.id)
    .order('total_score', { ascending: false });
    
  setScoreboard(scores);
};
```

**Display**:
- Rank teams by total score
- Show player breakdown
- Highlight disqualified teams
- Export/share functionality

---

## 🔧 Common Utilities

### Create API Client

**File**: `src/lib/api.ts`

```typescript
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export const api = {
  get: async (endpoint: string) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`);
    return response.json();
  },
  
  post: async (endpoint: string, data: any) => {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return response.json();
  },
};
```

### Context Provider

**File**: `src/context/AuctionContext.tsx`

```typescript
interface AuctionContext {
  auctionCode: string | null;
  auctionId: number | null;
  teamId: number | null;
  teamName: string | null;
  balance: number;
  setAuctionData: (data: any) => void;
}

export const AuctionProvider = ({ children }) => {
  const [auctionCode, setAuctionCode] = useState<string | null>(null);
  const [auctionId, setAuctionId] = useState<number | null>(null);
  const [teamId, setTeamId] = useState<number | null>(null);
  const [teamName, setTeamName] = useState<string | null>(null);
  const [balance, setBalance] = useState(10000);
  
  // Load from localStorage on mount
  useEffect(() => {
    const storedTeamId = localStorage.getItem('team_id');
    const storedTeamName = localStorage.getItem('team_name');
    if (storedTeamId) setTeamId(Number(storedTeamId));
    if (storedTeamName) setTeamName(storedTeamName);
  }, []);
  
  const setAuctionData = (data: any) => {
    if (data.auction_code) setAuctionCode(data.auction_code);
    if (data.auction_id) setAuctionId(data.auction_id);
    if (data.team_id) {
      setTeamId(data.team_id);
      localStorage.setItem('team_id', data.team_id.toString());
    }
    if (data.team_name) {
      setTeamName(data.team_name);
      localStorage.setItem('team_name', data.team_name);
    }
  };
  
  return (
    <AuctionContext.Provider value={{ 
      auctionCode, auctionId, teamId, teamName, balance,
      setAuctionData, setBalance 
    }}>
      {children}
    </AuctionContext.Provider>
  );
};
```

---

## ✅ Testing Checklist

### Host Flow
- [ ] Create auction → Get code
- [ ] Navigate to lobby → See empty team list
- [ ] Wait for teams to join → See real-time updates
- [ ] Start auction → Navigate to auction page
- [ ] Select player → All teams see player
- [ ] Receive bids → See bids update in real-time
- [ ] Sell player → Team balance updates
- [ ] Complete auction → Calculate scores
- [ ] View scoreboard → See rankings

### Team Flow
- [ ] Join with code → Enter lobby
- [ ] See other teams → Real-time list updates
- [ ] Auction starts → Auto-navigate to auction
- [ ] See player → Display stats
- [ ] Place bid → Validate balance
- [ ] Win player → Balance deducted
- [ ] Auction ends → Navigate to scoreboard
- [ ] View results → See final ranking

### Edge Cases
- [ ] Invalid auction code
- [ ] Auction already started
- [ ] Insufficient balance for bid
- [ ] Bid lower than minimum
- [ ] WebSocket disconnection handling
- [ ] Page refresh during auction
- [ ] Multiple browser tabs

---

## 🐛 Debugging

### Enable Debug Mode

Add to components:
```typescript
useEffect(() => {
  console.log('[DEBUG] Current state:', { 
    currentPlayer, currentBid, teams, balance 
  });
}, [currentPlayer, currentBid, teams, balance]);
```

### WebSocket Debugging

```typescript
const { } = useAuctionWebSocket({
  auctionCode,
  onMessage: (msg) => console.log('[WS]', msg),
});
```

### Network Tab
- Check API responses
- Verify WebSocket connection
- Monitor message flow

---

## 📝 Next Steps

1. Install dependencies: `npm install`
2. Start backend: `npm run server`
3. Start frontend: `npm run dev`
4. Follow integration tasks above
5. Test each flow thoroughly
6. Deploy to production

---

**Need help?** Check [SETUP.md](../SETUP.md) or [backend/README.md](../backend/README.md)
