-- =============================================
-- Migration: Update Player Stats and Scoring Formulas
-- =============================================

-- This migration updates:
-- 1. Wicketkeeper stats to include 'average' field
-- 2. All existing wicketkeeper records to have average values

-- Step 1: Update existing wicketkeeper players to add 'average' field
-- MS Dhoni
UPDATE players 
SET stats = jsonb_set(stats, '{average}', '50')
WHERE name = 'MS Dhoni' AND role = 'wicketkeeper';

-- Jos Buttler
UPDATE players 
SET stats = jsonb_set(stats, '{average}', '41')
WHERE name = 'Jos Buttler' AND role = 'wicketkeeper';

-- Quinton de Kock
UPDATE players 
SET stats = jsonb_set(stats, '{average}', '45')
WHERE name = 'Quinton de Kock' AND role = 'wicketkeeper';

-- Step 2: For any other wicketkeeper players without average, add a default
UPDATE players
SET stats = jsonb_set(stats, '{average}', '40')
WHERE role = 'wicketkeeper' 
  AND NOT (stats ? 'average');

-- Verify the changes
SELECT id, name, role, stats 
FROM players 
WHERE role = 'wicketkeeper'
ORDER BY name;

-- Expected stats structure after migration:
-- Batsman: { "runs": 5000, "highest_score": 183, "strike_rate": 92, "average": 48 }
-- Wicketkeeper: { "runs": 3000, "highest_score": 120, "strike_rate": 80, "stumpings": 12, "average": 48 }
-- Bowler: { "wickets": 150, "catches": 21, "runout": 7, "economy": 6.2 }
-- Allrounder: { "runs": 3500, "highest_score": 140, "strike_rate": 87, "wickets": 60 }

-- NEW SCORING FORMULAS (Applied in Frontend):
-- 🏏 BATSMAN = (Runs × 1) + (SR × 2.5) + (Best × 5) + (Average × 15)
-- 🧢 ALL-ROUNDER = (Runs × 1) + (SR × 2.5) + (Best × 5) + (Wickets × 30)
-- 🎯 BOWLER = (Wickets × 30) + (Catches × 20) + (Run Outs × 15) + (4000 / Economy)
-- 🧤 WICKETKEEPER = (Runs × 1) + (SR × 2.5) + (Stumpings × 10) + (Best × 5)
-- Captain ×2
-- Vice-Captain ×1.5

-- IMPORTANT NOTES:
-- 1. Wicketkeepers now have 'average' field for when they're treated as batsmen
-- 2. If 2 WKs in Playing XI, one is Main WK (uses WK formula), other is treated as Batsman
-- 3. Non-main WK will use: (Runs × 1) + (SR × 2.5) + (Best × 5) + (Average × 15)
-- 4. Main WK uses: (Runs × 1) + (SR × 2.5) + (Stumpings × 10) + (Best × 5)
