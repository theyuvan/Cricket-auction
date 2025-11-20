import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CreateAuction = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    hostName: "",
    auctionName: "",
    maxTeams: "10",
    startingBalance: "10",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const balanceInCR = parseFloat(formData.startingBalance);
    const actualBalance = Math.round(balanceInCR * 10000000);
    
    try {
      // Call backend API to create auction
      const response = await fetch(`${API_URL}/auctions/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host_name: formData.hostName,
          auction_name: formData.auctionName || null,
          starting_balance: actualBalance,
          max_teams: parseInt(formData.maxTeams),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create auction');
      }

      // Store auction details
      const auctionData = {
        auction_id: data.auction.id,
        auctionName: data.auction.auction_name || 'Cricket Auction',
        code: data.auction.auction_code,
        maxTeams: data.auction.max_teams,
        startingBalance: data.auction.starting_balance,
        isHost: true,
      };
      
      localStorage.setItem("currentAuction", JSON.stringify(auctionData));
      
      toast({
        title: "Auction Created!",
        description: `Auction Code: ${data.auction.auction_code}`,
      });
      
      navigate("/host/lobby");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create auction",
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
        <h1 className="text-4xl font-bold mb-8">Create Auction</h1>

        <Card className="p-6 bg-card border-border">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="hostName">Host Name</Label>
              <Input
                id="hostName"
                value={formData.hostName}
                onChange={(e) =>
                  setFormData({ ...formData, hostName: e.target.value })
                }
                placeholder="Enter your name"
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="auctionName">Auction Name (Optional)</Label>
              <Input
                id="auctionName"
                value={formData.auctionName}
                onChange={(e) =>
                  setFormData({ ...formData, auctionName: e.target.value })
                }
                placeholder="E.g., IPL 2024 Auction"
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor="maxTeams">Maximum Teams (2-10)</Label>
              <Input
                id="maxTeams"
                type="number"
                min="2"
                max="10"
                value={formData.maxTeams}
                onChange={(e) =>
                  setFormData({ ...formData, maxTeams: e.target.value })
                }
                required
                className="mt-2"
              />
            </div>

            <div>
              <Label htmlFor=\"startingBalance\">Starting Balance (in Crores)</Label>
              <div className=\"relative mt-2\">
                <Input
                  id=\"startingBalance\"
                  type=\"number\"
                  step=\"0.5\"
                  min=\"1\"
                  value={formData.startingBalance}
                  onChange={(e) =>
                    setFormData({ ...formData, startingBalance: e.target.value })
                  }
                  required
                  className=\"pr-12\"
                />
                <span className=\"absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground\">
                  CR
                </span>
              </div>
              <p className=\"text-xs text-muted-foreground mt-1\">
                Example: 10 CR = ₹10,00,00,000
              </p>
            </div>

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                "Create Auction & Generate Code"
              )}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default CreateAuction;
