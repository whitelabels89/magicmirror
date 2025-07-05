import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Home from "@/pages/home";
import Level2 from "@/pages/level2";
import Level3 from "@/pages/level3";
import Level4 from "@/pages/level4";
import Level5 from "@/pages/level5";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/level2" component={Level2} />
      <Route path="/level3" component={Level3} />
      <Route path="/level4" component={Level4} />
      <Route path="/level5" component={Level5} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
