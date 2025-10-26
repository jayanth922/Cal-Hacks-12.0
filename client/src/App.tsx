import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import FloatingUserButton from "@/components/ui/floating-user-button";
import { AnimatePresence, motion } from "framer-motion";
import VoiceAgent from "@/pages/VoiceAgent";
import Home from "@/pages/Home";
import NotFound from "@/pages/not-found";
import TripRecord from "@/pages/TripRecord";

function Router({ path }: { path: string }) {
  // Render the active route directly so the App can wrap it in an absolute-positioned
  // motion layer. This prevents a blank frame from appearing between unmount/mount.
  if (path === "/") return <VoiceAgent />;
  if (path === "/home") return <Home />;
  if (path === "/trip") return <TripRecord />;
  return <NotFound />;
}

function App() {
  const [location] = useLocation();
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <div style={{ position: "relative", minHeight: "100vh" }}>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={location}
              // position absolute so outgoing and incoming pages overlap (no blank)
              style={{ position: "absolute", inset: 0 }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.22, ease: "easeInOut" }}
            >
              <Router path={location} />
            </motion.div>
          </AnimatePresence>
        </div>
        <FloatingUserButton />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
