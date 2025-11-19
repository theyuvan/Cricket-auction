import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import CreateAuction from "./pages/host/CreateAuction";
import HostLobby from "./pages/host/HostLobby";
import HostAuction from "./pages/host/HostAuction";
import JoinAuction from "./pages/team/JoinAuction";
import TeamLobby from "./pages/team/TeamLobby";
import TeamAuction from "./pages/team/TeamAuction";
import SelectPlayingXI from "./pages/team/SelectPlayingXI";
import Disqualified from "./pages/team/Disqualified";
import Scoreboard from "./pages/Scoreboard";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/host/create" element={<CreateAuction />} />
          <Route path="/host/lobby" element={<HostLobby />} />
          <Route path="/host/auction" element={<HostAuction />} />
          <Route path="/join" element={<JoinAuction />} />
          <Route path="/team/lobby" element={<TeamLobby />} />
          <Route path="/team/auction" element={<TeamAuction />} />
          <Route path="/team/select-xi" element={<SelectPlayingXI />} />
          <Route path="/team/disqualified" element={<Disqualified />} />
          <Route path="/scoreboard" element={<Scoreboard />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
