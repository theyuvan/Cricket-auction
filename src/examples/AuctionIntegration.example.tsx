/**
 * Example: Host Auction Component Integration
 * 
 * This example demonstrates how to use the useAuctionWebSocket hook
 * in a host auction component for managing the entire auction flow.
 */

import { useState, useEffect } from 'react';
import { useAuctionWebSocket } from '@/hooks/useAuctionWebSocket';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface Player {
  id: number;
  name: string;
  role: string;
  stats: any;
}

interface Team {
  id: number;
  team_name: string;
  balance: number;
  player_count: number;
  status: string;
}

export function HostAuctionExample() {
  const auctionCode = 'ABC123'; // Get from route params or context
  const apiUrl = 'http://localhost:3000';

  // State management
  const [availablePlayers, setAvailablePlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [currentBid, setCurrentBid] = useState<any>(null);
  const [basePrice, setBasePrice] = useState(1000);
  const [teams, setTeams] = useState<Team[]>([]);

  // Initialize WebSocket connection
  const {
    isConnected,
    error,
    setPlayer,
    markPlayerSold,
    markPlayerUnsold,
    showScoreboard,
  } = useAuctionWebSocket({
    auctionCode,
    
    // Handle WebSocket events
    onJoined: () => {
      console.log('Connected to auction room');
      toast.success('Connected to auction');
    },
    
    onBid: (data) => {
      console.log('New bid received:', data);
      setCurrentBid(data);
      toast.info(`${data.team_name} bid ₹${data.amount}`);
    },
    
    onPlayerSold: (data) => {
      console.log('Player sold:', data);
      setCurrentPlayer(null);
      setCurrentBid(null);
      toast.success(`${data.player.name} sold to ${data.team_name} for ₹${data.sold_price}`);
    },
    
    onPlayerUnsold: () => {
      console.log('Player unsold');
      setCurrentPlayer(null);
      setCurrentBid(null);
      toast.info('Player unsold');
    },
    
    onTeamsUpdate: (data) => {
      console.log('Teams updated:', data.teams);
      setTeams(data.teams);
    },
    
    onShowScoreboard: (data) => {
      console.log('Final scoreboard:', data.scoreboard);
      // Navigate to scoreboard page
    },
  });

  // Fetch available players on mount
  useEffect(() => {
    fetchAvailablePlayers();
    fetchTeams();
  }, []);

  const fetchAvailablePlayers = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auctions/${auctionCode}/available-players`);
      const data = await response.json();
      setAvailablePlayers(data.players);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast.error('Failed to load players');
    }
  };

  const fetchTeams = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auctions/${auctionCode}/teams`);
      const data = await response.json();
      setTeams(data.teams);
    } catch (error) {
      console.error('Error fetching teams:', error);
    }
  };

  const handleSelectPlayer = async (player: Player) => {
    try {
      // Call API to set player in backend
      const response = await fetch(`${apiUrl}/api/auctions/${auctionCode}/set-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: player.id,
          base_price: basePrice,
        }),
      });

      if (response.ok) {
        setCurrentPlayer(player);
        setCurrentBid(null);
        
        // Broadcast to all clients via WebSocket
        setPlayer(player, basePrice);
        
        toast.success(`${player.name} is now on auction`);
      }
    } catch (error) {
      console.error('Error setting player:', error);
      toast.error('Failed to set player');
    }
  };

  const handleSoldPlayer = async () => {
    if (!currentPlayer || !currentBid) {
      toast.error('No active bid');
      return;
    }

    try {
      // Call API to record sold player
      const response = await fetch(`${apiUrl}/api/auctions/${auctionCode}/sell-player`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          player_id: currentPlayer.id,
          team_id: currentBid.team_id,
          sold_price: currentBid.amount,
        }),
      });

      if (response.ok) {
        // Broadcast to all clients
        markPlayerSold(
          currentPlayer,
          currentBid.team_id,
          currentBid.team_name,
          currentBid.amount
        );
        
        // Remove from available players
        setAvailablePlayers(prev => 
          prev.filter(p => p.id !== currentPlayer.id)
        );
      }
    } catch (error) {
      console.error('Error selling player:', error);
      toast.error('Failed to sell player');
    }
  };

  const handleUnsoldPlayer = () => {
    if (!currentPlayer) return;
    
    markPlayerUnsold();
    setCurrentPlayer(null);
    setCurrentBid(null);
  };

  const handleCalculateScores = async () => {
    try {
      const response = await fetch(`${apiUrl}/api/auctions/${auctionCode}/calculate-scores`, {
        method: 'POST',
      });
      
      const data = await response.json();
      
      // Broadcast scoreboard to all clients
      showScoreboard(data.scoreboard);
      
      toast.success('Auction completed! Showing scoreboard...');
    } catch (error) {
      console.error('Error calculating scores:', error);
      toast.error('Failed to calculate scores');
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Host Auction Dashboard</h1>
        <p className="text-muted-foreground">
          Auction Code: <span className="font-mono font-bold">{auctionCode}</span>
          {isConnected ? (
            <span className="ml-4 text-green-600">● Connected</span>
          ) : (
            <span className="ml-4 text-red-600">● Disconnected</span>
          )}
        </p>
      </div>

      {/* Current Player Section */}
      {currentPlayer && (
        <div className="mb-6 p-6 border rounded-lg bg-card">
          <h2 className="text-2xl font-bold mb-4">Current Player on Auction</h2>
          <div className="mb-4">
            <p className="text-xl">{currentPlayer.name}</p>
            <p className="text-muted-foreground">{currentPlayer.role}</p>
            <p className="text-lg mt-2">Base Price: ₹{basePrice}</p>
          </div>

          {currentBid && (
            <div className="mb-4 p-4 bg-green-100 rounded">
              <p className="font-bold">Current Bid: ₹{currentBid.amount}</p>
              <p className="text-sm">by {currentBid.team_name}</p>
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={handleSoldPlayer} disabled={!currentBid}>
              Sold
            </Button>
            <Button onClick={handleUnsoldPlayer} variant="outline">
              Unsold
            </Button>
          </div>
        </div>
      )}

      {/* Available Players List */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Available Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {availablePlayers.map((player) => (
            <div key={player.id} className="p-4 border rounded-lg">
              <p className="font-bold">{player.name}</p>
              <p className="text-sm text-muted-foreground">{player.role}</p>
              <Button
                onClick={() => handleSelectPlayer(player)}
                className="mt-2"
                size="sm"
                disabled={!!currentPlayer}
              >
                Select for Auction
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Teams List */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Teams ({teams.length})</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teams.map((team) => (
            <div key={team.id} className="p-4 border rounded-lg">
              <p className="font-bold">{team.team_name}</p>
              <p className="text-sm">Balance: ₹{team.balance}</p>
              <p className="text-sm">Players: {team.player_count}</p>
              <p className="text-sm">Status: {team.status}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Complete Auction Button */}
      <div className="mt-8">
        <Button
          onClick={handleCalculateScores}
          size="lg"
          disabled={availablePlayers.length > 0}
        >
          Complete Auction & Calculate Scores
        </Button>
      </div>
    </div>
  );
}


/**
 * Example: Team Auction Component Integration
 * 
 * This example shows how teams can place bids during the auction.
 */

export function TeamAuctionExample() {
  const auctionCode = 'ABC123'; // From route params
  const teamId = 1; // From context or local storage
  const teamName = 'Mumbai Indians'; // From context
  const apiUrl = 'http://localhost:3000';

  const [currentPlayer, setCurrentPlayer] = useState<any>(null);
  const [currentBid, setCurrentBid] = useState<any>(null);
  const [basePrice, setBasePrice] = useState(0);
  const [bidAmount, setBidAmount] = useState(0);
  const [myBalance, setMyBalance] = useState(10000);

  const { isConnected, placeBid } = useAuctionWebSocket({
    auctionCode,
    
    onPlayerAuction: (data) => {
      setCurrentPlayer(data.player);
      setBasePrice(data.base_price);
      setBidAmount(data.base_price);
      setCurrentBid(null);
      toast.info(`${data.player.name} is now on auction`);
    },
    
    onBid: (data) => {
      setCurrentBid(data);
      setBidAmount(data.amount + 100); // Next minimum bid
    },
    
    onPlayerSold: (data) => {
      if (data.team_id === teamId) {
        toast.success(`You won ${data.player.name} for ₹${data.sold_price}!`);
        setMyBalance(prev => prev - data.sold_price);
      } else {
        toast.info(`${data.player.name} sold to ${data.team_name}`);
      }
      setCurrentPlayer(null);
      setCurrentBid(null);
    },
    
    onPlayerUnsold: () => {
      toast.info('Player unsold');
      setCurrentPlayer(null);
      setCurrentBid(null);
    },
  });

  const handlePlaceBid = async () => {
    if (bidAmount > myBalance) {
      toast.error('Insufficient balance');
      return;
    }

    try {
      const response = await fetch(`${apiUrl}/api/auctions/${auctionCode}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          team_id: teamId,
          amount: bidAmount,
        }),
      });

      if (response.ok) {
        // Broadcast bid via WebSocket
        placeBid(teamId, teamName, bidAmount);
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to place bid');
      }
    } catch (error) {
      console.error('Error placing bid:', error);
      toast.error('Failed to place bid');
    }
  };

  if (!currentPlayer) {
    return (
      <div className="container mx-auto p-6 text-center">
        <h2 className="text-2xl mb-4">Waiting for next player...</h2>
        <p className="text-muted-foreground">Balance: ₹{myBalance}</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{teamName}</h1>
        <p className="text-muted-foreground">Balance: ₹{myBalance}</p>
      </div>

      <div className="p-6 border rounded-lg bg-card">
        <h2 className="text-2xl font-bold mb-4">Current Player</h2>
        <p className="text-xl">{currentPlayer.name}</p>
        <p className="text-muted-foreground">{currentPlayer.role}</p>
        <p className="text-lg mt-2">Base Price: ₹{basePrice}</p>

        {currentBid && (
          <div className="mt-4 p-4 bg-yellow-100 rounded">
            <p className="font-bold">Current Bid: ₹{currentBid.amount}</p>
            <p className="text-sm">by {currentBid.team_name}</p>
          </div>
        )}

        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Your Bid</label>
            <input
              type="number"
              value={bidAmount}
              onChange={(e) => setBidAmount(Number(e.target.value))}
              className="w-full p-2 border rounded"
              min={currentBid ? currentBid.amount + 100 : basePrice}
              step={100}
            />
          </div>

          <Button
            onClick={handlePlaceBid}
            disabled={!isConnected || bidAmount > myBalance}
            size="lg"
            className="w-full"
          >
            Place Bid ₹{bidAmount}
          </Button>
        </div>
      </div>
    </div>
  );
}
