import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, AlertCircle } from "lucide-react";

const Scoreboard = () => {
  const mockTeams = [
    {
      rank: 1,
      name: "Mumbai Warriors",
      players: 15,
      totalScore: 850,
      disqualified: false,
    },
    {
      rank: 2,
      name: "Chennai Challengers",
      players: 12,
      totalScore: 0,
      disqualified: true,
    },
  ];

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <div className="text-center space-y-4">
          <Trophy className="w-16 h-16 mx-auto text-primary" />
          <h1 className="text-4xl font-bold">Final Scoreboard</h1>
          <p className="text-foreground-muted">Auction Results</p>
        </div>

        <div className="space-y-4">
          {mockTeams.map((team) => (
            <Card
              key={team.rank}
              className={`p-6 bg-card border-border ${
                team.disqualified ? "border-destructive" : ""
              }`}
            >
              <div className="flex items-center gap-6">
                <div className="text-4xl font-bold text-foreground-muted">
                  #{team.rank}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="text-2xl font-bold">{team.name}</h3>
                    {team.disqualified && (
                      <Badge variant="destructive" className="gap-1">
                        <AlertCircle className="h-3 w-3" />
                        DISQUALIFIED
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-6 text-sm text-foreground-muted">
                    <span>Players: {team.players} / 15</span>
                    {!team.disqualified && (
                      <span className="font-semibold text-foreground">
                        Total Score: {team.totalScore}
                      </span>
                    )}
                  </div>
                  {team.disqualified && (
                    <p className="text-sm text-destructive mt-2">
                      Did not meet minimum 15 player requirement
                    </p>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Scoreboard;
