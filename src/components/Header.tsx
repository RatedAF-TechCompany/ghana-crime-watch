'use client';
import { Menu, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

const PRIMARY_NAV: { label: string; to: string }[] = [
  { label: "Crime", to: "/violent-crime" },
  { label: "Court", to: "/court-cases" },
  { label: "Police", to: "/police-reports" },
  { label: "Fraud", to: "/fraud-scams" },
  { label: "Cybercrime", to: "/cybercrime" },
  { label: "Drugs", to: "/drug-offences" },
  { label: "Map", to: "/map" },
  { label: "Statistics", to: "/statistics" },
  { label: "Courts", to: "/courts" },
  { label: "Safety", to: "/safety" },
  { label: "Explainers", to: "/explainers" },
  { label: "Fraud Watch", to: "/fraud-watch" },
];

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setMounted(true);
    let active = true;

    const checkAdminStatus = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (active) setIsAdmin(false);
        return;
      }
      const { data: roles } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      const role = roles?.[0]?.role;
      if (active) setIsAdmin(role === 'admin' || role === 'editor' || role === 'contributor');
    };

    void checkAdminStatus();
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session?.user) {
        setIsAdmin(false);
        return;
      }
      void checkAdminStatus();
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, []);

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <header className="w-full bg-background">
      {/* Main header row */}
      <div className="border-b border-border">
        <div className="mx-auto flex min-w-0 max-w-editorial items-center justify-between gap-3 px-4 py-5 md:px-8 md:py-7">
          {/* Left cluster: masthead + hamburger */}
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/" className="block min-w-0">
              <span className="masthead-word text-[32px] md:text-[48px]">GhanaCrimes</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-9 w-9 shrink-0 [@media(min-width:1025px)]:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Centre nav (desktop) */}
          <nav className="hidden min-w-0 flex-1 items-center justify-center [@media(min-width:1025px)]:flex">
            <ul className="flex min-w-0 items-center gap-3 xl:gap-5">
              {PRIMARY_NAV.map((item) => (
                <li key={item.to}>
                  <Link
                    href={item.to}
                    className={cn(
                      "whitespace-nowrap font-sans text-[13px] font-medium tracking-[0.02em] text-foreground/85 hover:text-primary",
                      pathname === item.to && "text-primary",
                    )}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>

          {/* Right cluster */}
          <div className="flex shrink-0 items-center gap-1 sm:gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchClick}
              className="h-9 w-9"
              aria-label="Search"
            >
              <Search className="h-5 w-5" strokeWidth={1.4} />
            </Button>
            <NotificationBell />
            {mounted && (
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="hidden h-9 w-9 md:inline-flex"
                aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              >
                {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </Button>
            )}
            {isAdmin && (
              <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
                <Link href="/admin" className="text-[11px] font-bold uppercase tracking-widest">
                  Admin
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
