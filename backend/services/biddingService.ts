import { AuctionRoom, Player } from '../types';
import { getAuctionRoom, supabase } from './auctionService';

/**
 * Place a bid on the current player
 */
export async function placeBid(
  auctionCode: string,
  teamId: number,
  bidAmount: number
): Promise<{ success: boolean; message: string; current_bid?: any }> {
  const auctionRoom = await getAuctionRoom(auctionCode);

  if (!auctionRoom) {
    return { success: false, message: 'Auction not found' };
  }

  if (auctionRoom.status !== 'live') {
    return { success: false, message: 'Auction is not live' };
  }

  if (!auctionRoom.current_player) {
    return { success: false, message: 'No player currently on auction' };
  }

  const team = auctionRoom.teams.get(teamId);
  if (!team) {
    return { success: false, message: 'Team not found' };
  }

  if (team.status !== 'active') {
    return { success: false, message: 'Team is disqualified' };
  }

  // Validate bid amount is higher than current bid or base price
  const minBid = auctionRoom.current_bid 
    ? auctionRoom.current_bid.amount + 100 
    : auctionRoom.base_price;

  if (bidAmount < minBid) {
    return { 
      success: false, 
      message: `Bid must be at least ${minBid}` 
    };
  }

  // Validate team has enough balance
  if (team.balance < bidAmount) {
    return { 
      success: false, 
      message: 'Insufficient balance' 
    };
  }

  // Update current bid
  auctionRoom.current_bid = {
    team_id: teamId,
    team_name: team.team_name,
    amount: bidAmount,
  };

  // Save to database
  await supabase
    .from('auctions')
    .update({
      current_bid_team_id: teamId,
      current_bid_amount: bidAmount,
    })
    .eq('auction_code', auctionCode);

  return {
    success: true,
    message: 'Bid placed successfully',
    current_bid: auctionRoom.current_bid,
  };
}

/**
 * Set the current player for auction
 */
export async function setCurrentPlayer(
  auctionCode: string,
  player: Player,
  basePrice: number
): Promise<{ success: boolean; message: string }> {
  const auctionRoom = await getAuctionRoom(auctionCode);

  if (!auctionRoom) {
    return { success: false, message: 'Auction not found' };
  }

  if (auctionRoom.status !== 'live') {
    return { success: false, message: 'Auction is not live' };
  }

  auctionRoom.current_player = player;
  auctionRoom.base_price = basePrice;
  auctionRoom.current_bid = null;

  // Save to database
  await supabase
    .from('auctions')
    .update({
      current_player_id: player.id,
      base_price: basePrice,
      current_bid_team_id: null,
      current_bid_amount: 0,
    } as never)
    .eq('auction_code', auctionCode);

  return { success: true, message: 'Player set for auction' };
}

/**
 * Clear the current player (after sold or unsold)
 */
export async function clearCurrentPlayer(auctionCode: string): Promise<void> {
  const auctionRoom = await getAuctionRoom(auctionCode);
  if (auctionRoom) {
    auctionRoom.current_player = null;
    auctionRoom.current_bid = null;
    auctionRoom.base_price = 0;

    // Clear from database
    await supabase
      .from('auctions')
      .update({
        current_player_id: null,
        base_price: 0,
        current_bid_team_id: null,
        current_bid_amount: 0,
      } as never)
      .eq('auction_code', auctionCode);
  }
}

/**
 * Get current auction state for bidding
 */
export async function getCurrentAuctionState(auctionCode: string): Promise<{
  auction_id: number;
  status: string;
  current_player: Player | null;
  current_bid: { team_id: number; team_name: string; amount: number } | null;
  base_price: number;
  teams: any[];
} | null> {
  const auctionRoom = await getAuctionRoom(auctionCode);

  if (!auctionRoom) {
    return null;
  }

  return {
    auction_id: auctionRoom.auction_id,
    status: auctionRoom.status,
    current_player: auctionRoom.current_player,
    current_bid: auctionRoom.current_bid,
    base_price: auctionRoom.base_price,
    teams: Array.from(auctionRoom.teams.values()),
  };
}
