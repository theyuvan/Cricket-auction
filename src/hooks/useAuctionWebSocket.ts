/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useCallback, useState } from 'react';

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface UseAuctionWebSocketOptions {
  auctionCode: string;
  onMessage?: (message: WebSocketMessage) => void;
  onJoined?: () => void;
  onBid?: (data: { team_id: number; team_name: string; amount: number }) => void;
  onPlayerAuction?: (data: { player: any; base_price: number }) => void;
  onPlayerSold?: (data: { player: any; team_id: number; team_name: string; sold_price: number }) => void;
  onPlayerUnsold?: () => void;
  onTeamsUpdate?: (data: { teams: any[] }) => void;
  onShowScoreboard?: (data: { scoreboard: any }) => void;
  onAuctionEnded?: (data: { message: string }) => void;
}

export function useAuctionWebSocket(options: UseAuctionWebSocketOptions) {
  const {
    auctionCode,
    onMessage,
    onJoined,
    onBid,
    onPlayerAuction,
    onPlayerSold,
    onPlayerUnsold,
    onTeamsUpdate,
    onShowScoreboard,
    onAuctionEnded,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get WebSocket URL from environment or default to localhost
  const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';

  useEffect(() => {
    if (!auctionCode) return;

    // Create WebSocket connection
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      setError(null);

      // Join the auction room
      ws.send(
        JSON.stringify({
          type: 'join_auction',
          payload: { auction_code: auctionCode },
        })
      );
    };

    ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        
        // Call generic message handler
        if (onMessage) {
          onMessage(message);
        }

        // Call specific handlers based on message type
        switch (message.type) {
          case 'joined':
            if (onJoined) onJoined();
            break;

          case 'new_bid':
            if (onBid) onBid(message.payload);
            break;

          case 'player_auction':
            if (onPlayerAuction) onPlayerAuction(message.payload);
            break;

          case 'player_sold':
            if (onPlayerSold) onPlayerSold(message.payload);
            break;

          case 'player_unsold':
            if (onPlayerUnsold) onPlayerUnsold();
            break;

          case 'teams_update':
            if (onTeamsUpdate) onTeamsUpdate(message.payload);
            break;

          case 'show_scoreboard':
            if (onShowScoreboard) onShowScoreboard(message.payload);
            break;

          case 'auction_started':
            // Handled by onMessage callback
            break;

          case 'auction_ended':
            if (onAuctionEnded) onAuctionEnded(message.payload);
            break;

          default:
            console.log('Unknown message type:', message.type);
        }
      } catch (err) {
        console.error('Error parsing WebSocket message:', err);
      }
    };

    ws.onerror = (event) => {
      console.error('WebSocket error:', event);
      setError('WebSocket connection error');
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    // Cleanup on unmount
    return () => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.close();
      }
    };
  }, [auctionCode, WS_URL]);

  // Send a message through WebSocket
  const sendMessage = useCallback((type: string, payload: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type,
          payload,
        })
      );
    } else {
      console.error('WebSocket is not connected');
    }
  }, []);

  // Specific message senders
  const placeBid = useCallback(
    (teamId: number, teamName: string, amount: number) => {
      sendMessage('bid', { team_id: teamId, team_name: teamName, amount });
    },
    [sendMessage]
  );

  const setPlayer = useCallback(
    (player: any, basePrice: number) => {
      sendMessage('set_player', { player, base_price: basePrice });
    },
    [sendMessage]
  );

  const markPlayerSold = useCallback(
    (player: any, teamId: number, teamName: string, soldPrice: number) => {
      sendMessage('player_sold', {
        player,
        team_id: teamId,
        team_name: teamName,
        sold_price: soldPrice,
      });
    },
    [sendMessage]
  );

  const markPlayerUnsold = useCallback(() => {
    sendMessage('player_unsold', {});
  }, [sendMessage]);

  const showScoreboard = useCallback(
    (scoreboard: any) => {
      sendMessage('show_scoreboard', { scoreboard });
    },
    [sendMessage]
  );

  const updateTeams = useCallback(() => {
    sendMessage('update_teams', {});
  }, [sendMessage]);

  return {
    isConnected,
    error,
    sendMessage,
    placeBid,
    setPlayer,
    markPlayerSold,
    markPlayerUnsold,
    showScoreboard,
    updateTeams,
  };
}
