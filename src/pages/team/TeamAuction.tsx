import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useAuctionWebSocket } from "@/hooks/useAuctionWebSocket";
import { DollarSign, Users, TrendingUp, Trophy, Loader2 } from "lucide-react";

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
      if (!team?.team_id) return;
      
      try {
        console.log('📡 Fetching acquired players for team:', team.team_id);
        const response = await fetch(`${API_URL}/teams/${team.team_id}/players`);
        const data = await response.json();
        
        if (response.ok && data.players) {
          console.log('✅ Fetched players from API:', data.players);
          setMyPlayers(data.players);
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
        myTeamId: team?.team_id,
        playerName: data.player?.name,
        soldPrice: data.sold_price,
        fullData: data
      });

      if (data.team_id === team?.team_id) {
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
    onAuctionEnded: (data) => {
      toast({
        title: "Auction Ended",
        description: data.message || "The auction has concluded. Time to select your playing XI!",
      });
      // Navigate to select playing XI page
      setTimeout(() => {
        navigate('/team/select-xi');
      }, 2000);
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

        <div className="grid md:grid-cols-2 gap-6">
          {/* Current Player */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Current Player</h2>
            {currentPlayer ? (
              <div className="space-y-4">
                <div>
                  <h3 className="text-3xl font-bold mb-2">{currentPlayer.name}</h3>
                  <div className="flex gap-2">
                  <Badge variant="secondary">{currentPlayer.role}</Badge>
                  <Badge variant="outline">
                    Base: ₹{(currentPlayer.base_price || 5000).toLocaleString()}
                  </Badge>
                  </div>
                </div>

                {bids.length > 0 && (
                  <div className="p-4 bg-secondary rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <TrendingUp className="h-4 w-4" />
                      <span className="font-semibold">Highest Bid</span>
                    </div>
                    <p className="text-2xl font-bold">
                      ₹{bids[bids.length - 1].amount.toLocaleString()}
                    </p>
                    <p className="text-sm text-foreground-muted">
                      by {bids[bids.length - 1].team_name}
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-foreground-muted">
                Waiting for host to start auction...
              </div>
            )}
          </Card>

          {/* Bidding */}
          <Card className="p-6 bg-card border-border">
            <h2 className="text-xl font-semibold mb-4">Place Your Bid</h2>
            {currentPlayer ? (
              <div className="space-y-4">
                <Input
                  type="number"
                  placeholder="Enter bid amount"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="text-2xl font-mono"
                  disabled={!currentPlayer}
                />
                <Button 
                  onClick={placeBid} 
                  className="w-full" 
                  size="lg"
                  disabled={!currentPlayer || loading}
                >
                  {loading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : null}
                  Place Bid
                </Button>

                {bids.length > 0 && (
                  <div className="p-4 bg-secondary rounded-lg max-h-64 overflow-y-auto">
                    <h3 className="font-semibold mb-3">Bid History</h3>
                    <div className="space-y-2">
                      {bids.map((bid, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className={bid.team_id === team?.team_id ? "font-bold text-primary" : ""}>
                            {bid.team_name}
                          </span>
                          <span className="font-bold">
                            ₹{bid.amount.toLocaleString()}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12 text-foreground-muted">
                No player on auction
              </div>
            )}
          </Card>
        </div>

        {/* Squad Summary */}
        <Card className="p-6 bg-card border-border">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="h-5 w-5" />
            <h2 className="text-xl font-semibold">Your Squad</h2>
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
