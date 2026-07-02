import { useState } from "react";
import { Link } from "react-router-dom";
import { Header } from "./Header";
import { NavigationDrawer } from "./NavigationDrawer";
import { SearchOverlay } from "./SearchOverlay";
import { BreakingNewsTicker } from "./BreakingNewsTicker";
import { CATEGORIES } from "@/lib/categories";

interface LayoutProps {
  children: React.ReactNode;
}

const FOOTER_COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "About GhanaCrimes",
    links: [
      { label: "About Us", to: "/about" },
      { label: "Editorial Policy", to: "/about" },
      { label: "Contact", to: "/about" },
    ],
  },
  {
    title: "GhanaCrimes Services",
    links: [
      { label: "Fraud Watch", to: "/fraud-watch" },
      { label: "Report a Scam", to: "/fraud-watch/report" },
      { label: "Newsletter", to: "/" },
      { label: "RSS Feed", to: "/functions/v1/rss-feed" },
    ],
  },
  {
    title: "Sections",
    links: CATEGORIES.slice(0, 6).map((c) => ({ label: c.label, to: `/${c.slug}` })),
  },
  {
    title: "More Sites",
    links: CATEGORIES.slice(6, 12).map((c) => ({ label: c.label, to: `/${c.slug}` })),
  },

];

export function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header
        onMenuClick={() => setMenuOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      <BreakingNewsTicker />
      <NavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="mx-auto w-full max-w-editorial px-4 py-8 md:px-6 md:py-10 flex-1">
        {children}
      </main>
      <footer className="mt-12 border-t border-border bg-[hsl(40_25%_94%)]">
        <div className="mx-auto max-w-editorial px-4 py-10 md:px-6">
          <div className="mb-8 text-center">
            <span className="masthead-word text-3xl md:text-4xl">GhanaCrimes</span>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-4">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-3 text-[11px] font-bold uppercase tracking-[0.14em] text-primary">
                  {col.title}
                </h3>
                <ul className="space-y-2">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="text-sm text-foreground/75 hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-8 flex flex-col items-start justify-between gap-3 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} GhanaCrimes. All rights reserved.</span>
            <Link to="/about" className="hover:text-primary">
              About Us & Editorial Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
