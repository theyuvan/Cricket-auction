import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Star, Shield } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface Player {
  player_id: number;
  name: string;
  role: 'batsman' | 'bowler' | 'allrounder' | 'wicketkeeper';
  sold_price: number;
  stats: {
    runs?: number;
    strikeRate?: number;
    average?: number;
    best?: number;
    wickets?: number;
    catches?: number;
    runOuts?: number;
    economy?: number;
    stumpings?: number;
  };
}

const SelectPlayingXI = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [auctionCode, setAuctionCode] = useState("");
  const [myPlayers, setMyPlayers] = useState<Player[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<(number | null)[]>(Array(11).fill(null));
  const [wicketkeeper, setWicketkeeper] = useState<number | null>(null);
  const [captain, setCaptain] = useState<number | null>(null);
  const [viceCaptain, setViceCaptain] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  // Load team data and fetch squad
  useEffect(() => {
    const teamData = localStorage.getItem("currentTeam");
    const storedCode = localStorage.getItem("auctionCode");
    
    if (teamData && storedCode) {
      const parsed = JSON.parse(teamData);
      setTeam(parsed);
      setAuctionCode(storedCode);
      fetchSquad(parsed.team_id);
    } else {
      navigate("/team/join");
    }
  }, [navigate]);

  const fetchSquad = async (teamId: number) => {
    try {
      const response = await fetch(`${API_URL}/teams/${teamId}/players`);
      const data = await response.json();
      
      if (response.ok) {
        setMyPlayers(data.players || []);
      }
    } catch (error) {
      console.error("Error fetching squad:", error);
    }
  };

  // Calculate player score based on role (and whether they're playing as main WK or batsman)
  const calculatePlayerScore = (player: Player, isMainWicketkeeper: boolean = false): number => {
    const stats = player.stats || {};
    let score = 0;

    // If player is a wicketkeeper but NOT the main WK, treat as batsman
    const effectiveRole = player.role === 'wicketkeeper' && !isMainWicketkeeper ? 'batsman' : player.role;

    switch (effectiveRole) {
      case 'batsman':
        // 🏏 BATSMAN = (Runs * 1) + (SR * 2.5) + (Best * 5) + (Average * 15)
        score = 
          (stats.runs || 0) * 1 +
          (stats.strikeRate || 0) * 2.5 +
          (stats.best || 0) * 5 +
          (stats.average || 0) * 15;
        break;

      case 'allrounder':
        // 🧢 ALL-ROUNDER = (Runs * 1) + (SR * 2.5) + (Best * 5) + (Wickets * 30)
        score = 
          (stats.runs || 0) * 1 +
          (stats.strikeRate || 0) * 2.5 +
          (stats.best || 0) * 5 +
          (stats.wickets || 0) * 30;
        break;

      case 'bowler':
        // 🎯 BOWLER = (Wickets * 30) + (Catches * 20) + (Run Outs * 15) + (4000 / Economy)
        score = 
          (stats.wickets || 0) * 30 +
          (stats.catches || 0) * 20 +
          (stats.runOuts || 0) * 15 +
          (stats.economy ? 4000 / stats.economy : 0);
        break;

      case 'wicketkeeper':
        // 🧤 WICKETKEEPER = (Runs * 1) + (SR * 2.5) + (Stumpings * 10) + (Best * 5)
        score = 
          (stats.runs || 0) * 1 +
          (stats.strikeRate || 0) * 2.5 +
          (stats.stumpings || 0) * 10 +
          (stats.best || 0) * 5;
        break;
    }

    return Math.round(score);
  };

  // Get available players for a specific position (excluding already selected)
  const getAvailablePlayers = (positionIndex: number) => {
    const currentlySelected = selectedPlayers.filter((id, idx) => id !== null && idx !== positionIndex);
    return myPlayers.filter(player => !currentlySelected.includes(player.player_id));
  };

  // Get selected player IDs as array (excluding nulls)
  const getSelectedPlayerIds = (): number[] => {
    return selectedPlayers.filter((id): id is number => id !== null);
  };

  const handlePlayerSelect = (positionIndex: number, playerId: string) => {
    const newSelected = [...selectedPlayers];
    newSelected[positionIndex] = playerId ? parseInt(playerId) : null;
    setSelectedPlayers(newSelected);
  };

  const validatePlayingXI = (): boolean => {
    const selectedIds = getSelectedPlayerIds();
    
    // Check if all 11 players are selected
    if (selectedIds.length !== 11) {
      toast({
        title: "Incomplete Selection",
        description: "Please select all 11 players",
        variant: "destructive",
      });
      return false;
    }

    // Check if wicketkeeper is selected
    if (!wicketkeeper) {
      toast({
        title: "Missing Wicketkeeper",
        description: "Please select a wicketkeeper",
        variant: "destructive",
      });
      return false;
    }

    // Check if captain is selected
    if (!captain) {
      toast({
        title: "Missing Captain",
        description: "Please select a captain",
        variant: "destructive",
      });
      return false;
    }

    // Check if vice-captain is selected
    if (!viceCaptain) {
      toast({
        title: "Missing Vice-Captain",
        description: "Please select a vice-captain",
        variant: "destructive",
      });
      return false;
    }

    // Check if captain and vice-captain are different
    if (captain === viceCaptain) {
      toast({
        title: "Invalid Selection",
        description: "Captain and vice-captain must be different players",
        variant: "destructive",
      });
      return false;
    }

    // Check if wicketkeeper, captain, and vice-captain are in the selected XI
    if (!selectedIds.includes(wicketkeeper)) {
      toast({
        title: "Invalid Wicketkeeper",
        description: "Wicketkeeper must be in your playing XI",
        variant: "destructive",
      });
      return false;
    }

    if (!selectedIds.includes(captain)) {
      toast({
        title: "Invalid Captain",
        description: "Captain must be in your playing XI",
        variant: "destructive",
      });
      return false;
    }

    if (!selectedIds.includes(viceCaptain)) {
      toast({
        title: "Invalid Vice-Captain",
        description: "Vice-captain must be in your playing XI",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const calculateTotalScore = (): number => {
    const selectedIds = getSelectedPlayerIds();
    let totalScore = 0;

    selectedIds.forEach(playerId => {
      const player = myPlayers.find(p => p.player_id === playerId);
      if (!player) return;

      // Check if this player is the main wicketkeeper
      const isMainWK = playerId === wicketkeeper;
      let playerScore = calculatePlayerScore(player, isMainWK);

      // Apply multipliers
      if (playerId === captain) {
        playerScore *= 2;
      } else if (playerId === viceCaptain) {
        playerScore *= 1.5;
      }

      totalScore += playerScore;
    });

    return Math.round(totalScore);
  };

  const submitPlayingXI = async () => {
    if (!validatePlayingXI()) return;

    const totalScore = calculateTotalScore();
    const selectedIds = getSelectedPlayerIds();

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/teams/${team.team_id}/playing-xi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_ids: selectedIds,
          wicketkeeper,
          captain,
          vice_captain: viceCaptain,
          total_score: totalScore,
          auction_code: auctionCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit playing XI');
      }

      toast({
        title: "Success!",
        description: `Your playing XI has been submitted with a total score of ${totalScore.toLocaleString()} points!`,
      });

      // Navigate to scoreboard
      setTimeout(() => {
        navigate('/scoreboard');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit playing XI",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'batsman': return 'bg-blue-500/10 text-blue-500 border-blue-500/20';
      case 'bowler': return 'bg-red-500/10 text-red-500 border-red-500/20';
      case 'allrounder': return 'bg-green-500/10 text-green-500 border-green-500/20';
      case 'wicketkeeper': return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20';
      default: return 'bg-gray-500/10 text-gray-500 border-gray-500/20';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Select Your Playing XI</h1>
          <p className="text-muted-foreground">Choose 11 players and assign roles</p>
          {team && (
            <Badge variant="secondary" className="text-lg px-4 py-2">
              {team.team_name}
            </Badge>
          )}
        </div>

        {myPlayers.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No players in your squad. Please buy players first.</p>
            <Button 
              className="mt-4"
              onClick={() => navigate('/team/auction')}
            >
              Go to Auction
            </Button>
          </Card>
        ) : (
          <>
            {/* Player Selection Grid */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Select 11 Players</h2>
              <div className="grid md:grid-cols-2 gap-4">
                {Array.from({ length: 11 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <label className="text-sm font-medium">
                      Player {index + 1}
                    </label>
                    <Select
                      value={selectedPlayers[index]?.toString() || ""}
                      onValueChange={(value) => handlePlayerSelect(index, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select player" />
                      </SelectTrigger>
                      <SelectContent>
                        {getAvailablePlayers(index).map((player) => (
                          <SelectItem 
                            key={player.player_id} 
                            value={player.player_id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <span>{player.name}</span>
                              <Badge variant="outline" className={`text-xs ${getRoleColor(player.role)}`}>
                                {player.role}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </Card>

            {/* Role Assignments */}
            <Card className="p-6">
              <h2 className="text-xl font-semibold mb-4">Assign Special Roles</h2>
              <div className="grid md:grid-cols-3 gap-4">
                {/* Wicketkeeper */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Shield className="h-4 w-4 text-yellow-500" />
                    Main Wicketkeeper
                  </label>
                  <Select
                    value={wicketkeeper?.toString() || ""}
                    onValueChange={(value) => setWicketkeeper(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Main WK" />
                    </SelectTrigger>
                    <SelectContent>
                      {myPlayers
                        .filter(p => getSelectedPlayerIds().includes(p.player_id))
                        .map((player) => (
                          <SelectItem 
                            key={player.player_id} 
                            value={player.player_id.toString()}
                          >
                            <div className="flex items-center gap-2">
                              <span>{player.name}</span>
                              {player.role === 'wicketkeeper' && (
                                <Badge variant="outline" className="text-xs bg-yellow-500/10 text-yellow-500 border-yellow-500/20">
                                  WK
                                </Badge>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    💡 If you have 2 WKs in XI, select one as main WK. Other WK will be treated as batsman.
                  </p>
                </div>

                {/* Captain */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-primary" />
                    Captain (×2 points)
                  </label>
                  <Select
                    value={captain?.toString() || ""}
                    onValueChange={(value) => setCaptain(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select Captain" />
                    </SelectTrigger>
                    <SelectContent>
                      {myPlayers
                        .filter(p => getSelectedPlayerIds().includes(p.player_id) && p.player_id !== viceCaptain)
                        .map((player) => (
                          <SelectItem 
                            key={player.player_id} 
                            value={player.player_id.toString()}
                          >
                            {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Vice-Captain */}
                <div className="space-y-2">
                  <label className="text-sm font-medium flex items-center gap-2">
                    <Star className="h-4 w-4 text-orange-500" />
                    Vice-Captain (×1.5 points)
                  </label>
                  <Select
                    value={viceCaptain?.toString() || ""}
                    onValueChange={(value) => setViceCaptain(value ? parseInt(value) : null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select VC" />
                    </SelectTrigger>
                    <SelectContent>
                      {myPlayers
                        .filter(p => getSelectedPlayerIds().includes(p.player_id) && p.player_id !== captain)
                        .map((player) => (
                          <SelectItem 
                            key={player.player_id} 
                            value={player.player_id.toString()}
                          >
                            {player.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Submit Button */}
            <div className="flex justify-center gap-4 pt-4">
              <Button
                variant="outline"
                size="lg"
                onClick={() => navigate('/team/auction')}
              >
                Back to Auction
              </Button>
              <Button
                size="lg"
                onClick={submitPlayingXI}
                disabled={loading || getSelectedPlayerIds().length !== 11}
              >
                {loading ? 'Submitting...' : 'Submit Playing XI'}
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SelectPlayingXI;
