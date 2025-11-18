import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Crown, Star, Shield, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface TeamScore {
  team_id: number;
  team_name: string;
  total_score: number;
  player_ids: number[];
  wicketkeeper: number;
  captain: number;
  vice_captain: number;
  submitted_at: string;
}

const Scoreboard = () => {
  const navigate = useNavigate();
  const [teams, setTeams] = useState<TeamScore[]>([]);
  const [loading, setLoading] = useState(true);
  const [auctionCode, setAuctionCode] = useState("");

  useEffect(() => {
    // Get auction code from localStorage
    const storedCode = localStorage.getItem("auctionCode");
    if (storedCode) {
      setAuctionCode(storedCode);
      fetchScoreboard(storedCode);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchScoreboard = async (code: string) => {
    try {
      setLoading(true);
      console.log('Fetching scoreboard for auction:', code);
      console.log('API URL:', `${API_URL}/auctions/${code}/scoreboard`);
      
      const response = await fetch(`${API_URL}/auctions/${code}/scoreboard`);
      const data = await response.json();
      
      console.log('Scoreboard response:', data);
      console.log('Response status:', response.ok);
      
      if (response.ok) {
        // Sort by total_score in descending order
        const sortedTeams = (data.teams || []).sort(
          (a: TeamScore, b: TeamScore) => b.total_score - a.total_score
        );
        console.log('Sorted teams:', sortedTeams);
        setTeams(sortedTeams);
      } else {
        console.error('Failed to fetch scoreboard:', data);
      }
    } catch (error) {
      console.error("Error fetching scoreboard:", error);
    } finally {
      setLoading(false);
    }
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-8 w-8 text-yellow-500" />;
      case 2:
        return <Medal className="h-7 w-7 text-gray-400" />;
      case 3:
        return <Medal className="h-6 w-6 text-orange-600" />;
      default:
        return <Trophy className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1:
        return "border-yellow-500/50 bg-yellow-500/5";
      case 2:
        return "border-gray-400/50 bg-gray-400/5";
      case 3:
        return "border-orange-600/50 bg-orange-600/5";
      default:
        return "border-border";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading scoreboard...</p>
        </div>
      </div>
    );
  }

  if (!auctionCode) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="p-8 text-center max-w-md">
          <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-2xl font-bold mb-2">No Auction Found</h2>
          <p className="text-muted-foreground mb-6">
            Please join an auction first to view the scoreboard.
          </p>
          <Button onClick={() => navigate("/")}>
            Go to Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Trophy className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold">Final Scoreboard</h1>
          <p className="text-muted-foreground">Auction Code: {auctionCode}</p>
          {teams.length > 0 && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {teams.length} Team{teams.length !== 1 ? 's' : ''} Submitted
            </Badge>
          )}
        </div>

        {teams.length === 0 ? (
          <Card className="p-12 text-center">
            <Trophy className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">No Scores Yet</h2>
            <p className="text-muted-foreground mb-6">
              Waiting for teams to submit their playing XI...
            </p>
            <Button 
              onClick={() => fetchScoreboard(auctionCode)}
              variant="outline"
            >
              Refresh
            </Button>
          </Card>
        ) : (
          <>
            <div className="space-y-4">
              {teams.map((team, index) => {
                const rank = index + 1;
                return (
                  <Card
                    key={team.team_id}
                    className={`p-6 transition-all ${getRankColor(rank)}`}
                  >
                    <div className="flex items-center gap-6">
                      <div className="flex items-center justify-center w-16">
                        {getRankIcon(rank)}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-2xl font-bold">{team.team_name}</h3>
                          {rank === 1 && (
                            <Badge className="bg-yellow-500 text-white">
                              Winner
                            </Badge>
                          )}
                        </div>
                        <div className="flex gap-6 text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Trophy className="h-4 w-4" />
                            {team.player_ids.length} Players
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-primary" />
                            Captain
                          </span>
                          <span className="flex items-center gap-1">
                            <Star className="h-4 w-4 text-orange-500" />
                            Vice-Captain
                          </span>
                          <span className="flex items-center gap-1">
                            <Shield className="h-4 w-4 text-yellow-500" />
                            Wicketkeeper
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-muted-foreground mb-1">
                          Total Score
                        </div>
                        <div className="text-3xl font-bold text-primary">
                          {Math.round(team.total_score).toLocaleString()}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          points
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>

            <div className="flex justify-center gap-4 pt-4">
              <Button 
                onClick={() => fetchScoreboard(auctionCode)}
                variant="outline"
              >
                Refresh Scores
              </Button>
              <Button onClick={() => navigate("/")}>
                Back to Home
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Scoreboard;
