/* eslint-disable @typescript-eslint/no-explicit-any */
import express, { Request, Response } from 'express';
import {
  createAuction,
  joinAuction,
  startAuction,
  getAuctionRoom,
  getAuctionTeams,
  completeAuction,
} from '../services/auctionService';
import {
  getAllPlayers,
  getPlayerById,
  sellPlayerToTeam,
  getAvailablePlayers,
} from '../services/playerService';
import {
  placeBid,
  setCurrentPlayer,
  clearCurrentPlayer,
  getCurrentAuctionState,
} from '../services/biddingService';
import {
  setScoringFormulas,
  calculateFinalScores,
} from '../services/scoringService';
import { broadcastTeamUpdate } from '../server';

const router = express.Router();

// ============================================
// AUCTION MANAGEMENT ROUTES
// ============================================

/**
 * POST /api/auctions/create
 * Create a new auction
 */
router.post('/auctions/create', async (req: Request, res: Response) => {
  try {
    const { host_name, auction_name, starting_balance, max_teams } = req.body;

    if (!host_name) {
      return res.status(400).json({ error: 'Host name is required' });
    }

    const result = await createAuction(
      host_name,
      auction_name || null,
      starting_balance || 10000,
      max_teams || 10
    );

    // Return response in expected format
    res.json({
      auction: {
        id: result.auction_id,
        auction_code: result.auction_code,
        auction_name: auction_name || 'Cricket Auction',
        starting_balance: starting_balance || 10000,
        max_teams: max_teams || 10,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auctions/join
 * Join an auction as a team
 */
router.post('/auctions/join', async (req: Request, res: Response) => {
  try {
    const { auction_code, team_name, logo_url } = req.body;

    if (!auction_code || !team_name) {
      return res.status(400).json({ error: 'Auction code and team name are required' });
    }

    const result = await joinAuction(auction_code, team_name, logo_url || null);
    
    // Get auction room to get starting balance
    const auctionRoom = getAuctionRoom(auction_code);

    // Broadcast team update to all connected clients
    broadcastTeamUpdate(auction_code);

    res.json({
      team: {
        id: result.team_id,
        team_name: team_name,
        logo_url: logo_url || null,
      },
      auction: {
        id: result.auction_id,
        starting_balance: auctionRoom?.starting_balance || 10000,
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auctions/start
 * Start the auction
 */
router.post('/auctions/start', async (req: Request, res: Response) => {
  try {
    const { auction_code } = req.body;

    if (!auction_code) {
      return res.status(400).json({ error: 'Auction code is required' });
    }

    await startAuction(auction_code);

    // Import broadcast from server
    const { broadcast } = await import('../server');
    
    // Broadcast auction started to all connected clients
    broadcast(auction_code, {
      type: 'auction_started',
      payload: {},
    });

    res.json({ success: true, message: 'Auction started' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auctions/:code/end
 * End the auction
 */
router.post('/auctions/:code/end', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    await completeAuction(code);

    // Import broadcast from server
    const { broadcast } = await import('../server');
    
    // Broadcast auction ended to all connected clients
    broadcast(code, {
      type: 'auction_ended',
      payload: {
        message: 'Auction has ended. Please select your playing XI.',
      },
    });

    res.json({ success: true, message: 'Auction ended successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auctions/:code
 * Get auction details
 */
router.get('/auctions/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const auctionRoom = await getAuctionRoom(code);

    if (!auctionRoom) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json({
      auction_id: auctionRoom.auction_id,
      auction_code: auctionRoom.auction_code,
      host_name: auctionRoom.host_name,
      status: auctionRoom.status,
      starting_balance: auctionRoom.starting_balance,
      max_teams: auctionRoom.max_teams,
      team_count: auctionRoom.teams.size,
      current_player: auctionRoom.current_player,
      current_bid: auctionRoom.current_bid,
      base_price: auctionRoom.base_price,
      auctioned_players: auctionRoom.auctioned_players,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auctions/:code/teams
 * Get all teams in an auction
 */
router.get('/auctions/:code/teams', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const auctionRoom = await getAuctionRoom(code);
    
    if (!auctionRoom) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const teams = Array.from(auctionRoom.teams.values());
    res.json({ teams });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auctions/:code/state
 * Get current auction state
 */
router.get('/auctions/:code/state', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const state = await getCurrentAuctionState(code);

    if (!state) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    res.json(state);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// PLAYER MANAGEMENT ROUTES
// ============================================

/**
 * GET /api/players
 * Get all players
 */
router.get('/players', async (req: Request, res: Response) => {
  try {
    const players = await getAllPlayers();
    res.json({ players });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/players/:id
 * Get a single player
 */
router.get('/players/:id', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id);
    const player = await getPlayerById(playerId);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    res.json(player);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/players/:id/sell
 * Sell a player to a team
 */
router.post('/players/:id/sell', async (req: Request, res: Response) => {
  try {
    const playerId = parseInt(req.params.id);
    const { team_id, sold_price, auction_code } = req.body;

    if (!team_id || !sold_price || !auction_code) {
      return res.status(400).json({ error: 'Team ID, sold price, and auction code are required' });
    }

    const auctionRoom = await getAuctionRoom(auction_code);
    if (!auctionRoom) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    await sellPlayerToTeam(auctionRoom, playerId, team_id, sold_price);
    
    res.json({ success: true, message: 'Player sold successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/auctions/:code/available-players
 * Get available players (not yet auctioned)
 */
router.get('/auctions/:code/available-players', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const auctionRoom = await getAuctionRoom(code);

    if (!auctionRoom) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    const players = await getAvailablePlayers(auctionRoom.auctioned_players);
    res.json({ players });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auctions/:code/sell-player
 * Mark player as sold (host only)
 */
router.post('/auctions/:code/sell-player', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { player_id, team_id, sold_price } = req.body;

    const auctionRoom = await getAuctionRoom(code);

    if (!auctionRoom) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    await sellPlayerToTeam(auctionRoom, player_id, team_id, sold_price);

    res.json({ success: true, message: 'Player sold successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// BIDDING ROUTES
// ============================================

/**
 * POST /api/auctions/:code/set-player
 * Set current player for auction (host only)
 */
router.post('/auctions/:code/set-player', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { player_id, base_price } = req.body;

    const player = await getPlayerById(player_id);

    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const result = await setCurrentPlayer(code, player, base_price || 1000);

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auctions/:code/bid
 * Place a bid
 */
router.post('/auctions/:code/bid', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const { team_id, amount } = req.body;

    const result = await placeBid(code, team_id, amount);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/teams/:teamId/players
 * Get all players for a team
 */
router.get('/teams/:teamId/players', async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);

    const supabase = await import('../services/auctionService').then(m => m.supabase);
    const { data, error } = await supabase
      .from('sold_players')
      .select('player_id, sold_price, role, stats, players!inner(id, name, role, base_price, stats)')
      .eq('team_id', teamId);

    if (error) {
      throw new Error('Failed to fetch team players: ' + error.message);
    }

    // Format the response with player details
    const players = (data || []).map((sp: any) => ({
      player_id: sp.player_id,
      name: sp.players.name,
      role: sp.role || sp.players.role,
      sold_price: sp.sold_price,
      stats: sp.stats || sp.players.stats,
    }));

    res.json({ players });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/teams/:teamId/playing-xi
 * Submit playing XI for a team
 */
router.post('/teams/:teamId/playing-xi', async (req: Request, res: Response) => {
  try {
    const teamId = parseInt(req.params.teamId);
    const { player_ids, auction_code } = req.body;

    if (!player_ids || !Array.isArray(player_ids) || player_ids.length !== 11) {
      return res.status(400).json({ error: 'Must provide exactly 11 player IDs' });
    }

    // Store playing XI in team metadata or separate table
    const { error } = await import('../services/auctionService').then(m => m.supabase)
      .from('teams')
      .update({
        playing_xi: player_ids,
      })
      .eq('id', teamId);

    if (error) {
      throw new Error('Failed to update playing XI: ' + error.message);
    }

    res.json({ success: true, message: 'Playing XI submitted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================
// SCORING ROUTES
// ============================================

/**
 * POST /api/auctions/:code/scoring-formulas
 * Set scoring formulas (host only)
 */
router.post('/auctions/:code/scoring-formulas', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const formulas = req.body;

    const result = setScoringFormulas(code, formulas);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/auctions/:code/calculate-scores
 * Calculate final scores (host only)
 */
router.post('/auctions/:code/calculate-scores', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const scoreboard = await calculateFinalScores(code);
    await completeAuction(code);

    res.json({ scoreboard });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
