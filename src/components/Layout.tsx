import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "./Header";
import { NavigationDrawer } from "./NavigationDrawer";
import { SearchOverlay } from "./SearchOverlay";

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        onMenuClick={() => setMenuOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      <NavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="container mx-auto max-w-7xl px-4 py-6 flex-1">{children}</main>
      <footer className="border-t border-border bg-card mt-8">
        <div className="container mx-auto max-w-7xl px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>© {new Date().getFullYear()} GhanaCrimes. All rights reserved.</span>
          <div className="flex items-center gap-4">
            <Link to="/about" className="hover:text-primary transition-colors">About Us & Editorial Policy</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
