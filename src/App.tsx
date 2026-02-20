import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "next-themes";
import { Layout } from "./components/Layout";
import { GoogleAnalytics } from "./components/GoogleAnalytics";
import { PWAInstallPrompt } from "./components/PWAInstallPrompt";
import Index from "./pages/Index";
import CategoryPage from "./pages/CategoryPage";
import ArticlePage from "./pages/ArticlePage";
import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/admin/Dashboard";
import ArticleEditor from "./pages/admin/ArticleEditor";
import Analytics from "./pages/admin/Analytics";
import Newsroom from "./pages/admin/Newsroom";
import QuickPublish from "./pages/admin/QuickPublish";
import NotFound from "./pages/NotFound";
import AboutPage from "./pages/AboutPage";
import FraudWatchHome from "./pages/FraudWatchHome";
import FraudWatchReport from "./pages/FraudWatchReport";
import FraudWatchSearch from "./pages/FraudWatchSearch";
import FraudWatchAccount from "./pages/FraudWatchAccount";
import FraudWatchAdmin from "./pages/admin/FraudWatchAdmin";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
      <TooltipProvider>
        <GoogleAnalytics />
        <Toaster />
        <Sonner />
        <PWAInstallPrompt />
        <BrowserRouter>
          <Routes>
            <Route path="/admin" element={<Dashboard />} />
            <Route path="/admin/analytics" element={<Analytics />} />
            <Route path="/admin/newsroom" element={<Newsroom />} />
            <Route path="/admin/quick-publish" element={<QuickPublish />} />
            <Route path="/admin/articles/:id" element={<ArticleEditor />} />
            <Route path="/admin/fraud-watch" element={<FraudWatchAdmin />} />
            <Route path="/" element={<Layout><Index /></Layout>} />
            <Route path="/auth" element={<Layout><AuthPage /></Layout>} />
            <Route path="/about" element={<Layout><AboutPage /></Layout>} />
            <Route path="/fraud-watch" element={<FraudWatchHome />} />
            <Route path="/fraud-watch/report" element={<FraudWatchReport />} />
            <Route path="/fraud-watch/search" element={<FraudWatchSearch />} />
            <Route path="/fraud-watch/account/:accountId" element={<FraudWatchAccount />} />
            <Route path="/:categorySlug" element={<Layout><CategoryPage /></Layout>} />
            <Route path="/:categorySlug/:articleSlug" element={<Layout><ArticlePage /></Layout>} />
            <Route path="*" element={<Layout><NotFound /></Layout>} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
