import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Trophy } from "lucide-react";

const Home = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-2xl w-full text-center space-y-12">
        <div className="space-y-4">
          <div className="flex justify-center mb-6">
            <Trophy className="w-20 h-20 text-primary" />
          </div>
          <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
            Cricket Auction System
          </h1>
          <p className="text-xl text-foreground-muted">
            Host auctions or join as a team owner
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Button
            size="lg"
            className="h-32 text-xl font-semibold"
            onClick={() => navigate("/host/create")}
          >
            Host an Auction
          </Button>
          <Button
            size="lg"
            className="h-32 text-xl font-semibold"
            onClick={() => navigate("/join")}
          >
            Join as Team Owner
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Home;
