import { supabase, getAuctionRoom } from './auctionService';
import { getTeamPlayers } from './playerService';
import {
  ScoringFormulas,
  PlayerScoreBreakdown,
  TeamScoreboard,
  Team,
  BatsmanStats,
  WicketkeeperStats,
  BowlerStats,
  AllrounderStats,
} from '../types';

/**
 * Set scoring formulas for an auction
 */
export function setScoringFormulas(
  auctionCode: string,
  formulas: ScoringFormulas
): { success: boolean; message: string } {
  const auctionRoom = getAuctionRoom(auctionCode);

  if (!auctionRoom) {
    return { success: false, message: 'Auction not found' };
  }

  auctionRoom.scoring_formulas = formulas;

  return { success: true, message: 'Scoring formulas set successfully' };
}

/**
 * Calculate score for a single player based on their role and stats
 */
function calculatePlayerScore(
  role: string,
  stats: any,
  formulas: ScoringFormulas
): number {
  let score = 0;

  switch (role) {
    case 'batsman': {
      const batsmanStats = stats as BatsmanStats;
      const formula = formulas.batsman;
      score =
        batsmanStats.runs * formula.runs_multiplier +
        batsmanStats.highest_score * formula.highest_score_multiplier +
        batsmanStats.strike_rate * formula.strike_rate_multiplier +
        batsmanStats.average * formula.average_multiplier;
      break;
    }

    case 'wicketkeeper': {
      const wkStats = stats as WicketkeeperStats;
      const formula = formulas.wicketkeeper;
      score =
        wkStats.runs * formula.runs_multiplier +
        wkStats.highest_score * formula.highest_score_multiplier +
        wkStats.strike_rate * formula.strike_rate_multiplier +
        wkStats.stumpings * formula.stumpings_multiplier +
        wkStats.catches * formula.catches_multiplier;
      break;
    }

    case 'bowler': {
      const bowlerStats = stats as BowlerStats;
      const formula = formulas.bowler;
      score =
        bowlerStats.wickets * formula.wickets_multiplier +
        bowlerStats.catches * formula.catches_multiplier +
        bowlerStats.runout * formula.runout_multiplier +
        bowlerStats.economy * formula.economy_multiplier;
      break;
    }

    case 'allrounder': {
      const allrounderStats = stats as AllrounderStats;
      const formula = formulas.allrounder;
      score =
        allrounderStats.runs * formula.runs_multiplier +
        allrounderStats.highest_score * formula.highest_score_multiplier +
        allrounderStats.strike_rate * formula.strike_rate_multiplier +
        allrounderStats.wickets * formula.wickets_multiplier;
      break;
    }
  }

  return Math.round(score * 100) / 100; // Round to 2 decimal places
}

/**
 * Calculate final scores for all teams
 */
export async function calculateFinalScores(
  auctionCode: string
): Promise<TeamScoreboard[]> {
  const auctionRoom = getAuctionRoom(auctionCode);

  if (!auctionRoom) {
    throw new Error('Auction not found');
  }

  if (!auctionRoom.scoring_formulas) {
    throw new Error('Scoring formulas not set');
  }

  const teams = Array.from(auctionRoom.teams.values());
  const scoreboards: TeamScoreboard[] = [];

  // Calculate scores for each team
  for (const team of teams) {
    // Check if team is disqualified (less than 15 players)
    if (team.player_count < 15) {
      await supabase
        .from('teams')
        .update({ status: 'disqualified' })
        .eq('id', team.id);
      
      team.status = 'disqualified';
      continue;
    }

    // Fetch team's players
    const soldPlayers = await getTeamPlayers(auctionRoom.auction_id, team.id);

    // Calculate score for each player
    const breakdown: PlayerScoreBreakdown[] = [];
    let totalScore = 0;

    for (const soldPlayer of soldPlayers) {
      const playerScore = calculatePlayerScore(
        soldPlayer.role,
        soldPlayer.stats,
        auctionRoom.scoring_formulas
      );

      breakdown.push({
        player_id: soldPlayer.player_id,
        player_name: soldPlayer.stats.name || 'Unknown',
        role: soldPlayer.role,
        score: playerScore,
      });

      totalScore += playerScore;
    }

    totalScore = Math.round(totalScore * 100) / 100;

    // Save to database
    await supabase.from('final_scores').insert({
      auction_id: auctionRoom.auction_id,
      team_id: team.id,
      total_score: totalScore,
      breakdown: breakdown as any,
    });

    // Add to scoreboard
    scoreboards.push({
      team_id: team.id,
      team_name: team.team_name,
      logo_url: team.logo_url,
      total_score: totalScore,
      player_count: team.player_count,
      rank: 0, // Will be assigned after sorting
      breakdown: breakdown,
    });
  }

  // Sort teams by total score (descending)
  scoreboards.sort((a, b) => b.total_score - a.total_score);

  // Assign ranks
  scoreboards.forEach((scoreboard, index) => {
    scoreboard.rank = index + 1;
  });

  return scoreboards;
}

/**
 * Get disqualified teams
 */
export function getDisqualifiedTeams(auctionCode: string): number[] {
  const auctionRoom = getAuctionRoom(auctionCode);

  if (!auctionRoom) {
    return [];
  }

  const disqualified: number[] = [];

  auctionRoom.teams.forEach((team) => {
    if (team.status === 'disqualified' || team.player_count < 15) {
      disqualified.push(team.id);
    }
  });

  return disqualified;
}
