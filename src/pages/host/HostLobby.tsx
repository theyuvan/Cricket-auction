import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Copy, Check, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuctionWebSocket } from "@/hooks/useAuctionWebSocket";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const HostLobby = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [auction, setAuction] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [startingAuction, setStartingAuction] = useState(false);

  useEffect(() => {
    const auctionData = localStorage.getItem("currentAuction");
    if (auctionData) {
      setAuction(JSON.parse(auctionData));
    } else {
      navigate("/host/create");
    }
  }, [navigate]);

  // Fetch teams list
  useEffect(() => {
    const fetchTeams = async () => {
      if (!auction?.code) return;
      
      try {
        const response = await fetch(`${API_URL}/auctions/${auction.code}/teams`);
        const data = await response.json();
        
        if (response.ok) {
          setTeams(data.teams || []);
        }
      } catch (error) {
        console.error("Error fetching teams:", error);
      }
    };

    fetchTeams();
    // Poll for updates every 2 seconds
    const interval = setInterval(fetchTeams, 2000);

    return () => clearInterval(interval);
  }, [auction?.code]);

  // WebSocket connection for real-time updates
  const { isConnected } = useAuctionWebSocket({
    auctionCode: auction?.code || "",
    onTeamsUpdate: (data) => {
      setTeams(data.teams || []);
    },
  });

  const copyAuctionCode = () => {
    if (auction?.code) {
      navigator.clipboard.writeText(auction.code);
      setCopied(true);
      toast({
        title: "Code Copied",
        description: "Auction code copied to clipboard",
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const startAuction = async () => {
    if (!auction?.code) return;
    
    setStartingAuction(true);
    try {
      const response = await fetch(`${API_URL}/auctions/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auction_code: auction.code,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start auction');
      }

      toast({
        title: "Auction Started!",
        description: "Redirecting to auction room...",
      });

      navigate("/host/auction");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to start auction",
        variant: "destructive",
      });
    } finally {
      setStartingAuction(false);
    }
  };

  if (!auction) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-4xl font-bold mb-4">{auction.auctionName}</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Users className="mr-2 h-4 w-4" />
                {teams.length} / {auction.maxTeams} Teams
              </Badge>
              {isConnected && (
                <Badge variant="outline">
                  <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                  Live
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Card className="p-6 bg-card border-border">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Auction Code</h2>
            <div className="flex items-center gap-4">
              <div className="flex-1 bg-secondary p-4 rounded-lg">
                <p className="text-3xl font-mono tracking-widest text-center font-bold">
                  {auction.code}
                </p>
              </div>
              <Button
                variant="secondary"
                size="lg"
                onClick={copyAuctionCode}
              >
                {copied ? (
                  <Check className="h-5 w-5" />
                ) : (
                  <Copy className="h-5 w-5" />
                )}
              </Button>
            </div>
            <p className="text-sm text-foreground-muted">
              Share this code with team owners to join the auction
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <h2 className="text-xl font-semibold mb-4">Joined Teams</h2>
          {teams.length === 0 ? (
            <p className="text-foreground-muted text-center py-8">
              Waiting for teams to join...
            </p>
          ) : (
            <div className="space-y-3">
              {teams.map((team) => (
                <div
                  key={team.id}
                  className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                >
                  {team.logo_url ? (
                    <img 
                      src={team.logo_url} 
                      alt={team.team_name}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold text-primary-foreground">
                      {team.team_name.charAt(0)}
                    </div>
                  )}
                  <div className="flex-1">
                    <span className="font-medium">{team.team_name}</span>
                  </div>
                  <Badge variant="secondary">
                    ₹{team.balance.toLocaleString()}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Button
          size="lg"
          className="w-full"
          onClick={startAuction}
          disabled={teams.length < 2 || startingAuction}
        >
          {startingAuction ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Starting...
            </>
          ) : (
            "Start Auction"
          )}
        </Button>
      </div>
    </div>
  );
};

export default HostLobby;
