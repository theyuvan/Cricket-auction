import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertCircle, Home, Trophy } from "lucide-react";

const Disqualified = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { reason, auctionCode } = location.state || {};

  return (
    <div className="min-h-screen p-4 md:p-8 flex items-center justify-center">
      <Card className="max-w-2xl w-full p-8 bg-card border-destructive">
        <div className="text-center space-y-6">
          <div className="flex justify-center">
            <div className="w-20 h-20 bg-destructive/10 rounded-full flex items-center justify-center">
              <AlertCircle className="w-12 h-12 text-destructive" />
            </div>
          </div>

          <div>
            <h1 className="text-4xl font-bold mb-2 text-destructive">Disqualified</h1>
            <p className="text-lg text-muted-foreground">
              You have been disqualified from this auction
            </p>
          </div>

          <Card className="p-6 bg-destructive/5 border-destructive/20">
            <h2 className="text-lg font-semibold mb-2">Reason for Disqualification</h2>
            <p className="text-muted-foreground">
              {reason || "You do not have enough players to form a team. A minimum of 15 players is required."}
            </p>
          </Card>

          <div className="pt-4 space-y-3">
            <Button
              size="lg"
              variant="outline"
              className="w-full gap-2"
              onClick={() => navigate(`/scoreboard?code=${auctionCode}`)}
            >
              <Trophy className="h-5 w-5" />
              View Leaderboard
            </Button>

            <Button
              size="lg"
              className="w-full gap-2"
              onClick={() => {
                localStorage.removeItem('currentTeam');
                localStorage.removeItem('auctionCode');
                navigate('/');
              }}
            >
              <Home className="h-5 w-5" />
              Go to Home
            </Button>
          </div>

          <p className="text-sm text-muted-foreground">
            Better luck next time! Make sure to acquire at least 15 players to participate in team selection.
          </p>
        </div>
      </Card>
    </div>
  );
};

export default Disqualified;
