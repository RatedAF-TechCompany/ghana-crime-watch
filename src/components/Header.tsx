import { Menu, Search, User, Settings, Sun, Moon } from "lucide-react";
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
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background">
      <div className="container flex h-14 items-center justify-between px-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={onMenuClick}
          className="hover:bg-transparent"
          aria-label="Open menu"
        >
          <Menu className="h-5 w-5" />
        </Button>

        <Link to="/" className="flex items-center">
          <span className="text-xl font-bold tracking-tight text-primary">GhanaCrimes</span>
        </Link>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="hover:bg-transparent"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
          {mounted && (
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleTheme}
              className="hover:bg-transparent"
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
              size="icon"
              asChild
              className="hover:bg-transparent"
              aria-label="Admin Dashboard"
            >
              <Link to="/admin">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon"
            asChild
            className="hover:bg-transparent"
            aria-label="Account"
          >
            <Link to="/auth">
              <User className="h-5 w-5" />
            </Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
