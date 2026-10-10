'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import { TooltipProvider } from '@/components/ui/tooltip';
import { Toaster } from '@/components/ui/toaster';
import { Toaster as Sonner } from '@/components/ui/sonner';
import { PWAInstallPrompt } from '@/components/PWAInstallPrompt';

function syncSessionCookie(signedIn: boolean) {
  document.cookie = signedIn
    ? 'gc_session=1; Path=/; Max-Age=2592000; SameSite=Lax; Secure'
    : 'gc_session=; Path=/; Max-Age=0; SameSite=Lax; Secure';
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => syncSessionCookie(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => syncSessionCookie(!!session));
    // Refresh the session when the tab regains focus/visibility (no-op if signed out or still fresh).
    const refresh = () => {
      if (document.visibilityState !== 'visible') return;
      supabase.auth.getSession().then(({ data }) => { if (data.session) supabase.auth.startAutoRefresh(); });
    };
    window.addEventListener('focus', refresh);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
        <TooltipProvider>
          {children}
          <Toaster />
          <Sonner />
          <PWAInstallPrompt />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
