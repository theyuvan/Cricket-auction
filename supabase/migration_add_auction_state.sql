-- Migration to add auction state persistence columns
-- Run this in your Supabase SQL Editor

-- Add columns to auctions table to store current auction state
ALTER TABLE auctions 
ADD COLUMN IF NOT EXISTS current_player_id BIGINT REFERENCES players(id),
ADD COLUMN IF NOT EXISTS current_bid_team_id BIGINT REFERENCES teams(id),
ADD COLUMN IF NOT EXISTS current_bid_amount INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS base_price INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS auctioned_player_ids INTEGER[] DEFAULT '{}';

-- Add playing_xi column to teams table
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS playing_xi INTEGER[] DEFAULT '{}';

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_auctions_current_player ON auctions(current_player_id);
CREATE INDEX IF NOT EXISTS idx_auctions_current_bid_team ON auctions(current_bid_team_id);

COMMENT ON COLUMN auctions.current_player_id IS 'Current player being auctioned';
COMMENT ON COLUMN auctions.current_bid_team_id IS 'Team with the highest bid';
COMMENT ON COLUMN auctions.current_bid_amount IS 'Current highest bid amount';
COMMENT ON COLUMN auctions.base_price IS 'Base price of current player';
COMMENT ON COLUMN auctions.auctioned_player_ids IS 'Array of player IDs that have been auctioned';
COMMENT ON COLUMN teams.playing_xi IS 'Array of 11 player IDs for the final playing XI';
