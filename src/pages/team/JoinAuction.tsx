import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const JoinAuction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    auctionCode: "",
    teamName: "",
    teamLogo: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Call backend API to join auction
      const response = await fetch(`${API_URL}/auctions/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          auction_code: formData.auctionCode.toUpperCase(),
          team_name: formData.teamName,
          logo_url: formData.teamLogo || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to join auction');
      }

      // Store team and auction details
      const teamData = {
        team_id: data.team.id,
        teamName: data.team.team_name,
        teamLogo: data.team.logo_url,
        auctionCode: formData.auctionCode.toUpperCase(),
        balance: data.auction.starting_balance,
        isHost: false,
      };
      
      localStorage.setItem("currentTeam", JSON.stringify(teamData));
      localStorage.setItem("auctionCode", formData.auctionCode.toUpperCase());
      
      toast({
        title: "Joined Successfully!",
        description: `Welcome ${formData.teamName}`,
      });
      
      navigate("/team/lobby");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to join auction",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </Button>

      <div className="max-w-2xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">Join Auction</h1>

        <Card className="p-6 bg-card border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="auctionCode">Auction Code</Label>
              <Input
                id="auctionCode"
                value={formData.auctionCode}
                onChange={(e) =>
                  setFormData({ ...formData, auctionCode: e.target.value.toUpperCase() })
                }
                placeholder="Enter 6-digit code"
                maxLength={6}
                required
                className="mt-2 text-2xl font-mono tracking-widest text-center"
              />
            </div>

            <div>
              <Label htmlFor="teamName">Team Name</Label>
              <Input
                id="teamName"
                value={formData.teamName}
                onChange={(e) =>
                  setFormData({ ...formData, teamName: e.target.value })
                }
                placeholder="Enter your team name"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="teamLogo">Team Logo URL (Optional)</Label>
              <Input
                id="teamLogo"
                value={formData.teamLogo}
                onChange={(e) =>
                  setFormData({ ...formData, teamLogo: e.target.value })
                }
                placeholder="https://example.com/logo.png"
                className="mt-2"
              />
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Joining...
                </>
              ) : (
                "Join Auction"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default JoinAuction;
