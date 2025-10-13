import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useIsMobile } from "@/hooks/use-mobile";
import { DebugProvider } from "@/contexts/DebugContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import SharedSnippet from "./pages/SharedSnippet";
import MobileWarning from "./components/MobileWarning";

const queryClient = new QueryClient();

const App = () => {
  const isMobile = useIsMobile();

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DebugProvider>
          <Toaster />
          <Sonner />
          {isMobile ? (
            <MobileWarning />
          ) : (
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/share/:id" element={<SharedSnippet />} />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          )}
        </DebugProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
