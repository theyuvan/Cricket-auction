import { supabase } from './auctionService';
import { Player, PlayerRole, AuctionRoom } from '../types';

/**
 * Fetch all players from Supabase
 */
export async function getAllPlayers(): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .order('name');

  if (error) {
    throw new Error('Failed to fetch players: ' + error.message);
  }

  return data as Player[];
}

/**
 * Fetch a single player by ID
 */
export async function getPlayerById(playerId: number): Promise<Player | null> {
  const { data, error } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();

  if (error) {
    return null;
  }

  return data as Player;
}

/**
 * Mark a player as sold to a team
 */
export async function sellPlayerToTeam(
  auctionRoom: AuctionRoom,
  playerId: number,
  teamId: number,
  soldPrice: number
): Promise<void> {
  const player = await getPlayerById(playerId);
  if (!player) {
    throw new Error('Player not found');
  }

  const team = auctionRoom.teams.get(teamId);
  if (!team) {
    throw new Error('Team not found');
  }

  // Validate team has enough balance
  if (team.balance < soldPrice) {
    throw new Error('Insufficient balance');
  }

  // Insert sold player record
  const { error: soldError } = await supabase
    .from('sold_players')
    .insert({
      auction_id: auctionRoom.auction_id,
      team_id: teamId,
      player_id: playerId,
      sold_price: soldPrice,
      role: player.role,
      stats: player.stats,
    });

  if (soldError) {
    throw new Error('Failed to record sold player: ' + soldError.message);
  }

  // Update team in Supabase
  const newBalance = team.balance - soldPrice;
  const newPlayerCount = team.player_count + 1;
  const newRoleCount = { ...team.role_count };
  newRoleCount[player.role]++;

  const { error: teamError } = await supabase
    .from('teams')
    .update({
      balance: newBalance,
      player_count: newPlayerCount,
      role_count: newRoleCount,
    })
    .eq('id', teamId);

  if (teamError) {
    throw new Error('Failed to update team: ' + teamError.message);
  }

  // Update in-memory team state
  team.balance = newBalance;
  team.player_count = newPlayerCount;
  team.role_count = newRoleCount;

  // Mark player as auctioned
  auctionRoom.auctioned_players.push(playerId);
}

/**
 * Get sold players for a team
 */
export async function getTeamPlayers(
  auctionId: number,
  teamId: number
): Promise<any[]> {
  const { data, error } = await supabase
    .from('sold_players')
    .select('*')
    .eq('auction_id', auctionId)
    .eq('team_id', teamId);

  if (error) {
    throw new Error('Failed to fetch team players: ' + error.message);
  }

  return data;
}

/**
 * Get available players (not yet auctioned)
 */
export async function getAvailablePlayers(
  auctionedPlayerIds: number[]
): Promise<Player[]> {
  if (auctionedPlayerIds.length === 0) {
    return getAllPlayers();
  }

  const { data, error } = await supabase
    .from('players')
    .select('*')
    .not('id', 'in', `(${auctionedPlayerIds.join(',')})`)
    .order('name');

  if (error) {
    throw new Error('Failed to fetch available players: ' + error.message);
  }

  return data as Player[];
}
