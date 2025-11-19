/* eslint-disable @typescript-eslint/no-explicit-any */
import { createClient } from '@supabase/supabase-js';
import type { Database } from '../../src/integrations/supabase/types';
import { AuctionRoom, Team, Auction } from '../types';
import { generateAuctionCode } from '../utils/codeGenerator';

// Initialize Supabase client
// In Node.js backend, we need to access the env vars without VITE_ prefix
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_PUBLISHABLE_KEY || '';

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials. Please check your .env file.');
  console.error('Required: VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY');
}

const supabase = createClient<Database>(supabaseUrl, supabaseKey);

// In-memory storage for active auction rooms
const activeAuctions = new Map<string, AuctionRoom>();

/**
 * Create a new auction
 */
export async function createAuction(
  hostName: string,
  auctionName: string | null,
  startingBalance: number = 10000,
  maxTeams: number = 10
): Promise<{ auction_code: string; auction_id: number }> {
  const auctionCode = generateAuctionCode();

  // Insert auction into Supabase
  const { data, error } = await supabase
    .from('auctions' as any)
    .insert({
      auction_code: auctionCode,
      name: auctionName,
      host_name: hostName,
      starting_balance: startingBalance,
      max_teams: maxTeams,
      status: 'waiting',
    } as any)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to create auction: ' + error?.message);
  }

  // Initialize in-memory auction room
  const auctionRoom: AuctionRoom = {
    auction_id: data.id,
    auction_code: auctionCode,
    host_name: hostName,
    starting_balance: startingBalance,
    max_teams: maxTeams,
    status: 'waiting',
    teams: new Map(),
    current_player: null,
    current_bid: null,
    base_price: 0,
    scoring_formulas: null,
    auctioned_players: [],
  };

  activeAuctions.set(auctionCode, auctionRoom);

  return { auction_code: auctionCode, auction_id: data.id };
}

/**
 * Join an auction as a team
 */
