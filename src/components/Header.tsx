import { Menu, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link, NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";
import { NotificationBell } from "./NotificationBell";
import { cn } from "@/lib/utils";

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

const PRIMARY_NAV: { label: string; to: string }[] = [
  { label: "Home", to: "/" },
  { label: "Top Stories", to: "/top-stories" },
  { label: "Crime", to: "/violent-crime" },
  { label: "Court", to: "/court-cases" },
  { label: "Police", to: "/police-reports" },
  { label: "Fraud", to: "/fraud-scams" },
  { label: "Cybercrime", to: "/cybercrime" },
  { label: "Investigations", to: "/investigations" },
  { label: "Most Wanted", to: "/most-wanted" },
];

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    checkAdminStatus();
  }, []);

  const checkAdminStatus = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data: roles } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    const role = roles?.[0]?.role;
    setIsAdmin(role === 'admin' || role === 'editor' || role === 'contributor');
  };

  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  return (
    <header className="w-full bg-background">
      {/* Top ad placeholder strip */}
      <div className="border-b border-border bg-muted/40">
        <div className="mx-auto flex h-[70px] max-w-editorial items-center justify-center px-4 text-[10px] uppercase tracking-[0.2em] text-muted-foreground md:h-[90px]">
          Advertisement
        </div>
      </div>

      {/* Masthead */}
      <div className="border-b border-border">
        <div className="relative mx-auto flex max-w-editorial items-center justify-between px-4 py-5 md:py-7">
          {/* Left: mobile menu */}
          <div className="flex w-24 items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-9 w-9 lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </div>

          {/* Centred masthead */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 text-center">
            <h1 className="masthead-word text-[34px] md:text-[54px]">GhanaCrimes</h1>
          </Link>

          {/* Right cluster */}
          <div className="flex w-24 items-center justify-end gap-1">
            <NotificationBell />
            <Button
              variant="ghost"
              size="icon"
              onClick={onSearchClick}
              className="h-9 w-9"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </Button>
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
                <Link to="/admin" className="text-[11px] font-bold uppercase tracking-widest">
                  Admin
                </Link>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Thin nav below masthead */}
      <nav className="hidden border-b border-border bg-background lg:block">
        <div className="mx-auto flex max-w-editorial items-center justify-center gap-6 px-4 py-3">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap text-[13px] font-semibold uppercase tracking-[0.1em] text-foreground/85 hover:text-primary",
                  isActive && "text-primary",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
          <Link
            to="/fraud-watch"
            className="ml-2 rounded-full bg-[hsl(51_100%_50%)] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-black hover:opacity-90"
          >
            Subscribe
          </Link>
        </div>
      </nav>
    </header>
  );
}
