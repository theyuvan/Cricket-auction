-- =============================================
-- Migration: Update Final Scores Table
-- =============================================

-- Drop the existing final_scores table if it exists
DROP TABLE IF EXISTS final_scores CASCADE;

-- Create the updated final_scores table
CREATE TABLE final_scores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_id BIGINT REFERENCES auctions(id) ON DELETE CASCADE,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE UNIQUE,
    team_name TEXT NOT NULL,
    player_ids INTEGER[] NOT NULL,  -- array of 11 player IDs
    wicketkeeper BIGINT NOT NULL,   -- player ID of wicketkeeper
    captain BIGINT NOT NULL,        -- player ID of captain (×2 multiplier)
    vice_captain BIGINT NOT NULL,   -- player ID of vice-captain (×1.5 multiplier)
    total_score NUMERIC NOT NULL,
    breakdown JSONB,                -- optional: store each player's score details
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for score queries
CREATE INDEX idx_final_scores_auction_id ON final_scores(auction_id);
CREATE INDEX idx_final_scores_team_id ON final_scores(team_id);
CREATE INDEX idx_final_scores_total_score ON final_scores(total_score DESC);

-- Allow public operations on final_scores (if RLS is enabled)
-- CREATE POLICY "Allow public operations on final_scores" ON final_scores FOR ALL USING (true);
