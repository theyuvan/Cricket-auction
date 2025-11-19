import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, LogOut } from "lucide-react";
import { useAuctionWebSocket } from "@/hooks/useAuctionWebSocket";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const TeamLobby = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [team, setTeam] = useState<any>(null);
  const [teams, setTeams] = useState<any[]>([]);
  const [auctionCode, setAuctionCode] = useState<string>("");
  const [quitting, setQuitting] = useState(false);

  const quitAuction = async () => {
    if (!team?.team_id) return;
    
    setQuitting(true);
    try {
      const response = await fetch(`${API_URL}/teams/${team.team_id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to quit auction');
      }

      // Clear local storage
      localStorage.removeItem('currentTeam');
      localStorage.removeItem('auctionCode');

      toast({
        title: "Left Auction",
        description: "You have successfully left the auction",
      });

      navigate('/');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to quit auction",
        variant: "destructive",
      });
      setQuitting(false);
    }
  };

  useEffect(() => {
    const teamData = localStorage.getItem("currentTeam");
    const storedCode = localStorage.getItem("auctionCode");
    
    if (teamData) {
      setTeam(JSON.parse(teamData));
    }
    
    if (storedCode) {
      setAuctionCode(storedCode);
    }
    
    if (!teamData || !storedCode) {
      navigate("/team/join");
      return;
    }
  }, [navigate]);

  // Fetch teams list
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
    // Poll for updates every 3 seconds
    const interval = setInterval(fetchTeams, 3000);

    return () => clearInterval(interval);
  }, [auctionCode]);

  // WebSocket connection for real-time updates
  const { isConnected } = useAuctionWebSocket({
    auctionCode,
    onTeamsUpdate: (data) => {
      setTeams(data.teams || []);
    },
    onMessage: (message) => {
      // Listen for auction start
      if (message.type === 'auction_started') {
        navigate("/team/auction");
      }
    },
  });

  if (!team) return null;

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold mb-4">Auction Lobby</h1>
            <Badge variant="secondary" className="text-lg px-4 py-2">
              Joined as {team.teamName}
            </Badge>
          </div>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="lg" disabled={quitting}>
                <LogOut className="mr-2 h-4 w-4" />
                Quit Auction
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Quit Auction?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to leave this auction? You'll need to rejoin with the auction code if you want to participate again.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={quitAuction}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Quit
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>

        <Card className="p-8 bg-card border-border text-center space-y-6">
          <Clock className="w-16 h-16 mx-auto text-primary animate-pulse" />
          <div>
            <h2 className="text-2xl font-semibold mb-2">
              Waiting for Host to Start
            </h2>
            <p className="text-foreground-muted">
              The auction will begin shortly
            </p>
          </div>
        </Card>

        <Card className="p-6 bg-card border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Other Teams</h2>
            {isConnected && (
              <Badge variant="outline" className="text-xs">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Live
              </Badge>
            )}
          </div>
          <div className="space-y-3">
            {teams.length === 0 ? (
              <p className="text-foreground-muted text-center py-4">
                No other teams have joined yet
              </p>
            ) : (
              teams
                .filter((t) => t.team_name !== team.teamName)
                .map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3 bg-secondary rounded-lg"
                  >
                    {t.logo_url ? (
                      <img 
                        src={t.logo_url} 
                        alt={t.team_name}
                        className="w-10 h-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center font-bold text-primary-foreground">
                        {t.team_name.charAt(0)}
                      </div>
                    )}
                    <span className="font-medium">{t.team_name}</span>
                  </div>
                ))
            )}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default TeamLobby;
