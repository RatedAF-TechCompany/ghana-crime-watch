import { Menu, Search, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "next-themes";

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

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

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <header className="sticky top-0 z-50 h-14 w-full border-b border-border bg-card">
      <div className="container flex h-full max-w-7xl items-center justify-between px-4">
        {/* Left: Menu */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="text-primary hover:bg-muted hover:text-primary"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        {/* Center: Logo */}
        <Link to="/" className="absolute left-1/2 -translate-x-1/2">
          <span className="font-serif text-xl font-bold tracking-tight text-primary sm:text-2xl">
            GhanaCrimes
          </span>
        </Link>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="text-primary hover:bg-muted hover:text-primary"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="text-primary hover:bg-muted hover:text-primary"
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="h-5 w-5" />
              ) : (
                <Moon className="h-5 w-5" />
              )}
            </Button>
          )}
          {isAdmin && (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="hidden text-primary hover:bg-muted hover:text-primary sm:inline-flex"
            >
              <Link to="/admin" className="text-xs font-medium uppercase tracking-wide">
                Admin
              </Link>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
