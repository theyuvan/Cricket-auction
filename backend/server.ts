/* eslint-disable @typescript-eslint/no-explicit-any */
import 'dotenv/config'; // Load environment variables first
import express from 'express';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import http from 'http';
import apiRouter from './routes/api';
import { getAuctionRoom } from './services/auctionService';

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api', apiRouter);

// WebSocket client connections: Map<auction_code, Set<WebSocket>>
const auctionConnections = new Map<string, Set<WebSocket>>();

// WebSocket connection handler
wss.on('connection', (ws: WebSocket) => {
  console.log('New WebSocket connection');

  let clientAuctionCode: string | null = null;

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      const { type, payload } = data;

      // Debug log
      console.log('Received WebSocket message type:', type);

      switch (type) {
        case 'join_auction':
          handleJoinAuction(ws, payload.auction_code);
          clientAuctionCode = payload.auction_code;
          break;

        case 'bid':
          handleBid(payload.auction_code, payload);
          break;

        case 'set_player':
          console.log('Setting player:', payload.player?.name);
          handleSetPlayer(payload.auction_code, payload.player);
          break;

        case 'player_sold':
          console.log('Player sold:', payload.player?.name, 'to team:', payload.team_name, 'for:', payload.sold_price);
          handlePlayerSold(payload.auction_code, payload);
          break;

        case 'player_unsold':
          handlePlayerUnsold(payload.auction_code);
          break;

        case 'show_scoreboard':
          handleShowScoreboard(payload.auction_code, payload.scoreboard);
          break;

        case 'update_teams':
          handleUpdateTeams(payload.auction_code);
          break;

        default:
          console.log('Unknown message type:', type, '- Full data:', data);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  });

  ws.on('close', () => {
    console.log('WebSocket connection closed');
    if (clientAuctionCode) {
      removeConnection(clientAuctionCode, ws);
    }
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// ============================================
// WebSocket Handlers
// ============================================

function handleJoinAuction(ws: WebSocket, auctionCode: string) {
  if (!auctionConnections.has(auctionCode)) {
    auctionConnections.set(auctionCode, new Set());
  }

  auctionConnections.get(auctionCode)?.add(ws);

  // Send confirmation
  ws.send(
    JSON.stringify({
      type: 'joined',
      payload: { auction_code: auctionCode },
    })
  );

  console.log(`Client joined auction: ${auctionCode}`);
}

function handleBid(auctionCode: string, payload: any) {
  // Broadcast bid to all clients in the auction
  broadcast(auctionCode, {
    type: 'new_bid',
    payload: {
      team_id: payload.team_id,
      team_name: payload.team_name,
      amount: payload.amount,
    },
  });
}

function handleSetPlayer(auctionCode: string, player: any) {
  // Broadcast new player to all clients
  broadcast(auctionCode, {
    type: 'player_auction',
    payload: {
      player: player,
      base_price: player.base_price || 5000,
    },
  });
}

function handlePlayerSold(auctionCode: string, payload: any) {
  // Broadcast player sold event
  broadcast(auctionCode, {
    type: 'player_sold',
    payload: {
      player: payload.player,
      team_id: payload.team_id,
      team_name: payload.team_name,
      sold_price: payload.sold_price,
    },
  });

  // Send updated team data
  handleUpdateTeams(auctionCode);
}

function handlePlayerUnsold(auctionCode: string) {
  // Broadcast player unsold event
  broadcast(auctionCode, {
    type: 'player_unsold',
    payload: {},
  });
}

function handleShowScoreboard(auctionCode: string, scoreboard: any) {
  // Broadcast final scoreboard
  broadcast(auctionCode, {
    type: 'show_scoreboard',
    payload: { scoreboard },
  });
}

async function handleUpdateTeams(auctionCode: string) {
  const auctionRoom = await getAuctionRoom(auctionCode);

  if (!auctionRoom) {
    return;
  }

  const teams = Array.from(auctionRoom.teams.values());

  broadcast(auctionCode, {
    type: 'teams_update',
    payload: { teams },
  });
}

// Export for use in API routes
export function broadcastTeamUpdate(auctionCode: string) {
  handleUpdateTeams(auctionCode);
}

// ============================================
// Utility Functions
// ============================================

function broadcast(auctionCode: string, message: any) {
  const connections = auctionConnections.get(auctionCode);

  if (!connections) {
    return;
  }

  const messageStr = JSON.stringify(message);

  connections.forEach((ws) => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(messageStr);
    }
  });
}

function removeConnection(auctionCode: string, ws: WebSocket) {
  const connections = auctionConnections.get(auctionCode);

  if (connections) {
    connections.delete(ws);

    if (connections.size === 0) {
      auctionConnections.delete(auctionCode);
    }
  }
}

// ============================================
// Start Server
// ============================================

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`HTTP: http://localhost:${PORT}`);
  console.log(`WebSocket: ws://localhost:${PORT}`);
});

export { broadcast };
