import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import OfferHubPage from "./pages/OfferHub.tsx";
import PlaceholderPage from "./pages/PlaceholderPage.tsx";
import NotFound from "./pages/NotFound.tsx";
import WarRoom from "./pages/WarRoom.tsx";
import Leads from "./pages/Leads.tsx";
import Forecast from "./pages/Forecast.tsx";
import Reports from "./pages/Reports.tsx";
import Accounts from "./pages/Accounts.tsx";
import { WarRoomProvider } from "./context/WarRoomContext";

const queryClient = new QueryClient();

// Bootstrap session from Hub link token
try {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('hub_session');
  if (token) {
    localStorage.setItem('salgshub_session', decodeURIComponent(token));
    window.history.replaceState({}, '', window.location.pathname);
  }
} catch { /* ignore */ }

const App = () => {

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <WarRoomProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/offer-hub" element={<OfferHubPage />} />
          <Route path="/war-room" element={<WarRoom />} />
          <Route path="/leads" element={<Leads />} />
          <Route path="/accounts" element={<Accounts />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/settings" element={<PlaceholderPage title="Settings" />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
      </WarRoomProvider>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
