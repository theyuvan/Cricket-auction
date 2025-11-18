-- =============================================
-- Cricket Players Table - Complete Setup
-- =============================================

-- ===========================================
-- 1. CREATE PLAYERS TABLE
-- ===========================================
CREATE TABLE players (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name TEXT NOT NULL,
    nation TEXT NOT NULL,
    role TEXT CHECK (role IN ('batsman', 'bowler', 'wicketkeeper', 'allrounder')) NOT NULL,
    stats JSONB NOT NULL,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

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
    current_bid_team_id BIGINT,  -- team with highest bid (FK added later)
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

-- Add foreign key constraint after teams table is created
ALTER TABLE auctions ADD CONSTRAINT fk_auctions_current_bid_team 
    FOREIGN KEY (current_bid_team_id) REFERENCES teams(id);


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
-- 2. INSERT BATSMEN
-- ===========================================
INSERT INTO players (name, nation, role, stats, image_url) VALUES
('Virat Kohli', 'Indian', 'batsman', '{"runs": 7820, "highest_score": "113*", "strike_rate": 131.5, "average": 39.8}', 'https://gettyimages.in/photos/virat-kohli?phrase=virat%20kohli&sort=mostpopular'),
('Rohit Sharma', 'Indian', 'batsman', '{"runs": 6520, "highest_score": "109*", "strike_rate": 132.8, "average": 31.1}', 'https://gettyimages.in/photos/rohit-sharma?phrase=rohit%20sharma&sort=mostpopular'),
('KL Rahul', 'Indian', 'batsman', '{"runs": 5200, "highest_score": "132*", "strike_rate": 136.2, "average": 45}', 'https://gettyimages.in/photos/kl-rahul?phrase=kl%20rahul&sort=mostpopular'),
('Suresh Raina', 'Indian', 'batsman', '{"runs": 5520, "highest_score": "100*", "strike_rate": 137.4, "average": 34.1}', 'https://gettyimages.in/photos/suresh-raina?phrase=suresh%20raina&sort=mostpopular'),
('Shikhar Dhawan', 'Indian', 'batsman', '{"runs": 6670, "highest_score": "106*", "strike_rate": 127.9, "average": 35.2}', 'https://gettyimages.in/photos/shikhar-dhawan?phrase=shikhar%20dhawan&sort=mostpopular'),
('Gautam Gambhir', 'Indian', 'batsman', '{"runs": 4200, "highest_score": "93", "strike_rate": 123.9, "average": 30.5}', 'https://gettyimages.in/photos/gautam-gambhir?phrase=gautam%20gambhir&sort=mostpopular'),
('Shubman Gill', 'Indian', 'batsman', '{"runs": 3205, "highest_score": "129", "strike_rate": 140.2, "average": 41.3}', 'https://gettyimages.in/photos/shubman-gill?phrase=shubman%20gill&sort=mostpopular'),
('Shreyas Iyer', 'Indian', 'batsman', '{"runs": 3200, "highest_score": "96", "strike_rate": 132.4, "average": 31.8}', 'https://gettyimages.in/photos/shreyas-iyer?phrase=shreyas%20iyer&sort=mostpopular'),
('Prithvi Shaw', 'Indian', 'batsman', '{"runs": 2790, "highest_score": "99", "strike_rate": 146.7, "average": 28}', 'https://gettyimages.in/photos/prithvi-shaw?phrase=prithvi%20shaw&sort=mostpopular'),
('Surya Kumar Yadav', 'Indian', 'batsman', '{"runs": 3905, "highest_score": "103", "strike_rate": 145.5, "average": 32.3}', 'https://gettyimages.in/photos/surya-kumar-yadav?phrase=surya%20kumar%20yadav&sort=mostpopular'),
('Rahul Dravid', 'Indian', 'batsman', '{"runs": 2175, "highest_score": "75*", "strike_rate": 119.1, "average": 27.5}', 'https://gettyimages.in/photos/rahul-dravid?phrase=rahul%20dravid&sort=mostpopular'),
('Sachin Tendulkar', 'Indian', 'batsman', '{"runs": 2334, "highest_score": "100*", "strike_rate": 119.8, "average": 34.8}', 'https://gettyimages.in/photos/sachin-tendulkar?phrase=sachin%20tendulkar&sort=mostpopular'),
('Ajinkya Rahane', 'Indian', 'batsman', '{"runs": 4255, "highest_score": "103*", "strike_rate": 135.2, "average": 32}', 'https://gettyimages.in/photos/ajinkya-rahane?phrase=ajinkya%20rahane&sort=mostpopular'),
('Yuvraj Singh', 'Indian', 'batsman', '{"runs": 2760, "highest_score": "83*", "strike_rate": 129.9, "average": 25.8}', 'https://gettyimages.in/photos/yuvraj-singh?phrase=yuvraj%20singh&sort=mostpopular'),
('Robin Uthappa', 'Indian', 'batsman', '{"runs": 4950, "highest_score": "88", "strike_rate": 134.1, "average": 29.3}', 'https://gettyimages.in/photos/robin-uthappa?phrase=robin%20uthappa&sort=mostpopular'),
('Venkatesh Iyer', 'Indian', 'batsman', '{"runs": 2220, "highest_score": "104*", "strike_rate": 141.5, "average": 35.2}', 'https://gettyimages.in/photos/venkatesh-iyer?phrase=venkatesh%20iyer&sort=mostpopular'),
('Manish Pandey', 'Indian', 'batsman', '{"runs": 3950, "highest_score": "104*", "strike_rate": 128.4, "average": 31.9}', 'https://gettyimages.in/photos/manish-pandey?phrase=manish%20pandey&sort=mostpopular'),
('Ambati Rayudu', 'Indian', 'batsman', '{"runs": 4300, "highest_score": "100*", "strike_rate": 129.2, "average": 29.4}', 'https://gettyimages.in/photos/ambati-rayudu?phrase=ambati%20rayudu&sort=mostpopular'),
('Nitish Rana', 'Indian', 'batsman', '{"runs": 2585, "highest_score": "87", "strike_rate": 135.7, "average": 28.3}', 'https://gettyimages.in/photos/nitish-rana?phrase=nitish%20rana&sort=mostpopular'),
('Ishan Kishan', 'Indian', 'batsman', '{"runs": 2750, "highest_score": "99", "strike_rate": 139.1, "average": 29}', 'https://gettyimages.in/photos/ishan-kishan?phrase=ishan%20kishan&sort=mostpopular'),
('Devdutt Padikkal', 'Indian', 'batsman', '{"runs": 2100, "highest_score": "101*", "strike_rate": 136, "average": 32.1}', 'https://gettyimages.in/photos/devdutt-padikkal?phrase=devdutt%20padikkal&sort=mostpopular'),
('Ruturaj Gaikwad', 'Indian', 'batsman', '{"runs": 2100, "highest_score": "101*", "strike_rate": 137.8, "average": 33.4}', 'https://gettyimages.in/photos/ruturaj-gaikwad?phrase=ruturaj%20gaikwad&sort=mostpopular'),
('Rinku Singh', 'Indian', 'batsman', '{"runs": 1620, "highest_score": "83*", "strike_rate": 146.8, "average": 40.2}', 'https://gettyimages.in/photos/rinku-singh?phrase=rinku%20singh&sort=mostpopular'),
('Suryash Prabhudessai', 'Indian', 'batsman', '{"runs": 970, "highest_score": "56", "strike_rate": 132.4, "average": 21}', 'https://gettyimages.in/photos/suryash-prabhudessai?phrase=suryash%20prabhudessai&sort=mostpopular'),
('Rahul Tripathi', 'Indian', 'batsman', '{"runs": 2105, "highest_score": "93", "strike_rate": 142.7, "average": 30.4}', 'https://gettyimages.in/photos/rahul-tripathi?phrase=rahul%20tripathi&sort=mostpopular'),
('Tilak Varma', 'Indian', 'batsman', '{"runs": 1800, "highest_score": "84*", "strike_rate": 142, "average": 36.5}', 'https://gettyimages.in/photos/tilak-varma?phrase=tilak%20varma&sort=mostpopular'),
('Shah Rukh Khan', 'Indian', 'batsman', '{"runs": 890, "highest_score": "58", "strike_rate": 140.1, "average": 22}', 'https://gettyimages.in/photos/shah-rukh-khan?phrase=shah%20rukh%20khan&sort=mostpopular'),
('Sarfaraz Khan', 'Indian', 'batsman', '{"runs": 1030, "highest_score": "67", "strike_rate": 132.5, "average": 27.3}', 'https://gettyimages.in/photos/sarfaraz-khan?phrase=sarfaraz%20khan&sort=mostpopular'),
('Mayank Agarwal', 'Indian', 'batsman', '{"runs": 2620, "highest_score": "106", "strike_rate": 133.7, "average": 23.9}', 'https://gettyimages.in/photos/mayank-agarwal?phrase=mayank%20agarwal&sort=mostpopular'),
('Karun Nair', 'Indian', 'batsman', '{"runs": 1480, "highest_score": "83", "strike_rate": 129.4, "average": 24.3}', 'https://gettyimages.in/photos/karun-nair?phrase=karun%20nair&sort=mostpopular'),
('Wriddhiman Saha', 'Indian', 'batsman', '{"runs": 2850, "highest_score": "93*", "strike_rate": 128.1, "average": 26.7}', 'https://gettyimages.in/photos/wriddhiman-saha?phrase=wriddhiman%20saha&sort=mostpopular'),
('Kedar Jadhav', 'Indian', 'batsman', '{"runs": 1190, "highest_score": "69", "strike_rate": 129.2, "average": 23.8}', 'https://gettyimages.in/photos/kedar-jadhav?phrase=kedar%20jadhav&sort=mostpopular'),
('Yashasvi Jaiswal', 'Indian', 'batsman', '{"runs": 2010, "highest_score": "124", "strike_rate": 147.5, "average": 33.5}', 'https://gettyimages.in/photos/yashasvi-jaiswal?phrase=yashasvi%20jaiswal&sort=mostpopular'),
('Chris Gayle', 'Overseas', 'batsman', '{"runs": 4950, "highest_score": "175*", "strike_rate": 148.2, "average": 42.9}', 'https://gettyimages.in/photos/chris-gayle?phrase=chris%20gayle&sort=mostpopular'),
('AB de Villiers', 'Overseas', 'batsman', '{"runs": 5160, "highest_score": "133*", "strike_rate": 151.2, "average": 41.8}', 'https://gettyimages.in/photos/ab-de-villiers?phrase=ab%20de%20villiers&sort=mostpopular'),
('David Warner', 'Overseas', 'batsman', '{"runs": 6525, "highest_score": "126*", "strike_rate": 139.9, "average": 41.5}', 'https://gettyimages.in/photos/david-warner?phrase=david%20warner&sort=mostpopular'),
('Shane Watson', 'Overseas', 'batsman', '{"runs": 3890, "highest_score": "117*", "strike_rate": 138.4, "average": 31.2}', 'https://gettyimages.in/photos/shane-watson?phrase=shane%20watson&sort=mostpopular'),
('Faf du Plessis', 'Overseas', 'batsman', '{"runs": 4300, "highest_score": "120*", "strike_rate": 134.6, "average": 37.5}', 'https://gettyimages.in/photos/faf-du-plessis?phrase=faf%20du%20plessis&sort=mostpopular'),
('Brendon McCullum', 'Overseas', 'batsman', '{"runs": 2880, "highest_score": "158*", "strike_rate": 136.7, "average": 29.7}', 'https://gettyimages.in/photos/brendon-mccullum?phrase=brendon%20mccullum&sort=mostpopular'),
('Andre Russell', 'Overseas', 'batsman', '{"runs": 2100, "highest_score": "88*", "strike_rate": 177, "average": 31.8}', 'https://gettyimages.in/photos/andre-russell?phrase=andre%20russell&sort=mostpopular'),
('Kane Williamson', 'Overseas', 'batsman', '{"runs": 2420, "highest_score": "89", "strike_rate": 131.2, "average": 37.8}', 'https://gettyimages.in/photos/kane-williamson?phrase=kane%20williamson&sort=mostpopular'),
('Steve Smith', 'Overseas', 'batsman', '{"runs": 2470, "highest_score": "101", "strike_rate": 126.7, "average": 34.8}', 'https://gettyimages.in/photos/steve-smith?phrase=steve%20smith&sort=mostpopular'),
('Shimron Hetmyer', 'Overseas', 'batsman', '{"runs": 1750, "highest_score": "83", "strike_rate": 139, "average": 28.3}', 'https://gettyimages.in/photos/shimron-hetmyer?phrase=shimron%20hetmyer&sort=mostpopular'),
('Martin Guptill', 'Overseas', 'batsman', '{"runs": 885, "highest_score": "93", "strike_rate": 141.5, "average": 24.5}', 'https://gettyimages.in/photos/martin-guptill?phrase=martin%20guptill&sort=mostpopular'),
('Eoin Morgan', 'Overseas', 'batsman', '{"runs": 1400, "highest_score": "91", "strike_rate": 135, "average": 22.6}', 'https://gettyimages.in/photos/eoin-morgan?phrase=eoin%20morgan&sort=mostpopular'),
('Rilee Rossouw', 'Overseas', 'batsman', '{"runs": 1130, "highest_score": "82*", "strike_rate": 148, "average": 27}', 'https://gettyimages.in/photos/rilee-rossouw?phrase=rilee%20rossouw&sort=mostpopular'),
('Michael Hussey', 'Overseas', 'batsman', '{"runs": 1970, "highest_score": "95*", "strike_rate": 122.9, "average": 38}', 'https://gettyimages.in/photos/michael-hussey?phrase=michael%20hussey&sort=mostpopular'),
('Moeen Ali', 'Overseas', 'batsman', '{"runs": 1650, "highest_score": "93*", "strike_rate": 142.5, "average": 27.6}', 'https://gettyimages.in/photos/moeen-ali?phrase=moeen%20ali&sort=mostpopular');


-- ===========================================
-- 3. INSERT ALLROUNDERS
-- ===========================================
INSERT INTO players (name, nation, role, stats, image_url) VALUES
('Hardik Pandya', 'Indian', 'allrounder', '{"runs": 2400, "highest_score": "91*", "strike_rate": 144.5, "wickets": 72}', 'https://gettyimages.in/photos/hardik-pandya?phrase=hardik%20pandya&sort=mostpopular'),
('Ravindra Jadeja', 'Indian', 'allrounder', '{"runs": 2750, "highest_score": "62*", "strike_rate": 131.2, "wickets": 152}', 'https://gettyimages.in/photos/ravindra-jadeja?phrase=ravindra%20jadeja&sort=mostpopular'),
('Shivam Dube', 'Indian', 'allrounder', '{"runs": 1650, "highest_score": "95*", "strike_rate": 145.8, "wickets": 32}', 'https://gettyimages.in/photos/shivam-dube?phrase=shivam%20dube&sort=mostpopular'),
('Washington Sundar', 'Indian', 'allrounder', '{"runs": 1150, "highest_score": "54", "strike_rate": 124.6, "wickets": 48}', 'https://gettyimages.in/photos/washington-sundar?phrase=washington%20sundar&sort=mostpopular'),
('Krunal Pandya', 'Indian', 'allrounder', '{"runs": 1650, "highest_score": "86", "strike_rate": 135.1, "wickets": 70}', 'https://gettyimages.in/photos/krunal-pandya?phrase=krunal%20pandya&sort=mostpopular'),
('Vijay Shankar', 'Indian', 'allrounder', '{"runs": 1350, "highest_score": "63*", "strike_rate": 132.7, "wickets": 28}', 'https://gettyimages.in/photos/vijay-shankar?phrase=vijay%20shankar&sort=mostpopular'),
('Axar Patel', 'Indian', 'allrounder', '{"runs": 1900, "highest_score": "74*", "strike_rate": 133.1, "wickets": 108}', 'https://gettyimages.in/photos/axar-patel?phrase=axar%20patel&sort=mostpopular'),
('Rishi Dhawan', 'Indian', 'allrounder', '{"runs": 860, "highest_score": "45", "strike_rate": 121.4, "wickets": 45}', 'https://gettyimages.in/photos/rishi-dhawan?phrase=rishi%20dhawan&sort=mostpopular'),
('Stuart Binny', 'Indian', 'allrounder', '{"runs": 930, "highest_score": "48*", "strike_rate": 127.5, "wickets": 36}', 'https://gettyimages.in/photos/stuart-binny?phrase=stuart%20binny&sort=mostpopular'),
('Abhishek Sharma', 'Indian', 'allrounder', '{"runs": 1650, "highest_score": "103", "strike_rate": 152.1, "wickets": 28}', 'https://gettyimages.in/photos/abhishek-sharma?phrase=abhishek%20sharma&sort=mostpopular'),
('Shardul Thakur', 'Indian', 'allrounder', '{"runs": 950, "highest_score": "68", "strike_rate": 147.8, "wickets": 96}', 'https://gettyimages.in/photos/shardul-thakur?phrase=shardul%20thakur&sort=mostpopular'),
('Deepak Hooda', 'Indian', 'allrounder', '{"runs": 1650, "highest_score": "104", "strike_rate": 135.2, "wickets": 19}', 'https://gettyimages.in/photos/deepak-hooda?phrase=deepak%20hooda&sort=mostpopular'),
('Rahul Tewatia', 'Indian', 'allrounder', '{"runs": 1450, "highest_score": "59*", "strike_rate": 147.5, "wickets": 32}', 'https://gettyimages.in/photos/rahul-tewatia?phrase=rahul%20tewatia&sort=mostpopular'),
('Harbhajan Singh', 'Indian', 'allrounder', '{"runs": 850, "highest_score": "49", "strike_rate": 121.9, "wickets": 150}', 'https://gettyimages.in/photos/harbhajan-singh?phrase=harbhajan%20singh&sort=mostpopular'),
('Yusuf Pathan', 'Indian', 'allrounder', '{"runs": 3200, "highest_score": "100*", "strike_rate": 142.1, "wickets": 57}', 'https://gettyimages.in/photos/yusuf-pathan?phrase=yusuf%20pathan&sort=mostpopular'),
('Irfan Pathan', 'Indian', 'allrounder', '{"runs": 1750, "highest_score": "60", "strike_rate": 138.4, "wickets": 104}', 'https://gettyimages.in/photos/irfan-pathan?phrase=irfan%20pathan&sort=mostpopular'),
('Manoj Tiwary', 'Indian', 'allrounder', '{"runs": 1570, "highest_score": "75", "strike_rate": 125.3, "wickets": 24}', 'https://gettyimages.in/photos/manoj-tiwary?phrase=manoj%20tiwary&sort=mostpopular'),
('Kedar Jadhav', 'Indian', 'allrounder', '{"runs": 1250, "highest_score": "69", "strike_rate": 129.2, "wickets": 15}', 'https://gettyimages.in/photos/kedar-jadhav?phrase=kedar%20jadhav&sort=mostpopular'),
('Rajat Bhatia', 'Indian', 'allrounder', '{"runs": 890, "highest_score": "46", "strike_rate": 118.4, "wickets": 71}', 'https://gettyimages.in/photos/rajat-bhatia?phrase=rajat%20bhatia&sort=mostpopular'),
('Vijaykumar Vyshak', 'Indian', 'allrounder', '{"runs": 340, "highest_score": "27", "strike_rate": 120.5, "wickets": 34}', 'https://gettyimages.in/photos/vijaykumar-vyshak?phrase=vijaykumar%20vyshak&sort=mostpopular'),
('Jalaj Saxena', 'Indian', 'allrounder', '{"runs": 450, "highest_score": "31", "strike_rate": 110.2, "wickets": 29}', 'https://gettyimages.in/photos/jalaj-saxena?phrase=jalaj%20saxena&sort=mostpopular'),
('Sandeep Warrier', 'Indian', 'allrounder', '{"runs": 210, "highest_score": "20", "strike_rate": 105.8, "wickets": 18}', 'https://gettyimages.in/photos/sandeep-warrier?phrase=sandeep%20warrier&sort=mostpopular'),
('Baba Aparajith', 'Indian', 'allrounder', '{"runs": 760, "highest_score": "52*", "strike_rate": 119.4, "wickets": 14}', 'https://gettyimages.in/photos/baba-aparajith?phrase=baba%20aparajith&sort=mostpopular'),
('Nitish Reddy', 'Indian', 'allrounder', '{"runs": 990, "highest_score": "64*", "strike_rate": 138.2, "wickets": 22}', 'https://gettyimages.in/photos/nitish-reddy?phrase=nitish%20reddy&sort=mostpopular'),
('Shivam Mavi', 'Indian', 'allrounder', '{"runs": 345, "highest_score": "25", "strike_rate": 121.2, "wickets": 47}', 'https://gettyimages.in/photos/shivam-mavi?phrase=shivam%20mavi&sort=mostpopular'),
('Prerak Mankad', 'Indian', 'allrounder', '{"runs": 690, "highest_score": "52*", "strike_rate": 129, "wickets": 21}', 'https://gettyimages.in/photos/prerak-mankad?phrase=prerak%20mankad&sort=mostpopular'),
('Abhishek Boro', 'Indian', 'allrounder', '{"runs": 520, "highest_score": "39", "strike_rate": 118.2, "wickets": 17}', 'https://gettyimages.in/photos/abhishek-boro?phrase=abhishek%20boro&sort=mostpopular'),
('Darshan Nalkande', 'Indian', 'allrounder', '{"runs": 310, "highest_score": "22", "strike_rate": 124.3, "wickets": 25}', 'https://gettyimages.in/photos/darshan-nalkande?phrase=darshan%20nalkande&sort=mostpopular'),
('Abhishek Nayar', 'Indian', 'allrounder', '{"runs": 715, "highest_score": "45", "strike_rate": 117.5, "wickets": 18}', 'https://gettyimages.in/photos/abhishek-nayar?phrase=abhishek%20nayar&sort=mostpopular'),
('Shreyas Gopal', 'Indian', 'allrounder', '{"runs": 540, "highest_score": "33", "strike_rate": 119.2, "wickets": 57}', 'https://gettyimages.in/photos/shreyas-gopal?phrase=shreyas%20gopal&sort=mostpopular'),
('Pawan Negi', 'Indian', 'allrounder', '{"runs": 620, "highest_score": "42*", "strike_rate": 122.6, "wickets": 39}', 'https://gettyimages.in/photos/pawan-negi?phrase=pawan%20negi&sort=mostpopular'),
('Abhinav Manohar', 'Indian', 'allrounder', '{"runs": 740, "highest_score": "47", "strike_rate": 132.1, "wickets": 7}', 'https://gettyimages.in/photos/abhinav-manohar?phrase=abhinav%20manohar&sort=mostpopular'),
('Aman Khan', 'Indian', 'allrounder', '{"runs": 420, "highest_score": "32", "strike_rate": 129.5, "wickets": 14}', 'https://gettyimages.in/photos/aman-khan?phrase=aman%20khan&sort=mostpopular'),
('Riyan Parag', 'Indian', 'allrounder', '{"runs": 1750, "highest_score": "84", "strike_rate": 138.6, "wickets": 33}', 'https://gettyimages.in/photos/riyan-parag?phrase=riyan%20parag&sort=mostpopular'),
('Lalit Yadav', 'Indian', 'allrounder', '{"runs": 980, "highest_score": "52*", "strike_rate": 126.3, "wickets": 28}', 'https://gettyimages.in/photos/lalit-yadav?phrase=lalit%20yadav&sort=mostpopular'),
('Shivam Singh', 'Indian', 'allrounder', '{"runs": 360, "highest_score": "28", "strike_rate": 118.4, "wickets": 12}', 'https://gettyimages.in/photos/shivam-singh?phrase=shivam%20singh&sort=mostpopular'),
('Tejas Baroka', 'Indian', 'allrounder', '{"runs": 210, "highest_score": "18", "strike_rate": 104.2, "wickets": 17}', 'https://gettyimages.in/photos/tejas-baroka?phrase=tejas%20baroka&sort=mostpopular'),
('Tanush Kotian', 'Indian', 'allrounder', '{"runs": 310, "highest_score": "24", "strike_rate": 109.3, "wickets": 21}', 'https://gettyimages.in/photos/tanush-kotian?phrase=tanush%20kotian&sort=mostpopular'),
('Jacques Kallis', 'Overseas', 'allrounder', '{"runs": 2420, "highest_score": "89", "strike_rate": 113.3, "wickets": 46}', 'https://gettyimages.in/photos/jacques-kallis?phrase=jacques%20kallis&sort=mostpopular'),
('Sam Curran', 'Overseas', 'allrounder', '{"runs": 1480, "highest_score": "92", "strike_rate": 142.2, "wickets": 62}', 'https://gettyimages.in/photos/sam-curran?phrase=sam%20curran&sort=mostpopular'),
('Glenn Maxwell', 'Overseas', 'allrounder', '{"runs": 2900, "highest_score": "95", "strike_rate": 153.4, "wickets": 39}', 'https://gettyimages.in/photos/glenn-maxwell?phrase=glenn%20maxwell&sort=mostpopular'),
('Kieron Pollard', 'Overseas', 'allrounder', '{"runs": 3410, "highest_score": "104", "strike_rate": 149.9, "wickets": 63}', 'https://gettyimages.in/photos/kieron-pollard?phrase=kieron%20pollard&sort=mostpopular'),
('Sunil Narine', 'Overseas', 'allrounder', '{"runs": 1180, "highest_score": "75", "strike_rate": 162.4, "wickets": 175}', 'https://gettyimages.in/photos/sunil-narine?phrase=sunil%20narine&sort=mostpopular'),
('Jason Holder', 'Overseas', 'allrounder', '{"runs": 840, "highest_score": "53*", "strike_rate": 131.5, "wickets": 63}', 'https://gettyimages.in/photos/jason-holder?phrase=jason%20holder&sort=mostpopular'),
('Mitchell Marsh', 'Overseas', 'allrounder', '{"runs": 2100, "highest_score": "89*", "strike_rate": 141.6, "wickets": 44}', 'https://gettyimages.in/photos/mitchell-marsh?phrase=mitchell%20marsh&sort=mostpopular'),
('Cameron Green', 'Overseas', 'allrounder', '{"runs": 1320, "highest_score": "84*", "strike_rate": 143.8, "wickets": 26}', 'https://gettyimages.in/photos/cameron-green?phrase=cameron%20green&sort=mostpopular'),
('Dwayne Bravo', 'Overseas', 'allrounder', '{"runs": 1530, "highest_score": "70*", "strike_rate": 128.8, "wickets": 183}', 'https://gettyimages.in/photos/dwayne-bravo?phrase=dwayne%20bravo&sort=mostpopular'),
('Marcus Stoinis', 'Overseas', 'allrounder', '{"runs": 1780, "highest_score": "89*", "strike_rate": 137.1, "wickets": 41}', 'https://gettyimages.in/photos/marcus-stoinis?phrase=marcus%20stoinis&sort=mostpopular'),
('Ravi Bopara', 'Overseas', 'allrounder', '{"runs": 890, "highest_score": "47*", "strike_rate": 118.4, "wickets": 26}', 'https://gettyimages.in/photos/ravi-bopara?phrase=ravi%20bopara&sort=mostpopular'),
('Daniel Sams', 'Overseas', 'allrounder', '{"runs": 630, "highest_score": "38", "strike_rate": 132.3, "wickets": 42}', 'https://gettyimages.in/photos/daniel-sams?phrase=daniel%20sams&sort=mostpopular'),
('Shakib Al Hasan', 'Overseas', 'allrounder', '{"runs": 750, "highest_score": "66", "strike_rate": 120.3, "wickets": 47}', 'https://gettyimages.in/photos/shakib-al-hasan?phrase=shakib%20al%20hasan&sort=mostpopular'),
('Ben Stokes', 'Overseas', 'allrounder', '{"runs": 1260, "highest_score": "107", "strike_rate": 134.1, "wickets": 28}', 'https://gettyimages.in/photos/ben-stokes?phrase=ben%20stokes&sort=mostpopular'),
('Chris Morris', 'Overseas', 'allrounder', '{"runs": 650, "highest_score": "82*", "strike_rate": 155.6, "wickets": 95}', 'https://gettyimages.in/photos/chris-morris?phrase=chris%20morris&sort=mostpopular'),
('David Wiese', 'Overseas', 'allrounder', '{"runs": 430, "highest_score": "45", "strike_rate": 129.6, "wickets": 28}', 'https://gettyimages.in/photos/david-wiese?phrase=david%20wiese&sort=mostpopular');


-- ===========================================
-- 4. INSERT BOWLERS
-- ===========================================
INSERT INTO players (name, nation, role, stats, image_url) VALUES
('Jasprit Bumrah', 'Indian', 'bowler', '{"wickets": 164, "catches": 8, "runouts": 6, "economy": 5.2}', 'https://gettyimages.in/photos/jasprit-bumrah?phrase=jasprit%20bumrah&sort=mostpopular'),
('Mohammed Shami', 'Indian', 'bowler', '{"wickets": 143, "catches": 7, "runouts": 4, "economy": 5.8}', 'https://gettyimages.in/photos/mohammed-shami?phrase=mohammed%20shami&sort=mostpopular'),
('Ravichandran Ashwin', 'Indian', 'bowler', '{"wickets": 132, "catches": 9, "runouts": 4, "economy": 5.4}', 'https://gettyimages.in/photos/ravichandran-ashwin?phrase=ravichandran%20ashwin&sort=mostpopular'),
('Mohammed Siraj', 'Indian', 'bowler', '{"wickets": 118, "catches": 5, "runouts": 3, "economy": 6}', 'https://gettyimages.in/photos/mohammed-siraj?phrase=mohammed%20siraj&sort=mostpopular'),
('Bhuvneshwar Kumar', 'Indian', 'bowler', '{"wickets": 109, "catches": 6, "runouts": 4, "economy": 6.2}', 'https://gettyimages.in/photos/bhuvneshwar-kumar?phrase=bhuvneshwar%20kumar&sort=mostpopular'),
('Yuzvendra Chahal', 'Indian', 'bowler', '{"wickets": 140, "catches": 8, "runouts": 3, "economy": 7.1}', 'https://gettyimages.in/photos/yuzvendra-chahal?phrase=yuzvendra%20chahal&sort=mostpopular'),
('Kuldeep Yadav', 'Indian', 'bowler', '{"wickets": 126, "catches": 7, "runouts": 2, "economy": 6.8}', 'https://gettyimages.in/photos/kuldeep-yadav?phrase=kuldeep%20yadav&sort=mostpopular'),
('Harshal Patel', 'Indian', 'bowler', '{"wickets": 101, "catches": 6, "runouts": 6, "economy": 7.9}', 'https://gettyimages.in/photos/harshal-patel?phrase=harshal%20patel&sort=mostpopular'),
('Umesh Yadav', 'Indian', 'bowler', '{"wickets": 93, "catches": 3, "runouts": 5, "economy": 7.5}', 'https://gettyimages.in/photos/umesh-yadav?phrase=umesh%20yadav&sort=mostpopular'),
('Ishant Sharma', 'Indian', 'bowler', '{"wickets": 105, "catches": 4, "runouts": 4, "economy": 6.6}', 'https://gettyimages.in/photos/ishant-sharma?phrase=ishant%20sharma&sort=mostpopular'),
('Prasidh Krishna', 'Indian', 'bowler', '{"wickets": 84, "catches": 5, "runouts": 3, "economy": 6.9}', 'https://gettyimages.in/photos/prasidh-krishna?phrase=prasidh%20krishna&sort=mostpopular'),
('T Natarajan', 'Indian', 'bowler', '{"wickets": 78, "catches": 4, "runouts": 2, "economy": 7.2}', 'https://gettyimages.in/photos/t-natarajan?phrase=t%20natarajan&sort=mostpopular'),
('Varun Chakravarthy', 'Indian', 'bowler', '{"wickets": 82, "catches": 3, "runouts": 3, "economy": 6.7}', 'https://gettyimages.in/photos/varun-chakravarthy?phrase=varun%20chakravarthy&sort=mostpopular'),
('Avesh Khan', 'Indian', 'bowler', '{"wickets": 91, "catches": 5, "runouts": 3, "economy": 7.1}', 'https://gettyimages.in/photos/avesh-khan?phrase=avesh%20khan&sort=mostpopular'),
('Deepak Chahar', 'Indian', 'bowler', '{"wickets": 96, "catches": 6, "runouts": 4, "economy": 6.5}', 'https://gettyimages.in/photos/deepak-chahar?phrase=deepak%20chahar&sort=mostpopular'),
('Jaydev Unadkat', 'Indian', 'bowler', '{"wickets": 75, "catches": 4, "runouts": 3, "economy": 7.4}', 'https://gettyimages.in/photos/jaydev-unadkat?phrase=jaydev%20unadkat&sort=mostpopular'),
('Navdeep Saini', 'Indian', 'bowler', '{"wickets": 68, "catches": 3, "runouts": 4, "economy": 7.6}', 'https://gettyimages.in/photos/navdeep-saini?phrase=navdeep%20saini&sort=mostpopular'),
('Khaleel Ahmed', 'Indian', 'bowler', '{"wickets": 80, "catches": 5, "runouts": 4, "economy": 7.2}', 'https://gettyimages.in/photos/khaleel-ahmed?phrase=khaleel%20ahmed&sort=mostpopular'),
('Rahul Chahar', 'Indian', 'bowler', '{"wickets": 77, "catches": 4, "runouts": 3, "economy": 6.9}', 'https://gettyimages.in/photos/rahul-chahar?phrase=rahul%20chahar&sort=mostpopular'),
('Sandeep Sharma', 'Indian', 'bowler', '{"wickets": 88, "catches": 5, "runouts": 2, "economy": 7.3}', 'https://gettyimages.in/photos/sandeep-sharma?phrase=sandeep%20sharma&sort=mostpopular'),
('Mayank Yadav', 'Indian', 'bowler', '{"wickets": 65, "catches": 3, "runouts": 3, "economy": 7.8}', 'https://gettyimages.in/photos/mayank-yadav?phrase=mayank%20yadav&sort=mostpopular'),
('Arshdeep Singh', 'Indian', 'bowler', '{"wickets": 102, "catches": 7, "runouts": 4, "economy": 7.4}', 'https://gettyimages.in/photos/arshdeep-singh?phrase=arshdeep%20singh&sort=mostpopular'),
('Mukesh Kumar', 'Indian', 'bowler', '{"wickets": 71, "catches": 4, "runouts": 3, "economy": 6.8}', 'https://gettyimages.in/photos/mukesh-kumar?phrase=mukesh%20kumar&sort=mostpopular'),
('Umran Malik', 'Indian', 'bowler', '{"wickets": 64, "catches": 3, "runouts": 5, "economy": 8.1}', 'https://gettyimages.in/photos/umran-malik?phrase=umran%20malik&sort=mostpopular'),
('Harshit Rana', 'Indian', 'bowler', '{"wickets": 53, "catches": 4, "runouts": 3, "economy": 7.4}', 'https://gettyimages.in/photos/harshit-rana?phrase=harshit%20rana&sort=mostpopular'),
('Akash Deep', 'Indian', 'bowler', '{"wickets": 61, "catches": 3, "runouts": 3, "economy": 7.2}', 'https://gettyimages.in/photos/akash-deep?phrase=akash%20deep&sort=mostpopular'),
('Mohit Sharma', 'Indian', 'bowler', '{"wickets": 108, "catches": 6, "runouts": 3, "economy": 7}', 'https://gettyimages.in/photos/mohit-sharma?phrase=mohit%20sharma&sort=mostpopular'),
('Ankit Rajpoot', 'Indian', 'bowler', '{"wickets": 72, "catches": 3, "runouts": 3, "economy": 7.5}', 'https://gettyimages.in/photos/ankit-rajpoot?phrase=ankit%20rajpoot&sort=mostpopular'),
('Amit Mishra', 'Indian', 'bowler', '{"wickets": 138, "catches": 8, "runouts": 3, "economy": 6.9}', 'https://gettyimages.in/photos/amit-mishra?phrase=amit%20mishra&sort=mostpopular'),
('Piyush Chawla', 'Indian', 'bowler', '{"wickets": 142, "catches": 7, "runouts": 4, "economy": 7.1}', 'https://gettyimages.in/photos/piyush-chawla?phrase=piyush%20chawla&sort=mostpopular'),
('Rahul Sharma', 'Indian', 'bowler', '{"wickets": 66, "catches": 4, "runouts": 3, "economy": 6.8}', 'https://gettyimages.in/photos/rahul-sharma?phrase=rahul%20sharma&sort=mostpopular'),
('Sai Kishore', 'Indian', 'bowler', '{"wickets": 55, "catches": 4, "runouts": 3, "economy": 6.4}', 'https://gettyimages.in/photos/sai-kishore?phrase=sai%20kishore&sort=mostpopular'),
('Basil Thampi', 'Indian', 'bowler', '{"wickets": 60, "catches": 3, "runouts": 4, "economy": 7.8}', 'https://gettyimages.in/photos/basil-thampi?phrase=basil%20thampi&sort=mostpopular'),
('Dhawal Kulkarni', 'Indian', 'bowler', '{"wickets": 94, "catches": 5, "runouts": 3, "economy": 7.2}', 'https://gettyimages.in/photos/dhawal-kulkarni?phrase=dhawal%20kulkarni&sort=mostpopular'),
('Praveen Kumar', 'Indian', 'bowler', '{"wickets": 112, "catches": 6, "runouts": 2, "economy": 6.5}', 'https://gettyimages.in/photos/praveen-kumar?phrase=praveen%20kumar&sort=mostpopular'),
('Parwinder Awana', 'Indian', 'bowler', '{"wickets": 52, "catches": 3, "runouts": 3, "economy": 7.4}', 'https://gettyimages.in/photos/parwinder-awana?phrase=parwinder%20awana&sort=mostpopular'),
('Sreesanth', 'Indian', 'bowler', '{"wickets": 98, "catches": 4, "runouts": 3, "economy": 7.1}', 'https://gettyimages.in/photos/sreesanth?phrase=sreesanth&sort=mostpopular'),
('RP Singh', 'Indian', 'bowler', '{"wickets": 115, "catches": 5, "runouts": 3, "economy": 7}', 'https://gettyimages.in/photos/rp-singh?phrase=rp%20singh&sort=mostpopular'),
('Zaheer Khan', 'Indian', 'bowler', '{"wickets": 124, "catches": 6, "runouts": 2, "economy": 6.4}', 'https://gettyimages.in/photos/zaheer-khan?phrase=zaheer%20khan&sort=mostpopular'),
('Ashish Nehra', 'Indian', 'bowler', '{"wickets": 120, "catches": 7, "runouts": 3, "economy": 6.8}', 'https://gettyimages.in/photos/ashish-nehra?phrase=ashish%20nehra&sort=mostpopular'),
('Mitchell Starc', 'Overseas', 'bowler', '{"wickets": 148, "catches": 7, "runouts": 3, "economy": 5.6}', 'https://gettyimages.in/photos/mitchell-starc?phrase=mitchell%20starc&sort=mostpopular'),
('Pat Cummins', 'Overseas', 'bowler', '{"wickets": 131, "catches": 6, "runouts": 4, "economy": 6}', 'https://gettyimages.in/photos/pat-cummins?phrase=pat%20cummins&sort=mostpopular'),
('Josh Hazlewood', 'Overseas', 'bowler', '{"wickets": 119, "catches": 8, "runouts": 3, "economy": 5.4}', 'https://gettyimages.in/photos/josh-hazlewood?phrase=josh%20hazlewood&sort=mostpopular'),
('Trent Boult', 'Overseas', 'bowler', '{"wickets": 135, "catches": 7, "runouts": 3, "economy": 6.1}', 'https://gettyimages.in/photos/trent-boult?phrase=trent%20boult&sort=mostpopular'),
('Kagiso Rabada', 'Overseas', 'bowler', '{"wickets": 141, "catches": 6, "runouts": 4, "economy": 6.8}', 'https://gettyimages.in/photos/kagiso-rabada?phrase=kagiso%20rabada&sort=mostpopular'),
('Anrich Nortje', 'Overseas', 'bowler', '{"wickets": 128, "catches": 6, "runouts": 5, "economy": 7.2}', 'https://gettyimages.in/photos/anrich-nortje?phrase=anrich%20nortje&sort=mostpopular'),
('Marco Jansen', 'Overseas', 'bowler', '{"wickets": 101, "catches": 7, "runouts": 3, "economy": 6.9}', 'https://gettyimages.in/photos/marco-jansen?phrase=marco%20jansen&sort=mostpopular'),
('Shaheen Afridi', 'Overseas', 'bowler', '{"wickets": 137, "catches": 6, "runouts": 3, "economy": 6.5}', 'https://gettyimages.in/photos/shaheen-afridi?phrase=shaheen%20afridi&sort=mostpopular'),
('Haris Rauf', 'Overseas', 'bowler', '{"wickets": 113, "catches": 5, "runouts": 5, "economy": 7.6}', 'https://gettyimages.in/photos/haris-rauf?phrase=haris%20rauf&sort=mostpopular'),
('James Anderson', 'Overseas', 'bowler', '{"wickets": 144, "catches": 6, "runouts": 2, "economy": 5.3}', 'https://gettyimages.in/photos/james-anderson?phrase=james%20anderson&sort=mostpopular'),
('Jofra Archer', 'Overseas', 'bowler', '{"wickets": 120, "catches": 5, "runouts": 4, "economy": 6.7}', 'https://gettyimages.in/photos/jofra-archer?phrase=jofra%20archer&sort=mostpopular'),
('Chris Woakes', 'Overseas', 'bowler', '{"wickets": 110, "catches": 6, "runouts": 3, "economy": 6.2}', 'https://gettyimages.in/photos/chris-woakes?phrase=chris%20woakes&sort=mostpopular'),
('Adil Rashid', 'Overseas', 'bowler', '{"wickets": 129, "catches": 5, "runouts": 3, "economy": 6.8}', 'https://gettyimages.in/photos/adil-rashid?phrase=adil%20rashid&sort=mostpopular'),
('Nathan Lyon', 'Overseas', 'bowler', '{"wickets": 138, "catches": 7, "runouts": 2, "economy": 5.1}', 'https://gettyimages.in/photos/nathan-lyon?phrase=nathan%20lyon&sort=mostpopular'),
('Mark Wood', 'Overseas', 'bowler', '{"wickets": 115, "catches": 4, "runouts": 5, "economy": 7.5}', 'https://gettyimages.in/photos/mark-wood?phrase=mark%20wood&sort=mostpopular'),
('Matheesha Pathirana', 'Overseas', 'bowler', '{"wickets": 84, "catches": 4, "runouts": 5, "economy": 7.8}', 'https://gettyimages.in/photos/matheesha-pathirana?phrase=matheesha%20pathirana&sort=mostpopular'),
('Maheesh Theekshana', 'Overseas', 'bowler', '{"wickets": 99, "catches": 5, "runouts": 3, "economy": 6.4}', 'https://gettyimages.in/photos/maheesh-theekshana?phrase=maheesh%20theekshana&sort=mostpopular'),
('Wanindu Hasaranga', 'Overseas', 'bowler', '{"wickets": 134, "catches": 6, "runouts": 3, "economy": 6.6}', 'https://gettyimages.in/photos/wanindu-hasaranga?phrase=wanindu%20hasaranga&sort=mostpopular'),
('Dushmantha Chameera', 'Overseas', 'bowler', '{"wickets": 102, "catches": 4, "runouts": 4, "economy": 7.1}', 'https://gettyimages.in/photos/dushmantha-chameera?phrase=dushmantha%20chameera&sort=mostpopular'),
('Lasith Malinga', 'Overseas', 'bowler', '{"wickets": 176, "catches": 7, "runouts": 3, "economy": 7}', 'https://gettyimages.in/photos/lasith-malinga?phrase=lasith%20malinga&sort=mostpopular'),
('Rashid Khan', 'Overseas', 'bowler', '{"wickets": 168, "catches": 9, "runouts": 3, "economy": 6.1}', 'https://gettyimages.in/photos/rashid-khan?phrase=rashid%20khan&sort=mostpopular'),
('Mujeeb Ur Rahman', 'Overseas', 'bowler', '{"wickets": 121, "catches": 6, "runouts": 3, "economy": 6.5}', 'https://gettyimages.in/photos/mujeeb-ur-rahman?phrase=mujeeb%20ur%20rahman&sort=mostpopular'),
('Fazalhaq Farooqi', 'Overseas', 'bowler', '{"wickets": 98, "catches": 5, "runouts": 4, "economy": 7.2}', 'https://gettyimages.in/photos/fazalhaq-farooqi?phrase=fazalhaq%20farooqi&sort=mostpopular'),
('Alzarri Joseph', 'Overseas', 'bowler', '{"wickets": 117, "catches": 6, "runouts": 4, "economy": 7.2}', 'https://gettyimages.in/photos/alzarri-joseph?phrase=alzarri%20joseph&sort=mostpopular'),
('Lockie Ferguson', 'Overseas', 'bowler', '{"wickets": 109, "catches": 5, "runouts": 5, "economy": 7.7}', 'https://gettyimages.in/photos/lockie-ferguson?phrase=lockie%20ferguson&sort=mostpopular'),
('Adam Zampa', 'Overseas', 'bowler', '{"wickets": 132, "catches": 6, "runouts": 3, "economy": 6.9}', 'https://gettyimages.in/photos/adam-zampa?phrase=adam%20zampa&sort=mostpopular');


-- ===========================================
-- 5. INSERT WICKETKEEPERS
-- ===========================================
-- Wicketkeepers INSERT statements
INSERT INTO players (name, nation, role, stats, image_url) VALUES
('MS Dhoni', 'Indian', 'wicketkeeper', '{"runs": 5200, "highest_score": "84*", "strike_rate": 135.8, "dismissals": 210, "average": 24.76}', 'https://gettyimages.in/photos/ms-dhoni?phrase=ms%20dhoni&sort=mostpopular'),
('Rishabh Pant', 'Indian', 'wicketkeeper', '{"runs": 2850, "highest_score": "128*", "strike_rate": 148.9, "dismissals": 110, "average": 29.08}', 'https://gettyimages.in/photos/rishabh-pant?phrase=rishabh%20pant&sort=mostpopular'),
('Dinesh Karthik', 'Indian', 'wicketkeeper', '{"runs": 4500, "highest_score": "97*", "strike_rate": 135.4, "dismissals": 145, "average": 31.03}', 'https://gettyimages.in/photos/dinesh-karthik?phrase=dinesh%20karthik&sort=mostpopular'),
('KL Rahul', 'Indian', 'wicketkeeper', '{"runs": 4200, "highest_score": "132*", "strike_rate": 139.2, "dismissals": 112, "average": 58.33}', 'https://gettyimages.in/photos/kl-rahul?phrase=kl%20rahul&sort=mostpopular'),
('Ishan Kishan', 'Indian', 'wicketkeeper', '{"runs": 2300, "highest_score": "99", "strike_rate": 142.5, "dismissals": 88, "average": 47.92}', 'https://gettyimages.in/photos/ishan-kishan?phrase=ishan%20kishan&sort=mostpopular'),
('Sanju Samson', 'Indian', 'wicketkeeper', '{"runs": 3900, "highest_score": "119", "strike_rate": 137.8, "dismissals": 102, "average": 54.17}', 'https://gettyimages.in/photos/sanju-samson?phrase=sanju%20samson&sort=mostpopular'),
('Wriddhiman Saha', 'Indian', 'wicketkeeper', '{"runs": 2600, "highest_score": "93*", "strike_rate": 128.1, "dismissals": 102, "average": 25.49}', 'https://gettyimages.in/photos/wriddhiman-saha?phrase=wriddhiman%20saha&sort=mostpopular'),
('Robin Uthappa', 'Indian', 'wicketkeeper', '{"runs": 4950, "highest_score": "88", "strike_rate": 130.6, "dismissals": 95, "average": 55}', 'https://gettyimages.in/photos/robin-uthappa?phrase=robin%20uthappa&sort=mostpopular'),
('Parthiv Patel', 'Indian', 'wicketkeeper', '{"runs": 2850, "highest_score": "81", "strike_rate": 124.7, "dismissals": 112, "average": 25.45}', 'https://gettyimages.in/photos/parthiv-patel?phrase=parthiv%20patel&sort=mostpopular'),
('Naman Ojha', 'Indian', 'wicketkeeper', '{"runs": 1900, "highest_score": "94", "strike_rate": 121.8, "dismissals": 85, "average": 22.35}', 'https://gettyimages.in/photos/naman-ojha?phrase=naman%20ojha&sort=mostpopular'),
('Quinton de Kock', 'Overseas', 'wicketkeeper', '{"runs": 3100, "highest_score": "140*", "strike_rate": 138.4, "dismissals": 115, "average": 26.96}', 'https://gettyimages.in/photos/quinton-de-kock?phrase=quinton%20de%20kock&sort=mostpopular'),
('Kumar Sangakkara', 'Overseas', 'wicketkeeper', '{"runs": 1700, "highest_score": "94", "strike_rate": 124.3, "dismissals": 62, "average": 27.42}', 'https://gettyimages.in/photos/kumar-sangakkara?phrase=kumar%20sangakkara&sort=mostpopular'),
('Jos Buttler', 'Overseas', 'wicketkeeper', '{"runs": 3300, "highest_score": "124", "strike_rate": 149.5, "dismissals": 108, "average": 47.14}', 'https://gettyimages.in/photos/jos-buttler?phrase=jos%20buttler&sort=mostpopular'),
('Brendon McCullum', 'Overseas', 'wicketkeeper', '{"runs": 2880, "highest_score": "158*", "strike_rate": 131.2, "dismissals": 98, "average": 38.4}', 'https://gettyimages.in/photos/brendon-mccullum?phrase=brendon%20mccullum&sort=mostpopular'),
('AB de Villiers', 'Overseas', 'wicketkeeper', '{"runs": 5050, "highest_score": "133*", "strike_rate": 152.4, "dismissals": 70, "average": 117.44}', 'https://gettyimages.in/photos/ab-de-villiers?phrase=ab%20de%20villiers&sort=mostpopular'),
('Matthew Wade', 'Overseas', 'wicketkeeper', '{"runs": 1450, "highest_score": "89", "strike_rate": 136.8, "dismissals": 55, "average": 41.43}', 'https://gettyimages.in/photos/matthew-wade?phrase=matthew%20wade&sort=mostpopular'),
('Nicholas Pooran', 'Overseas', 'wicketkeeper', '{"runs": 2100, "highest_score": "99", "strike_rate": 150.4, "dismissals": 75, "average": 55.26}', 'https://gettyimages.in/photos/nicholas-pooran?phrase=nicholas%20pooran&sort=mostpopular'),
('Heinrich Klaasen', 'Overseas', 'wicketkeeper', '{"runs": 1750, "highest_score": "104", "strike_rate": 160.8, "dismissals": 90, "average": 42.68}', 'https://gettyimages.in/photos/heinrich-klaasen?phrase=heinrich%20klaasen&sort=mostpopular'),
('Jonny Bairstow', 'Overseas', 'wicketkeeper', '{"runs": 1680, "highest_score": "114", "strike_rate": 146.2, "dismissals": 68, "average": 57.93}', 'https://gettyimages.in/photos/jonny-bairstow?phrase=jonny%20bairstow&sort=mostpopular'),
('Mushfiqur Rahim', 'Overseas', 'wicketkeeper', '{"runs": 1320, "highest_score": "85*", "strike_rate": 122.6, "dismissals": 45, "average": 40}', 'https://gettyimages.in/photos/mushfiqur-rahim?phrase=mushfiqur%20rahim&sort=mostpopular');