// Backend Types for Cricket Auction System

export type PlayerRole = 'batsman' | 'bowler' | 'wicketkeeper' | 'allrounder';

export interface BatsmanStats {
  runs: number;
  highest_score: number;
  strike_rate: number;
  average: number;
}

export interface WicketkeeperStats {
  runs: number;
  highest_score: number;
  strike_rate: number;
  stumpings: number;
  catches: number;
}

export interface BowlerStats {
  wickets: number;
  catches: number;
  runout: number;
  economy: number;
}

export interface AllrounderStats {
  runs: number;
  highest_score: number;
  strike_rate: number;
  wickets: number;
}

export type PlayerStats = BatsmanStats | WicketkeeperStats | BowlerStats | AllrounderStats;

export interface Player {
  id: number;
  name: string;
  role: PlayerRole;
  stats: PlayerStats;
  created_at: string;
}

export interface Auction {
  id: number;
  auction_code: string;
  name: string | null;
  host_name: string;
  starting_balance: number;
  max_teams: number;
  status: 'waiting' | 'live' | 'completed';
  created_at: string;
}

export interface Team {
  id: number;
  auction_id: number;
  team_name: string;
  logo_url: string | null;
  balance: number;
  player_count: number;
  role_count: {
    batsman: number;
    bowler: number;
    allrounder: number;
    wicketkeeper: number;
  };
  status: 'active' | 'disqualified';
  created_at: string;
}

export interface SoldPlayer {
  id: number;
  auction_id: number;
  team_id: number;
  player_id: number;
  sold_price: number;
  role: string;
  stats: PlayerStats;
  created_at: string;
}

export interface FinalScore {
  id: number;
  auction_id: number;
  team_id: number;
  total_score: number | null;
  breakdown: PlayerScoreBreakdown[] | null;
  created_at: string;
}

export interface PlayerScoreBreakdown {
  player_id: number;
  player_name: string;
  role: PlayerRole;
  score: number;
}

// WebSocket Message Types
export interface WSMessage {
  type: string;
  payload: any;
}

export interface BidMessage {
  team_id: number;
  team_name: string;
  amount: number;
}

export interface PlayerAuctionMessage {
  player: Player;
  base_price: number;
}

export interface PlayerSoldMessage {
  player: Player;
  team_id: number;
  team_name: string;
  sold_price: number;
}

export interface ScoreboardMessage {
  teams: TeamScoreboard[];
  disqualified_teams: number[];
}

export interface TeamScoreboard {
  team_id: number;
  team_name: string;
  logo_url: string | null;
  total_score: number;
  player_count: number;
  rank: number;
  breakdown: PlayerScoreBreakdown[];
}

// Auction Room State (In-Memory)
export interface AuctionRoom {
  auction_id: number;
  auction_code: string;
  host_name: string;
  starting_balance: number;
  max_teams: number;
  status: 'waiting' | 'live' | 'completed';
  teams: Map<number, Team>;
  current_player: Player | null;
  current_bid: {
    team_id: number;
    team_name: string;
    amount: number;
  } | null;
  base_price: number;
  scoring_formulas: ScoringFormulas | null;
  auctioned_players: number[]; // player IDs already auctioned
}

export interface ScoringFormulas {
  batsman: {
    runs_multiplier: number;
    highest_score_multiplier: number;
    strike_rate_multiplier: number;
    average_multiplier: number;
  };
  wicketkeeper: {
    runs_multiplier: number;
    highest_score_multiplier: number;
    strike_rate_multiplier: number;
    stumpings_multiplier: number;
    catches_multiplier: number;
  };
  bowler: {
    wickets_multiplier: number;
    catches_multiplier: number;
    runout_multiplier: number;
    economy_multiplier: number;
  };
  allrounder: {
    runs_multiplier: number;
    highest_score_multiplier: number;
    strike_rate_multiplier: number;
    wickets_multiplier: number;
  };
}