export async function joinAuction(
  auctionCode: string,
  teamName: string,
  logoUrl: string | null = null
): Promise<{ team_id: number; auction_id: number }> {
  const auctionRoom = activeAuctions.get(auctionCode);

  if (!auctionRoom) {
    throw new Error('Auction not found');
  }

  if (auctionRoom.status !== 'waiting') {
    throw new Error('Auction has already started');
  }

  if (auctionRoom.teams.size >= auctionRoom.max_teams) {
    throw new Error('Auction is full');
  }

  // Check for duplicate team names (case-insensitive, ignoring spaces and special characters)
  const normalizeTeamName = (name: string) => {
    return name.toLowerCase().trim().replaceAll(/[\s\-_.']+/g, '');
  };

  // Generate abbreviation from team name (first letters of words)
  const getAbbreviation = (name: string) => {
    return name.trim().split(/\s+/).map(word => word.charAt(0).toLowerCase()).join('');
  };

  const normalizedInput = normalizeTeamName(teamName);
  const inputAbbreviation = getAbbreviation(teamName);
  const existingTeams = Array.from(auctionRoom.teams.values());

  const duplicateTeam = existingTeams.find(team => {
    const existingNormalized = normalizeTeamName(team.team_name);
    const existingAbbreviation = getAbbreviation(team.team_name);

    // Check if names match exactly (ignoring case, spaces, special chars)
    if (normalizedInput === existingNormalized) return true;

    // Check if input is abbreviation of existing team (e.g., "csk" matches "Chennai Super Kings")
    if (normalizedInput === existingAbbreviation && normalizedInput.length <= 5) return true;

    // Check if existing is abbreviation of input (e.g., "CSK" exists, input is "Chennai Super Kings")
    if (inputAbbreviation === existingNormalized && existingNormalized.length <= 5) return true;

    return false;
  });

  if (duplicateTeam) {
    throw new Error(`Team name already exists or too similar to "${duplicateTeam.team_name}". Please choose a different name.`);
  }

  // Insert team into Supabase
  const { data, error } = await supabase
    .from('teams' as any)
    .insert({
      auction_id: auctionRoom.auction_id,
      team_name: teamName,
      logo_url: logoUrl,
      balance: auctionRoom.starting_balance,
      player_count: 0,
      role_count: { batsman: 0, bowler: 0, allrounder: 0, wicketkeeper: 0 },
      status: 'active',
    } as any)
    .select()
    .single();

  if (error || !data) {
    throw new Error('Failed to join auction: ' + error?.message);
  }

  // Add team to in-memory room
  const team: Team = {
    id: data.id,
    auction_id: data.auction_id,
    team_name: data.team_name,
    logo_url: data.logo_url,
    balance: data.balance,
    player_count: data.player_count,
    role_count: data.role_count as any,
    status: data.status as 'active' | 'disqualified',
    created_at: data.created_at,
  };

  auctionRoom.teams.set(team.id, team);

  return { team_id: data.id, auction_id: auctionRoom.auction_id };
}

/**
 * Start the auction
 */
export async function startAuction(auctionCode: string): Promise<void> {
  const auctionRoom = activeAuctions.get(auctionCode);

  if (!auctionRoom) {
    throw new Error('Auction not found');
  }

  if (auctionRoom.status !== 'waiting') {
    throw new Error('Auction has already started');
  }

  // Update auction status in Supabase
  const { error } = await supabase
    .from('auctions')
    .update({ status: 'live' })
    .eq('auction_code', auctionCode);

  if (error) {
    throw new Error('Failed to start auction: ' + error.message);
  }

  auctionRoom.status = 'live';
}

/**
 * Load auction room from database if not in memory
 */
async function loadAuctionFromDB(auctionCode: string): Promise<AuctionRoom | null> {
  const { data: auctionData, error: auctionError } = await supabase
    .from('auctions')
    .select('*')
    .eq('auction_code', auctionCode)
    .single();

  if (auctionError || !auctionData) {
    return null;
  }

  // Load teams
  const { data: teamsData, error: teamsError } = await supabase
    .from('teams')
    .select('*')
    .eq('auction_id', auctionData.id);

  if (teamsError) {
    console.error('Error loading teams:', teamsError);
    return null;
  }

  const teams = new Map<number, Team>();
  teamsData?.forEach((t: any) => {
    teams.set(t.id, {
      id: t.id,
      auction_id: t.auction_id,
      team_name: t.team_name,
      logo_url: t.logo_url,
      balance: t.balance,
      player_count: t.player_count,
      role_count: t.role_count,
      status: t.status,
      created_at: t.created_at,
    });
  });

  // Load current player if exists
  let currentPlayer = null;
  if (auctionData.current_player_id) {
    const { data: playerData } = await supabase
      .from('players')
      .select('*')
      .eq('id', auctionData.current_player_id)
      .single();
    
    if (playerData) {
      currentPlayer = playerData;
    }
  }

  // Load current bid team name if exists
  let currentBid = null;
  if (auctionData.current_bid_team_id && auctionData.current_bid_amount) {
    const team = teams.get(auctionData.current_bid_team_id);
    currentBid = {
      team_id: auctionData.current_bid_team_id,
      team_name: team?.team_name || 'Unknown',
      amount: auctionData.current_bid_amount,
    };
  }

  const auctionRoom: AuctionRoom = {
    auction_id: auctionData.id,
    auction_code: auctionData.auction_code,
    host_name: auctionData.host_name,
    starting_balance: auctionData.starting_balance,
    max_teams: auctionData.max_teams,
    status: auctionData.status,
    teams,
    current_player: currentPlayer,
    current_bid: currentBid,
    base_price: auctionData.base_price || 0,
    scoring_formulas: null,
    auctioned_players: auctionData.auctioned_player_ids || [],
  };

  activeAuctions.set(auctionCode, auctionRoom);
  return auctionRoom;
}

/**
 * Get auction room (loads from DB if not in memory)
 */
export async function getAuctionRoom(auctionCode: string): Promise<AuctionRoom | undefined> {
  let room = activeAuctions.get(auctionCode);
  if (!room) {
    room = await loadAuctionFromDB(auctionCode) || undefined;
  }
  return room;
}

/**
 * Get all teams in an auction
 */
export function getAuctionTeams(auctionCode: string): Team[] {
  const auctionRoom = activeAuctions.get(auctionCode);
  if (!auctionRoom) {
    return [];
  }
  return Array.from(auctionRoom.teams.values());
}

/**
 * Complete the auction
 */
export async function completeAuction(auctionCode: string): Promise<void> {
  const auctionRoom = activeAuctions.get(auctionCode);

  if (!auctionRoom) {
    throw new Error('Auction not found');
  }

  // Update auction status in Supabase
  const { error } = await supabase
    .from('auctions')
    .update({ status: 'completed' })
    .eq('auction_code', auctionCode);

  if (error) {
    throw new Error('Failed to complete auction: ' + error.message);
  }

  auctionRoom.status = 'completed';
}

export { supabase };
