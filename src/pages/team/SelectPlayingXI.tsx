import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { CheckCircle, Users, TrendingUp } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const SelectPlayingXI = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [auctionCode, setAuctionCode] = useState("");
  const [myPlayers, setMyPlayers] = useState<any[]>([]);
  const [selectedPlayers, setSelectedPlayers] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);

  // Load team data and fetch squad
  useEffect(() => {
    const teamData = localStorage.getItem("currentTeam");
    const storedCode = localStorage.getItem("auctionCode");
    
    if (teamData && storedCode) {
      const parsed = JSON.parse(teamData);
      setTeam(parsed);
      setAuctionCode(storedCode);
      fetchSquad(storedCode, parsed.team_id);
    } else {
      navigate("/team/join");
    }
  }, [navigate]);

  const fetchSquad = async (code: string, teamId: number) => {
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

  const togglePlayer = (playerId: number) => {
    if (selectedPlayers.includes(playerId)) {
      setSelectedPlayers(selectedPlayers.filter(id => id !== playerId));
    } else {
      if (selectedPlayers.length >= 11) {
        toast({
          title: "Maximum Reached",
          description: "You can only select 11 players",
          variant: "destructive",
        });
        return;
      }
      setSelectedPlayers([...selectedPlayers, playerId]);
    }
  };

  const validatePlayingXI = () => {
    if (selectedPlayers.length !== 11) {
      toast({
        title: "Invalid Selection",
        description: "Please select exactly 11 players",
        variant: "destructive",
      });
      return false;
    }

    const selectedPlayerData = myPlayers.filter(p => selectedPlayers.includes(p.player_id));
    const roleCounts = {
      batsman: 0,
      bowler: 0,
      allrounder: 0,
      wicketkeeper: 0,
    };

    selectedPlayerData.forEach(player => {
      roleCounts[player.role as keyof typeof roleCounts]++;
    });

    if (roleCounts.wicketkeeper < 1) {
      toast({
        title: "Invalid Selection",
        description: "You must select at least 1 wicketkeeper",
        variant: "destructive",
      });
      return false;
    }

    if (roleCounts.batsman + roleCounts.allrounder < 3) {
      toast({
        title: "Invalid Selection",
        description: "You need at least 3 batting players (batsmen + allrounders)",
        variant: "destructive",
      });
      return false;
    }

    if (roleCounts.bowler + roleCounts.allrounder < 3) {
      toast({
        title: "Invalid Selection",
        description: "You need at least 3 bowling players (bowlers + allrounders)",
        variant: "destructive",
      });
      return false;
    }

    return true;
  };

  const submitPlayingXI = async () => {
    if (!validatePlayingXI()) return;

    setLoading(true);
    try {
      const response = await fetch(`${API_URL}/teams/${team.team_id}/playing-xi`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          player_ids: selectedPlayers,
          auction_code: auctionCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit playing XI');
      }

      toast({
        title: "Success!",
        description: "Your playing XI has been submitted",
      });

      // Navigate to scoreboard
      setTimeout(() => {
        navigate('/scoreboard');
      }, 1500);
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
      case 'batsman': return 'bg-blue-500/10 text-blue-500';
      case 'bowler': return 'bg-red-500/10 text-red-500';
      case 'allrounder': return 'bg-green-500/10 text-green-500';
      case 'wicketkeeper': return 'bg-yellow-500/10 text-yellow-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8 bg-background">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Select Your Playing XI</h1>
          <p className="text-muted-foreground">Choose 11 players from your squad</p>
          <div className="flex justify-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span>{selectedPlayers.length}/11 Selected</span>
            </div>
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4" />
              <span>{myPlayers.length} Total Players</span>
            </div>
          </div>
        </div>

        <Card className="p-6">
          <h2 className="text-xl font-semibold mb-4">Requirements:</h2>
          <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
            <li>Select exactly 11 players</li>
            <li>At least 1 wicketkeeper</li>
            <li>At least 3 batting players (batsmen + allrounders)</li>
            <li>At least 3 bowling players (bowlers + allrounders)</li>
          </ul>
        </Card>

        {myPlayers.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">No players in your squad</p>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {myPlayers.map((player) => {
              const isSelected = selectedPlayers.includes(player.player_id);
              return (
                <Card
                  key={player.player_id}
                  className={`p-4 cursor-pointer transition-all ${
                    isSelected 
                      ? 'ring-2 ring-primary bg-primary/5' 
                      : 'hover:bg-secondary/50'
                  }`}
                  onClick={() => togglePlayer(player.player_id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="font-semibold text-lg">{player.name || 'Unknown Player'}</div>
                      <div className={`inline-block px-2 py-1 rounded text-xs font-medium mt-2 ${getRoleColor(player.role)}`}>
                        {player.role}
                      </div>
                      <div className="mt-2 text-sm text-muted-foreground">
                        ₹{(player.sold_price || 0).toLocaleString()}
                      </div>
                    </div>
                    {isSelected && (
                      <CheckCircle className="h-6 w-6 text-primary flex-shrink-0" />
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="flex justify-center gap-4 pt-6">
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
            disabled={loading || selectedPlayers.length !== 11}
          >
            {loading ? 'Submitting...' : 'Submit Playing XI'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SelectPlayingXI;
