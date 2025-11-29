import { Menu, Search, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

interface HeaderProps {
  onMenuClick: () => void;
  onSearchClick: () => void;
}

export function Header({ onMenuClick, onSearchClick }: HeaderProps) {
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
          <div className="flex h-8 w-8 items-center justify-center rounded-sm bg-primary">
            <span className="text-sm font-bold text-primary-foreground">GC</span>
          </div>
          <span className="ml-2 text-lg font-bold tracking-tight">GhanaCrimes</span>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={onSearchClick}
            className="hover:bg-transparent"
            aria-label="Search"
          >
            <Search className="h-5 w-5" />
          </Button>
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
