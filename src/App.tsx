import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/Layout";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import ArticlePage from "./pages/ArticlePage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/admin/Dashboard";
import ArticleEditor from "./pages/admin/ArticleEditor";
import Analytics from "./pages/admin/Analytics";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <GoogleAnalytics />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/analytics" element={<Analytics />} />
          <Route path="/admin/articles/:id" element={<ArticleEditor />} />
          <Route path="/" element={<Layout><Index /></Layout>} />
          <Route path="/auth" element={<Layout><AuthPage /></Layout>} />
          <Route path="/:categorySlug" element={<Layout><CategoryPage /></Layout>} />
          <Route path="/:categorySlug/:articleSlug" element={<Layout><ArticlePage /></Layout>} />
          <Route path="*" element={<Layout><NotFound /></Layout>} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
