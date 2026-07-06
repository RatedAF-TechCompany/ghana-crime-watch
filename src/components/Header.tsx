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
  { label: "Politics", to: "/politics" },
  { label: "Economy", to: "/economy" },
  { label: "World", to: "/world" },
  { label: "Culture", to: "/culture" },
  { label: "Life", to: "/lifestyle" },
  { label: "Magazine", to: "/magazine" },
];

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
  const [isAdmin, setIsAdmin] = useState(false);
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const pathname = usePathname();

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
      {/* Main header row */}
      <div className="border-b border-border">
        <div className="mx-auto flex max-w-editorial items-center justify-between gap-6 px-4 py-5 md:px-8 md:py-7">
          {/* Left cluster: masthead + hamburger */}
          <div className="flex items-center gap-4">
            <Link href="/" className="block">
              <span className="masthead-word text-[32px] md:text-[48px]">GhanaCrimes</span>
            </Link>
            <Button
              variant="ghost"
              size="icon"
              onClick={onMenuClick}
              className="h-9 w-9"
              aria-label="Open menu"
            >
              <Menu className="h-5 w-5" strokeWidth={1.5} />
            </Button>
          </div>

          {/* Centre nav (desktop) */}
          <nav className="hidden flex-1 items-center justify-center lg:flex">
            <ul className="flex items-center">
              {PRIMARY_NAV.map((item) => (
                <li key={item.to} className="nav-slash">
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
          <div className="flex items-center gap-2">
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
