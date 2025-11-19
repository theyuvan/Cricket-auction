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
 * DELETE /api/teams/:teamId
 * Remove a team from auction (before auction starts)
 */
router.delete('/teams/:teamId', async (req: Request, res: Response) => {
  try {
    const { teamId } = req.params;
    
    // Delete from database
    const { data: team, error: fetchError } = await supabase
      .from('teams')
      .select('auction_id')
      .eq('id', parseInt(teamId))
      .single();

    if (fetchError || !team) {
      return res.status(404).json({ error: 'Team not found' });
    }

    // Get auction to check status
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('status, auction_code')
      .eq('id', team.auction_id)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Only allow removal if auction hasn't started
    if (auction.status !== 'waiting') {
      return res.status(400).json({ error: 'Cannot remove team after auction has started' });
    }

    // Delete the team
    const { error: deleteError } = await supabase
      .from('teams')
      .delete()
      .eq('id', parseInt(teamId));

    if (deleteError) {
      throw deleteError;
    }

    // Update auction room cache
    const auctionRoom = await getAuctionRoom(auction.auction_code);
    if (auctionRoom) {
      auctionRoom.teams.delete(parseInt(teamId));
    }

    // Broadcast update to all clients
    const { broadcast } = await import('../server');
    const updatedTeams = auctionRoom ? Array.from(auctionRoom.teams.values()) : [];
    broadcast(auction.auction_code, {
      type: 'teams_update',
      payload: { teams: updatedTeams },
    });

    res.json({ success: true, message: 'Team removed successfully' });
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
    
    // Fetch sold players for this team
    const { data: soldPlayersData, error: soldError } = await supabase
      .from('sold_players')
      .select('player_id, sold_price, role, stats')
      .eq('team_id', teamId);

    if (soldError) {
      console.error('Error fetching sold players:', soldError);
      throw new Error('Failed to fetch team players: ' + soldError.message);
    }

    if (!soldPlayersData || soldPlayersData.length === 0) {
      return res.json({ players: [] });
    }

    // Fetch player details for all sold players
    const playerIds = soldPlayersData.map((sp: any) => sp.player_id);
    const { data: playersData, error: playersError } = await supabase
      .from('players')
      .select('id, name, role, stats')
      .in('id', playerIds);

    if (playersError) {
      console.error('Error fetching players:', playersError);
      throw new Error('Failed to fetch player details: ' + playersError.message);
    }

    // Combine the data
    const players = soldPlayersData.map((sp: any) => {
      const player = playersData?.find((p: any) => p.id === sp.player_id);
      return {
        player_id: sp.player_id,
        name: player?.name || 'Unknown',
        role: sp.role || player?.role || 'Unknown',
        sold_price: sp.sold_price,
        stats: sp.stats || player?.stats || {},
      };
    });

    res.json({ players });
  } catch (error: any) {
    console.error('Error in /api/teams/:teamId/players:', error);
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
    const { player_ids, wicketkeeper, captain, vice_captain, total_score, auction_code } = req.body;

    if (!player_ids || !Array.isArray(player_ids) || player_ids.length !== 11) {
      return res.status(400).json({ error: 'Must provide exactly 11 player IDs' });
    }

    if (!wicketkeeper || !captain || !vice_captain) {
      return res.status(400).json({ error: 'Must provide wicketkeeper, captain, and vice-captain' });
    }

    if (!total_score || typeof total_score !== 'number') {
      return res.status(400).json({ error: 'Must provide valid total_score' });
    }

    const supabase = await import('../services/auctionService').then(m => m.supabase);

    // Update team's playing XI
    const { error: teamError } = await supabase
      .from('teams')
      .update({
        playing_xi: player_ids,
      })
      .eq('id', teamId);

    if (teamError) {
      throw new Error('Failed to update playing XI: ' + teamError.message);
    }

    // Get auction ID for this team
    const { data: teamData, error: teamFetchError } = await supabase
      .from('teams')
      .select('auction_id, team_name')
      .eq('id', teamId)
      .single();

    if (teamFetchError || !teamData) {
      throw new Error('Failed to fetch team data');
    }

    // Store or update final score
    const { error: scoreError } = await supabase
      .from('final_scores')
      .upsert({
        auction_id: teamData.auction_id,
        team_id: teamId,
        team_name: teamData.team_name,
        player_ids,
        wicketkeeper,
        captain,
        vice_captain,
        total_score,
        submitted_at: new Date().toISOString(),
      }, {
        onConflict: 'team_id',
      });

    if (scoreError) {
      console.error('Failed to store final score:', scoreError);
      throw new Error('Failed to store final score: ' + scoreError.message);
    }

    res.json({ 
      success: true, 
      message: 'Playing XI submitted successfully',
      total_score,
    });
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

/**
 * GET /api/auctions/:code/scoreboard
 * Get final scoreboard for an auction
 */
router.get('/auctions/:code/scoreboard', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;

    const supabase = await import('../services/auctionService').then(m => m.supabase);

    // Get auction ID
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .select('id')
      .eq('auction_code', code)
      .single();

    if (auctionError || !auction) {
      return res.status(404).json({ error: 'Auction not found' });
    }

    // Get all final scores for this auction
    const { data: scores, error: scoresError } = await supabase
      .from('final_scores')
      .select('*')
      .eq('auction_id', auction.id)
      .order('total_score', { ascending: false });

    if (scoresError) {
      throw new Error('Failed to fetch scoreboard: ' + scoresError.message);
    }

    res.json({ 
      teams: scores || [],
      auction_code: code,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
