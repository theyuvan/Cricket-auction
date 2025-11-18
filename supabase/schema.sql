-- =============================================
-- Cricket Auction System - Complete SQL Schema
-- =============================================

-- ===========================================
-- 1. PLAYERS TABLE (Role + JSON stats)
-- ===========================================
CREATE TABLE players (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    role TEXT CHECK (role IN ('batsman', 'bowler', 'wicketkeeper', 'allrounder')) NOT NULL,
    stats JSONB NOT NULL,       -- stores role-based stats
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Example stats JSON for each role:
-- Batsman: { "runs": 5000, "highest_score": 183, "strike_rate": 92, "average": 48 }
-- Wicketkeeper: { "runs": 3000, "highest_score": 120, "strike_rate": 80, "stumpings": 12, "catches": 33 }
-- Bowler: { "wickets": 150, "catches": 21, "runout": 7, "economy": 6.2 }
-- Allrounder: { "runs": 3500, "highest_score": 140, "strike_rate": 87, "wickets": 60 }

-- Create index for faster player lookups
CREATE INDEX idx_players_role ON players(role);
CREATE INDEX idx_players_name ON players(name);


-- ===========================================
-- 2. AUCTION TABLE
-- ===========================================
CREATE TABLE auctions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_code TEXT UNIQUE NOT NULL,
    name TEXT,
    host_name TEXT NOT NULL,
    starting_balance INT DEFAULT 10000,
    max_teams INT DEFAULT 10,
    status TEXT DEFAULT 'waiting',  -- waiting | live | completed
    current_player_id BIGINT REFERENCES players(id),  -- current player being auctioned
    current_bid_team_id BIGINT REFERENCES teams(id),  -- team with highest bid
    current_bid_amount INT DEFAULT 0,  -- current highest bid amount
    base_price INT DEFAULT 0,  -- base price of current player
    auctioned_player_ids INTEGER[] DEFAULT '{}',  -- array of already auctioned player IDs
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for auction code lookups
CREATE INDEX idx_auctions_code ON auctions(auction_code);
CREATE INDEX idx_auctions_status ON auctions(status);


-- ===========================================
-- 3. TEAMS TABLE
-- ===========================================
CREATE TABLE teams (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_id BIGINT REFERENCES auctions(id) ON DELETE CASCADE,
    team_name TEXT NOT NULL,
    logo_url TEXT,
    balance INT DEFAULT 10000,
    player_count INT DEFAULT 0,
    role_count JSONB DEFAULT '{"batsman":0,"bowler":0,"allrounder":0,"wicketkeeper":0}',
    status TEXT DEFAULT 'active', -- active | disqualified
    playing_xi INTEGER[] DEFAULT '{}',  -- array of player IDs for playing XI
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for team lookups
CREATE INDEX idx_teams_auction_id ON teams(auction_id);
CREATE INDEX idx_teams_status ON teams(status);


-- ===========================================
-- 4. SOLD PLAYERS TABLE (Team Player List)
-- ===========================================
CREATE TABLE sold_players (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_id BIGINT REFERENCES auctions(id) ON DELETE CASCADE,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    player_id BIGINT REFERENCES players(id),
    sold_price INT NOT NULL,
    role TEXT NOT NULL,
    stats JSONB NOT NULL,   -- snapshot of stats at sale time
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for sold player queries
CREATE INDEX idx_sold_players_auction_id ON sold_players(auction_id);
CREATE INDEX idx_sold_players_team_id ON sold_players(team_id);
CREATE INDEX idx_sold_players_player_id ON sold_players(player_id);


-- ===========================================
-- 5. FINAL SCORES TABLE
-- ===========================================
CREATE TABLE final_scores (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    auction_id BIGINT REFERENCES auctions(id) ON DELETE CASCADE,
    team_id BIGINT REFERENCES teams(id) ON DELETE CASCADE,
    total_score NUMERIC,
    breakdown JSONB,     -- store each player's score
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for score queries
CREATE INDEX idx_final_scores_auction_id ON final_scores(auction_id);
CREATE INDEX idx_final_scores_team_id ON final_scores(team_id);
CREATE INDEX idx_final_scores_total_score ON final_scores(total_score DESC);


-- ===========================================
-- 6. SAMPLE DATA - PLAYERS
-- ===========================================

-- Batsmen
INSERT INTO players (name, role, stats) VALUES
('Virat Kohli', 'batsman', '{"runs": 12000, "highest_score": 183, "strike_rate": 92, "average": 57}'),
('Rohit Sharma', 'batsman', '{"runs": 9500, "highest_score": 264, "strike_rate": 89, "average": 48}'),
('Steve Smith', 'batsman', '{"runs": 8000, "highest_score": 239, "strike_rate": 85, "average": 62}'),
('Kane Williamson', 'batsman', '{"runs": 6500, "highest_score": 148, "strike_rate": 81, "average": 54}');

-- Bowlers
INSERT INTO players (name, role, stats) VALUES
('Jasprit Bumrah', 'bowler', '{"wickets": 120, "catches": 25, "runout": 8, "economy": 4.6}'),
('Mitchell Starc', 'bowler', '{"wickets": 195, "catches": 30, "runout": 12, "economy": 5.2}'),
('Rashid Khan', 'bowler', '{"wickets": 150, "catches": 18, "runout": 5, "economy": 4.8}'),
('Trent Boult', 'bowler', '{"wickets": 169, "catches": 22, "runout": 7, "economy": 5.1}');

-- Wicketkeepers
INSERT INTO players (name, role, stats) VALUES
('MS Dhoni', 'wicketkeeper', '{"runs": 10500, "highest_score": 183, "strike_rate": 87, "stumpings": 120, "catches": 256}'),
('Jos Buttler', 'wicketkeeper', '{"runs": 4500, "highest_score": 124, "strike_rate": 96, "stumpings": 35, "catches": 89}'),
('Quinton de Kock', 'wicketkeeper', '{"runs": 5600, "highest_score": 178, "strike_rate": 92, "stumpings": 28, "catches": 102}');

-- Allrounders
INSERT INTO players (name, role, stats) VALUES
('Hardik Pandya', 'allrounder', '{"runs": 1500, "highest_score": 91, "strike_rate": 145, "wickets": 42}'),
('Ben Stokes', 'allrounder', '{"runs": 4700, "highest_score": 258, "strike_rate": 82, "wickets": 70}'),
('Shakib Al Hasan', 'allrounder', '{"runs": 6300, "highest_score": 217, "strike_rate": 78, "wickets": 260}'),
('Glenn Maxwell', 'allrounder', '{"runs": 3200, "highest_score": 145, "strike_rate": 155, "wickets": 53}');


-- ===========================================
-- 7. ENABLE ROW LEVEL SECURITY (Optional)
-- ===========================================

-- If you want to add RLS policies for additional security

-- ALTER TABLE players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE auctions ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE teams ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE sold_players ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE final_scores ENABLE ROW LEVEL SECURITY;

-- Allow public read access to players (since host needs to fetch them)
-- CREATE POLICY "Allow public read access to players" ON players FOR SELECT USING (true);

-- Allow public insert/update on auctions, teams, sold_players, final_scores
-- CREATE POLICY "Allow public operations on auctions" ON auctions FOR ALL USING (true);
-- CREATE POLICY "Allow public operations on teams" ON teams FOR ALL USING (true);
-- CREATE POLICY "Allow public operations on sold_players" ON sold_players FOR ALL USING (true);
-- CREATE POLICY "Allow public operations on final_scores" ON final_scores FOR ALL USING (true);
