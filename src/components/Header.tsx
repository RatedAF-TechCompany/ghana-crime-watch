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
  { label: "Violent Crime", to: "/violent-crime" },
  { label: "Court", to: "/court-cases" },
  { label: "Police", to: "/police-reports" },
  { label: "Fraud & Scams", to: "/fraud-scams" },
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
    <header className="sticky top-0 z-50 w-full bg-black text-white">
      <div className="container mx-auto flex h-14 max-w-7xl items-center gap-4 px-4">
        {/* Logo cluster: menu (mobile) + wordmark */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <Link to="/" className="flex items-center gap-2 shrink-0">
            <span className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-white bg-primary font-display text-sm font-bold tracking-tight">
              GC
            </span>
            <span className="font-display text-xl font-bold tracking-tight normal-case">
              GhanaCrimes
            </span>
          </Link>
        </div>

        {/* Primary nav — desktop */}
        <nav className="ml-4 hidden flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {PRIMARY_NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "whitespace-nowrap px-3 py-2 text-sm font-semibold text-white/85 hover:text-white",
                  isActive && "text-white border-b-2 border-primary",
                )
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Right cluster */}
        <div className="ml-auto flex items-center gap-1">
          <NotificationBell />
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="h-9 w-9 text-white hover:bg-white/10 hover:text-white"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden text-white hover:bg-white/10 hover:text-white sm:inline-flex"
            >
              <Link to="/admin" className="text-xs font-bold uppercase tracking-wide">
                Admin
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={onMenuClick}
            className="hidden h-9 w-9 text-white hover:bg-white/10 hover:text-white lg:inline-flex"
            aria-label="All sections"
          >
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
