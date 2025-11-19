import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuctionWebSocket } from "@/hooks/useAuctionWebSocket";
import { DollarSign, Users, TrendingUp, Trophy, Loader2, RefreshCw } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const TeamAuction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [auctionCode, setAuctionCode] = useState("");
  const [balance, setBalance] = useState(0);
  const [playerCount, setPlayerCount] = useState(0);
  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [bids, setBids] = useState<any[]>([]);
  const [bidAmount, setBidAmount] = useState("");
  const [myPlayers, setMyPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Refresh squad function
  const refreshSquad = async () => {
    if (!team?.team_id) return;
    
    setRefreshing(true);
    try {
      const response = await fetch(`${API_URL}/teams/${team.team_id}/players`);
      const data = await response.json();
      
      if (response.ok && data.players) {
        setMyPlayers(data.players);
        toast({
          title: "Squad Refreshed",
          description: `Updated with ${data.players.length} players`,
        });
      }
    } catch (error) {
      console.error("Error refreshing squad:", error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh squad data",
        variant: "destructive",
      });
    } finally {
      setRefreshing(false);
    }
  };

  // Load team data and restore state from database
  useEffect(() => {
    const teamData = localStorage.getItem("currentTeam");
    const storedCode = localStorage.getItem("auctionCode");
    
    if (teamData && storedCode) {
      const parsed = JSON.parse(teamData);
      setTeam(parsed);
      setAuctionCode(storedCode);
      setBalance(parsed.balance);

      // Fetch full auction state from database
      const fetchAuctionState = async () => {
        try {
          const response = await fetch(`${API_URL}/auctions/${storedCode}`);
          const data = await response.json();
          
          if (response.ok) {
            // Restore current player if there is one
            if (data.current_player) {
              setCurrentPlayer(data.current_player);
            }
          }
        } catch (error) {
          console.error("Error fetching auction state:", error);
        }
      };

      fetchAuctionState();
    } else {
      navigate("/team/join");
    }
  }, [navigate]);

  // Fetch acquired players on mount
  useEffect(() => {
    const fetchAcquiredPlayers = async () => {
      if (!team?.team_id) {
        console.log('⚠️ No team ID, skipping player fetch');
        return;
      }
      
      try {
        console.log('📡 Fetching acquired players for team:', team.team_id);
        const response = await fetch(`${API_URL}/teams/${team.team_id}/players`);
        const data = await response.json();
        
        console.log('API Response:', { status: response.status, ok: response.ok, data });
        
        if (response.ok && data.players) {
          console.log('✅ Fetched players from API:', data.players);
          console.log('Number of players:', data.players.length);
          setMyPlayers(data.players);
        } else {
          console.log('❌ Failed to fetch players or no players returned');
        }
      } catch (error) {
        console.error("Error fetching acquired players:", error);
      }
    };

    fetchAcquiredPlayers();
  }, [team?.team_id]);

  // Log myPlayers changes for debugging
  useEffect(() => {
    console.log('👥 My Players Updated:', myPlayers);
  }, [myPlayers]);

  // Fetch team data periodically
  useEffect(() => {
    const fetchTeamData = async () => {
      if (!auctionCode || !team?.team_id) return;
      
      try {
        const response = await fetch(`${API_URL}/auctions/${auctionCode}/teams`);
        const data = await response.json();
        
        if (response.ok) {
          const myTeam = data.teams.find((t: any) => t.id === team.team_id);
          if (myTeam) {
            setBalance(myTeam.balance);
            setPlayerCount(myTeam.player_count);
          }
        }
      } catch (error) {
        console.error("Error fetching team data:", error);
      }
    };

    fetchTeamData();
    const interval = setInterval(fetchTeamData, 5000);
    return () => clearInterval(interval);
  }, [auctionCode, team?.team_id]);

  // WebSocket integration
  const { sendMessage, isConnected } = useAuctionWebSocket({
    auctionCode,
    onPlayerAuction: (data) => {
      setCurrentPlayer(data.player);
      setBids([]);
      setBidAmount("");
      toast({
        title: "New Player",
        description: `${data.player.name} is now up for auction!`,
      });
    },
    onBid: (data) => {
      setBids((prev) => [...prev, data]);
    },
    onPlayerSold: (data) => {
      console.log('🏏 Player sold event received:', {
        receivedTeamId: data.team_id,
        receivedTeamIdType: typeof data.team_id,
        myTeamId: team?.team_id,
        myTeamIdType: typeof team?.team_id,
        playerName: data.player?.name,
        soldPrice: data.sold_price,
        comparison: data.team_id === team?.team_id,
        looseComparison: data.team_id == team?.team_id,
        fullData: data
      });

      // Use loose comparison to handle number vs string mismatch
      if (data.team_id == team?.team_id) {
        // Add player with all details including name, role, and sold_price
        const newPlayer = {
          player_id: data.player.id,
          name: data.player.name,
          role: data.player.role,
          sold_price: data.sold_price,
          stats: data.player.stats
        };
        
        console.log('✅ This is MY team! Adding player:', newPlayer);
        
        // Check if player already exists to avoid duplicates
        setMyPlayers((prev) => {
          const exists = prev.some(p => p.player_id === newPlayer.player_id);
          if (exists) {
            console.log('⚠️ Player already exists in squad');
            return prev;
          }
          console.log('✅ Player added to squad successfully');
          return [...prev, newPlayer];
        });
        
        toast({
          title: "Player Acquired!",
          description: `You got ${data.player.name} for ₹${data.sold_price.toLocaleString()}`,
        });
      } else {
        console.log('❌ Not my team, just showing notification');
        toast({
          title: "Player Sold",
          description: `${data.player.name} sold to ${data.team_name} for ₹${data.sold_price.toLocaleString()}`,
        });
      }
      setCurrentPlayer(null);
      setBids([]);
    },
    onPlayerUnsold: () => {
      toast({
        title: "Player Unsold",
        description: `${currentPlayer?.name} went unsold`,
        variant: "destructive",
      });
      setCurrentPlayer(null);
      setBids([]);
    },
    onTeamsUpdate: (data) => {
      // Update balance and player count when teams are updated
      const myTeam = data.teams.find((t: any) => t.id === team?.team_id);
      if (myTeam) {
        setBalance(myTeam.balance);
        setPlayerCount(myTeam.player_count);
      }
    },
    onAuctionEnded: async (data) => {
      // Check if team has at least 15 players
      const playersResponse = await fetch(`${API_URL}/teams/${team?.team_id}/players`);
      const playersData = await playersResponse.json();
      const playerCount = playersData.players?.length || 0;
      
      if (playerCount < 15) {
        // Team is disqualified
        toast({
          title: "Disqualified",
          description: `You need at least 15 players. You only have ${playerCount} players.`,
          variant: "destructive",
        });
        // Navigate to disqualified page
        setTimeout(() => {
          navigate('/team/disqualified', { 
            state: { 
              reason: `Insufficient players: ${playerCount}/15 required`,
              auctionCode 
            } 
          });
        }, 2000);
      } else {
        toast({
          title: "Auction Ended",
          description: data.message || "The auction has concluded. Time to select your playing XI!",
        });
        // Navigate to select playing XI page
        setTimeout(() => {
          navigate('/team/select-xi');
        }, 2000);
      }
    },
  });

  const placeBid = () => {
    if (!bidAmount || !currentPlayer) {
      toast({
        title: "Invalid Bid",
        description: "Please enter a bid amount",
        variant: "destructive",
      });
      return;
    }

    const amount = parseInt(bidAmount);
    const minBid = currentPlayer.base_price || 5000;

    if (amount < minBid) {
      toast({
        title: "Bid Too Low",
        description: `Minimum bid is ₹${minBid.toLocaleString()}`,
        variant: "destructive",
      });
      return;
    }

    if (amount > balance) {
      toast({
        title: "Insufficient Balance",
        description: "You don't have enough balance",
        variant: "destructive",
      });
      return;
    }

    // Send bid via WebSocket
    sendMessage({
      type: 'bid',
      payload: {
        auction_code: auctionCode,
        team_id: team.team_id,
        team_name: team.teamName,
        amount: amount,
      },
    });

    toast({
      title: "Bid Placed",
      description: `₹${amount.toLocaleString()}`,
    });

    setBidAmount("");
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">{team?.teamName || "Team Auction Room"}</h1>
            {isConnected && (
              <Badge variant="outline" className="mt-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <div className="flex gap-4">
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <DollarSign className="mr-2 h-4 w-4" />
              ₹{balance.toLocaleString()}
            </Badge>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              <Users className="mr-2 h-4 w-4" />
              {playerCount} / 15
            </Badge>
          </div>
        </div>
        {/* Current Player Being Auctioned */}
        {currentPlayer && (
          <Card className="p-6 bg-primary/5 border-primary/20">
            <h2 className="text-xl font-semibold mb-4">Current Player</h2>
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-4">
                {/* Player Image */}
                {currentPlayer.image_url && (
                  <div className="flex-shrink-0">
                    <img 
                      src={currentPlayer.image_url} 
                      alt={currentPlayer.name}
                      className="w-24 h-24 md:w-32 md:h-32 object-cover rounded-lg border-2 border-primary/20"
                      onError={(e) => {
                        // Hide image if it fails to load
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                )}
                
                {/* Player Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3">
                    <h2 className="text-2xl font-bold">{currentPlayer.name}</h2>
                    <Badge 
                      variant="outline" 
                      className={`
                        ${currentPlayer.role === 'batsman' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' : ''}
                        ${currentPlayer.role === 'bowler' ? 'bg-red-500/10 text-red-500 border-red-500/20' : ''}
                        ${currentPlayer.role === 'allrounder' ? 'bg-green-500/10 text-green-500 border-green-500/20' : ''}
                        ${currentPlayer.role === 'wicketkeeper' ? 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' : ''}
                      `}
                    >
                      {currentPlayer.role}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Base Price: ₹{(currentPlayer.base_price || 0).toLocaleString()}
                  </p>
                  {currentPlayer.nation && (
                    <p className="text-sm text-muted-foreground">
                      Nation: {currentPlayer.nation}
                    </p>
                  )}
                </div>
              </div>

              {/* Player Stats */}
              {currentPlayer.stats && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-secondary/50 rounded-lg">
                  {currentPlayer.role === 'batsman' && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.runs || 0}</div>
                        <div className="text-xs text-muted-foreground">Runs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.strike_rate || currentPlayer.stats.strikeRate || 0}</div>
                        <div className="text-xs text-muted-foreground">Strike Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.highest_score || currentPlayer.stats.best || 0}</div>
                        <div className="text-xs text-muted-foreground">Highest score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.average || 0}</div>
                        <div className="text-xs text-muted-foreground">Average</div>
                      </div>
                    </>
                  )}
                  
                  {currentPlayer.role === 'bowler' && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.wickets || 0}</div>
                        <div className="text-xs text-muted-foreground">Wickets</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.economy || 0}</div>
                        <div className="text-xs text-muted-foreground">Economy</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.catches || 0}</div>
                        <div className="text-xs text-muted-foreground">Catches</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.runout || currentPlayer.stats.runOuts || 0}</div>
                        <div className="text-xs text-muted-foreground">Run Outs</div>
                      </div>
                    </>
                  )}
                  
                  {currentPlayer.role === 'wicketkeeper' && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.runs || 0}</div>
                        <div className="text-xs text-muted-foreground">Runs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.strike_rate || currentPlayer.stats.strikeRate || 0}</div>
                        <div className="text-xs text-muted-foreground">Strike Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.best || 0}</div>
                        <div className="text-xs text-muted-foreground">Highest Score</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.dismissals || 0}</div>
                        <div className="text-xs text-muted-foreground">Stumpings</div>
                      </div>
                    </>
                  )}
                  
                  {currentPlayer.role === 'allrounder' && (
                    <>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.runs || 0}</div>
                        <div className="text-xs text-muted-foreground">Runs</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.strike_rate || currentPlayer.stats.strikeRate || 0}</div>
                        <div className="text-xs text-muted-foreground">Strike Rate</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.wickets || 0}</div>
                        <div className="text-xs text-muted-foreground">Wickets</div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">{currentPlayer.stats.highest_score || currentPlayer.stats.best || 0}</div>
                        <div className="text-xs text-muted-foreground">Best</div>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </Card>
        )}

        {/* Squad Summary */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Your Squad</h2>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshSquad}
              disabled={refreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
          {myPlayers.length === 0 ? (
            <div className="text-center py-8 text-foreground-muted">
              No players acquired yet
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {myPlayers.map((player, i) => (
                <div key={i} className="p-4 bg-secondary rounded-lg">
                  <div className="font-semibold">{player.name}</div>
                  <div className="flex gap-2 mt-2">
                    <Badge variant="outline">{player.role}</Badge>
                    <Badge variant="secondary">₹{(player.sold_price || 0).toLocaleString()}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default TeamAuction;
