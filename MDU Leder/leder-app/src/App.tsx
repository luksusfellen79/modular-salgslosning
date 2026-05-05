import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/toaster";
import { SidekickProvider } from "@/contexts/SidekickContext";
import WarRoom from "./pages/WarRoom";
import Forecast from "./pages/Forecast";
import Reports from "./pages/Reports";

const queryClient = new QueryClient();

// Bootstrap session from Hub link token
try {
  const params = new URLSearchParams(window.location.search);
  const token = params.get('hub_session');
  if (token) {
    localStorage.setItem('salgshub_session', token);
    window.history.replaceState({}, '', window.location.pathname);
  }
} catch { /* ignore */ }

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SidekickProvider>
      <Toaster />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<WarRoom />} />
          <Route path="/forecast" element={<Forecast />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </BrowserRouter>
    </SidekickProvider>
  </QueryClientProvider>
);

export default App;
