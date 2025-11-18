# 🏏 Cricket Auction System

A real-time multiplayer cricket player auction platform with host-controlled bidding, WebSocket communication, and automated scoring. Built for cricket leagues, fantasy tournaments, and school/college competitions.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

### 🎯 Core Functionality
- **Host-Controlled Auctions**: Create and manage auctions with unique codes
- **Real-Time Bidding**: WebSocket-based instant bid updates
- **No Authentication**: Quick join with just auction code and team name
- **Role-Based Players**: Batsmen, Bowlers, Wicketkeepers, Allrounders
- **Smart Validation**: Balance checks, minimum bids, role requirements
- **Auto Scoring**: Customizable formulas for fair team ranking
- **Disqualification**: Teams with <15 players automatically disqualified

### 🚀 Technical Highlights
- **Frontend**: React 18, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: Node.js, Express, WebSocket (ws library)
- **Database**: Supabase (PostgreSQL)
- **Real-Time**: WebSocket connections per auction room
- **State Management**: In-memory for speed, Supabase for persistence

## 📸 Screenshots

*(Add your screenshots here)*

## 🎬 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### Installation

```bash
# 1. Clone and install
git clone <repo-url>
cd Cricket-auction
npm install

# 2. Setup environment
cp .env.example .env
# Edit .env with your Supabase credentials

# 3. Setup database
# Run supabase/schema.sql in Supabase SQL Editor

# 4. Start servers
npm run server    # Terminal 1 - Backend (port 3000)
npm run dev       # Terminal 2 - Frontend (port 8080)

# 5. Open browser
# http://localhost:8080
```

**Detailed setup guide**: See [SETUP.md](SETUP.md)

## 🎮 How to Use

### Host an Auction
1. Click **"Host Auction"**
2. Configure settings (balance, max teams)
3. Share the generated **6-character code**
4. Wait for teams to join
5. **Start Auction** when ready
6. Select players, monitor bids, mark sold/unsold
7. Set scoring formulas and calculate final scores

### Join as Team
1. Click **"Join Auction"**
2. Enter **auction code**
3. Choose team name and logo
4. Wait in lobby
5. Place bids during auction
6. View final scoreboard

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────┐
│                   Frontend                       │
│  React + TypeScript + Tailwind + shadcn/ui      │
│                                                  │
│  Pages: Home, CreateAuction, HostAuction,       │
│         JoinAuction, TeamAuction, Scoreboard    │
└────────────────┬────────────────────────────────┘
                 │
                 │ REST API + WebSocket
                 │
┌────────────────▼────────────────────────────────┐
│                   Backend                        │
│        Node.js + Express + WebSocket            │
│                                                  │
│  Services:                                       │
│  ├─ auctionService  (Auction management)        │
│  ├─ playerService   (Player data)               │
│  ├─ biddingService  (Bid validation)            │
│  └─ scoringService  (Score calculation)         │
└────────────────┬────────────────────────────────┘
                 │
                 │ SQL Queries
                 │
┌────────────────▼────────────────────────────────┐
│                 Supabase                         │
│              PostgreSQL Database                 │
│                                                  │
│  Tables: players, auctions, teams,              │
│          sold_players, final_scores             │
└─────────────────────────────────────────────────┘
```

## 📡 API Overview

### REST Endpoints
- `POST /api/auctions/create` - Create auction
- `POST /api/auctions/join` - Join as team
- `POST /api/auctions/start` - Start auction
- `GET /api/auctions/:code/teams` - Get teams
- `POST /api/auctions/:code/bid` - Place bid
- `POST /api/auctions/:code/calculate-scores` - Calculate scores

### WebSocket Events
- `join_auction` - Connect to auction room
- `new_bid` - Broadcast new bid
- `player_auction` - New player on auction
- `player_sold` - Player sold to team
- `show_scoreboard` - Display final results

**Full API docs**: See [backend/README.md](backend/README.md)

## 🗄️ Database Schema

```sql
players         # Player details with role-based stats (JSON)
auctions        # Auction configuration & status
teams           # Team balance, player counts, role distribution
sold_players    # Auction results (who bought whom)
final_scores    # Calculated scores with breakdown
```

**Schema file**: [supabase/schema.sql](supabase/schema.sql)

## 🔧 Tech Stack

| Layer | Technologies |
|-------|-------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui |
| Backend | Node.js, Express, WebSocket (ws) |
| Database | Supabase (PostgreSQL) |
| Styling | Tailwind CSS, Radix UI |
| State | React Query, WebSocket hooks |
| Build | Vite, TSX |

## 📝 Project Structure

```
Cricket-auction/
├── backend/                  # Backend server
│   ├── server.ts            # Main server
│   ├── services/            # Business logic
│   ├── routes/              # API routes
│   ├── types/               # TypeScript types
│   └── utils/               # Helpers
├── src/                     # Frontend
│   ├── pages/               # React pages
│   │   ├── host/           # Host pages
│   │   └── team/           # Team pages
│   ├── hooks/               # Custom hooks
│   ├── components/          # UI components
│   └── integrations/        # Supabase
├── supabase/                # Database
│   └── schema.sql          # SQL schema
└── package.json
```

## 🎨 Customization

### Add New Players
```sql
INSERT INTO players (name, role, stats) VALUES
('Player Name', 'batsman', 
 '{"runs": 5000, "highest_score": 150, "strike_rate": 90, "average": 45}');
```

### Modify Scoring Formulas
Edit in host dashboard or via API:
```javascript
{
  batsman: {
    runs_multiplier: 0.1,
    highest_score_multiplier: 0.5,
    // ... more
  }
}
```

### Change Starting Balance
Modify in `CreateAuction.tsx` or pass as parameter.

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| WebSocket not connecting | Ensure backend is running on port 3000 |
| No players showing | Run `supabase/schema.sql` |
| Port conflict | Change `PORT` in `.env` |
| TypeScript errors | Run `npm install` again |

**More help**: See [SETUP.md](SETUP.md#troubleshooting)

## 🚀 Deployment

### Backend (Railway/Render/Fly.io)
1. Push to GitHub
2. Connect repo to platform
3. Set environment variables
4. Deploy

### Frontend (Vercel/Netlify)
1. Build: `npm run build`
2. Deploy `dist/` folder
3. Update `VITE_WS_URL` to production backend

## 📚 Documentation

- **[SETUP.md](SETUP.md)** - Complete setup guide
- **[backend/README.md](backend/README.md)** - Backend API docs
- **[src/examples/](src/examples/)** - Integration examples

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [shadcn/ui](https://ui.shadcn.com/)
- Powered by [Supabase](https://supabase.com/)
- Icons from [Lucide](https://lucide.dev/)

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

**Made with ❤️ for cricket enthusiasts**

⭐ Star this repo if you found it helpful!
