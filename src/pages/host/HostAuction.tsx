import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuctionWebSocket } from "@/hooks/useAuctionWebSocket";
import { Users, DollarSign, Play, Square, CheckCircle, Loader2 } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const HostAuction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [auction, setAuction] = useState<any>(null);
  const [auctionCode, setAuctionCode] = useState("");
  const [teams, setTeams] = useState<any[]>([]);
  const [allPlayers, setAllPlayers] = useState<any[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<any[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [selectedPlayerId, setSelectedPlayerId] = useState<string>("");
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [isBidding, setIsBidding] = useState(false);
  const [bids, setBids] = useState<any[]>([]);
  const [soldAmount, setSoldAmount] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");
  const [loading, setLoading] = useState(false);
  const [auctionedPlayerIds, setAuctionedPlayerIds] = useState<number[]>([]);
  const [soldPlayers, setSoldPlayers] = useState<any[]>([]);

  // Load auction data and restore state from database
  useEffect(() => {
    const auctionData = localStorage.getItem("currentAuction");
    if (auctionData) {
      const parsed = JSON.parse(auctionData);
      setAuction(parsed);
      setAuctionCode(parsed.code);

      // Fetch full auction state from database
      const fetchAuctionState = async () => {
        try {
          const response = await fetch(`${API_URL}/auctions/${parsed.code}`);
          const data = await response.json();
          
          if (response.ok) {
            // Restore auction state
            if (data.current_player) {
              setCurrentPlayer(data.current_player);
              setIsBidding(true);
            }
            if (data.auctioned_players) {
              setAuctionedPlayerIds(data.auctioned_players);
            }
          }
        } catch (error) {
          console.error("Error fetching auction state:", error);
        }
      };

      fetchAuctionState();
    } else {
      navigate("/host/create");
    }
  }, [navigate]);

  // Fetch teams
  useEffect(() => {
    const fetchTeams = async () => {
      if (!auctionCode) return;
      
      try {
        const response = await fetch(`${API_URL}/auctions/${auctionCode}/teams`);
        const data = await response.json();
        
        if (response.ok) {
          setTeams(data.teams || []);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();
  }, [auctionCode]);

  // Fetch all players
  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const response = await fetch(`${API_URL}/players`);
        const data = await response.json();
        
        if (response.ok) {
          setAllPlayers(data.players || []);
        }
      } catch (error) {
        console.error("Error fetching players:", error);
        toast({
          title: "Error",
          description: "Failed to load players",
          variant: "destructive",
        });
      }
    };

    fetchPlayers();
  }, [toast]);

  // Filter players by role
  useEffect(() => {
    if (selectedRole) {
      const filtered = allPlayers.filter(
        (p) => p.role === selectedRole && !auctionedPlayerIds.includes(p.id)
      );
      setFilteredPlayers(filtered);
      setSelectedPlayerId("");
    } else {
      setFilteredPlayers([]);
      setSelectedPlayerId("");
    }
  }, [selectedRole, allPlayers, auctionedPlayerIds]);

  // WebSocket integration
  const { sendMessage } = useAuctionWebSocket({
    auctionCode,
    onBid: (data) => {
      setBids((prev) => [...prev, data]);
    },
    onTeamsUpdate: (data) => {
      setTeams(data.teams || []);
    },
  });

  const selectPlayer = () => {
    if (!selectedPlayerId) {
      toast({
        title: "No Player Selected",
        description: "Please select a player from the list",
        variant: "destructive",
      });
      return;
    }

    const player = filteredPlayers.find((p) => p.id === parseInt(selectedPlayerId));
    
    if (!player) {
      toast({
        title: "Error",
        description: "Player not found",
        variant: "destructive",
      });
      return;
    }

    // Add base_price if not present (default based on role)
    const basePrice = player.base_price || getBasePrice(player.role);
    const playerWithPrice = { ...player, base_price: basePrice };
    
    setCurrentPlayer(playerWithPrice);
    setBids([]);
    setSoldAmount(basePrice.toString());
    setSelectedTeamId("");

    // Broadcast to all teams
    sendMessage('set_player', {
      auction_code: auctionCode,
      player: playerWithPrice,
      base_price: basePrice,
    });

    toast({
      title: "Player Selected",
      description: `Now showing: ${player.name}`,
    });
  };

  const getBasePrice = (role: string) => {
    const basePrices: Record<string, number> = {
      batsman: 5000,
      bowler: 4500,
      allrounder: 6000,
      wicketkeeper: 5500,
    };
    return basePrices[role] || 5000;
  };

  const startBidding = () => {
    if (!currentPlayer) return;
    
    setIsBidding(true);
    toast({
      title: "Bidding Started",
      description: "Teams can now place bids",
    });
  };

  const stopBidding = () => {
    setIsBidding(false);
    toast({
      title: "Bidding Stopped",
      description: "Ready to mark as sold/unsold",
    });
  };

  const markAsUnsold = () => {
    if (!currentPlayer) return;

    // Broadcast unsold
    sendMessage({
      type: 'player_unsold',
      payload: {
        auction_code: auctionCode,
      },
    });

    toast({
      title: "Player Unsold",
      description: `${currentPlayer.name} went unsold`,
      variant: "destructive",
    });

    // Add to auctioned players
    setAuctionedPlayerIds((prev) => [...prev, currentPlayer.id]);

    setCurrentPlayer(null);
    setBids([]);
    setSelectedPlayerId("");
  };

  const endAuction = async () => {
    if (!auctionCode) return;

    try {
      const response = await fetch(`${API_URL}/auctions/${auctionCode}/end`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to end auction');
      }

      toast({
        title: "Auction Ended",
        description: "The auction has been completed successfully!",
      });

      // Navigate to scoreboard after a short delay
      setTimeout(() => {
        navigate('/scoreboard');
      }, 2000);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to end auction",
        variant: "destructive",
      });
    }
  };

  const markAsSold = async () => {
    if (!selectedTeamId || !soldAmount || !currentPlayer) {
      toast({
        title: "Missing Information",
        description: "Please select a team and enter sold amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Call backend to sell player
      const response = await fetch(`${API_URL}/players/${currentPlayer.id}/sell`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          team_id: parseInt(selectedTeamId),
          sold_price: parseInt(soldAmount),
          auction_code: auctionCode,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to sell player');
      }

      const selectedTeam = teams.find((t) => t.id === parseInt(selectedTeamId));

      // Broadcast sold
      sendMessage({
        type: 'player_sold',
        payload: {
          auction_code: auctionCode,
          player: currentPlayer,
          team_id: parseInt(selectedTeamId),
          team_name: selectedTeam?.team_name || 'Unknown',
          sold_price: parseInt(soldAmount),
        },
      });

      toast({
        title: "Player Sold!",
        description: `${currentPlayer.name} sold to ${selectedTeam?.team_name} for ₹${soldAmount}`,
      });

      // Add to sold players history
      setSoldPlayers((prev) => [{
        player_name: currentPlayer.name,
        player_role: currentPlayer.role,
        team_name: selectedTeam?.team_name,
        sold_price: parseInt(soldAmount),
        timestamp: new Date().toISOString()
      }, ...prev]);

      // Refresh teams
      const teamsResponse = await fetch(`${API_URL}/auctions/${auctionCode}/teams`);
      const teamsData = await teamsResponse.json();
      if (teamsResponse.ok) {
        setTeams(teamsData.teams || []);
      }

      // Add to auctioned players
      setAuctionedPlayerIds((prev) => [...prev, currentPlayer.id]);

      setCurrentPlayer(null);
      setBids([]);
      setSoldAmount("");
      setSelectedTeamId("");
      setSelectedPlayerId("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to sell player",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Host Auction Room</h1>
            <p className="text-sm text-muted-foreground mt-1">Code: {auctionCode}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={endAuction}
              variant="destructive"
              size="lg"
            >
              End Auction
            </Button>
            <select
              value={selectedRole}
              onChange={(e) => setSelectedRole(e.target.value)}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm"
              aria-label="Select player role"
            >
              <option value="">Select Role</option>
              <option value="batsman">Batsman</option>
              <option value="bowler">Bowler</option>
              <option value="allrounder">Allrounder</option>
              <option value="wicketkeeper">Wicketkeeper</option>
            </select>
            
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              disabled={!selectedRole}
              className="px-3 py-2 rounded-md border border-input bg-background text-sm min-w-[200px]"
              aria-label="Select player from filtered list"
            >
              <option value="">
                {selectedRole ? `Select Player (${filteredPlayers.length} available)` : "Select role first"}
              </option>
              {filteredPlayers.map((player) => (
                <option key={player.id} value={player.id.toString()}>
                  {player.name}
                </option>
              ))}
            </select>
            
            <Button 
              onClick={selectPlayer}
              disabled={!selectedPlayerId}
            >
              Select Player
            </Button>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Current Player Card */}
          <Card className="md:col-span-2 p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Current Player</h2>
            {currentPlayer ? (
              <div className="space-y-6">
                <div className="flex items-start gap-4">
                  {/* Player Image */}
                  {currentPlayer.image_url && (
                    <div className="flex-shrink-0">
                      <img 
                        src={currentPlayer.image_url} 
                        alt={currentPlayer.name}
                        className="w-32 h-32 object-cover rounded-lg border-2 border-primary/20"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                  
                  {/* Player Info */}
                  <div className="flex-1 space-y-3">
                    <h3 className="text-3xl font-bold">{currentPlayer.name}</h3>
                    <div className="flex gap-2">
                      <Badge variant="secondary">{currentPlayer.role}</Badge>
                      <Badge variant="outline">Base: ₹{(currentPlayer.base_price || currentPlayer.basePrice || 5000).toLocaleString()}</Badge>
                      {currentPlayer.nation && (
                        <Badge variant="outline">{currentPlayer.nation}</Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* Role-specific Stats */}
                {currentPlayer.stats && (
                  <div className="p-4 bg-secondary/50 rounded-lg">
                    <h4 className="font-semibold mb-3">Player Statistics</h4>
                    <div className="grid grid-cols-2 gap-3">
                      {currentPlayer.role === 'batsman' && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Runs</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.runs || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Highest Score</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.highest_score || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Strike Rate</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.strike_rate || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Average</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.average || 0}</p>
                          </div>
                        </>
                      )}
                      {currentPlayer.role === 'bowler' && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Wickets</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.wickets || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Economy</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.economy || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Catches</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.catches || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Run Out</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.runouts || 0}</p>
                          </div>
                        </>
                      )}
                      {currentPlayer.role === 'allrounder' && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Runs</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.runs || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Wickets</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.wickets || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Highest Score</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.highest_score || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Strike Rate</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.strike_rate || 0}</p>
                          </div>
                        </>
                      )}
                      {currentPlayer.role === 'wicketkeeper' && (
                        <>
                          <div>
                            <p className="text-sm text-muted-foreground">Runs</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.runs || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Highest Score</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.highest_score || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Stumpings</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.dismissals || 0}</p>
                          </div>
                          <div>
                            <p className="text-sm text-muted-foreground">Strike Rate</p>
                            <p className="text-lg font-bold">{currentPlayer.stats.strike_rate || 0}</p>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <Input
                      placeholder="Sold Amount"
                      type="number"
                      value={soldAmount}
                      onChange={(e) => setSoldAmount(e.target.value)}
                    />
                    <select
                      title="Select Team"
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                      value={selectedTeamId}
                      onChange={(e) => setSelectedTeamId(e.target.value)}
                    >
                      <option value="">Select Team</option>
                      {teams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.team_name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={markAsUnsold}
                      variant="destructive"
                      className="w-full"
                      disabled={isBidding}
                    >
                      Mark UNSOLD
                    </Button>
                    <Button
                      onClick={markAsSold}
                      className="w-full"
                      disabled={isBidding || loading}
                    >
                      {loading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <CheckCircle className="mr-2 h-4 w-4" />
                      )}
                      Mark as SOLD
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-foreground-muted">
                Click "Fetch Next Player" to begin
              </div>
            )}
          </Card>

          {/* Sold Players History */}
          {soldPlayers.length > 0 && (
            <Card className="md:col-span-3 p-6 bg-card border-border">
              <h2 className="text-xl font-semibold mb-4">Recently Sold Players</h2>
              <div className="grid md:grid-cols-3 gap-3 max-h-64 overflow-y-auto">
                {soldPlayers.map((sale, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-secondary rounded-lg space-y-2"
                  >
                    <div className="font-semibold">{sale.player_name}</div>
                    <Badge variant="outline" className="text-xs">{sale.player_role}</Badge>
                    <div className="text-sm text-muted-foreground">
                      Sold to: <span className="font-semibold text-foreground">{sale.team_name}</span>
                    </div>
                    <div className="text-sm font-bold text-primary">
                      ₹{sale.sold_price.toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Teams Status */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Teams ({teams.length})</h2>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {teams.length === 0 ? (
                <p className="text-center text-foreground-muted py-4">No teams joined</p>
              ) : (
                teams.map((team) => (
                  <div
                    key={team.id}
                    className="p-3 bg-secondary rounded-lg space-y-2"
                  >
                    <div className="flex items-center gap-2">
                      {team.logo_url ? (
                        <img 
                          src={team.logo_url} 
                          alt={team.team_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">
                          {team.team_name.charAt(0)}
                        </div>
                      )}
                      <div className="font-semibold">{team.team_name}</div>
                    </div>
                    <div className="text-sm text-foreground-muted flex items-center gap-2">
                      <DollarSign className="h-3 w-3" />
                      ₹{team.balance.toLocaleString()}
                    </div>
                    <div className="text-sm text-foreground-muted flex items-center gap-2">
                      <Users className="h-3 w-3" />
                      {team.player_count} / 15 players
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HostAuction;
