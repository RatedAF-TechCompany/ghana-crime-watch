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
    title: "GhanaCrimes",
    links: [
      { label: "Homepage", to: "/" },
      { label: "Top Stories", to: "/top-stories" },
      { label: "Fraud Watch", to: "/fraud-watch" },
      { label: "RSS Feed", to: "/functions/v1/rss-feed" },
    ],
  },
  {
    title: "About us",
    links: [
      { label: "About GhanaCrimes", to: "/about" },
      { label: "Editorial Policy", to: "/about" },
      { label: "Corrections", to: "/about" },
      { label: "Careers", to: "/about" },
    ],
  },
  {
    title: "Sections",
    links: CATEGORIES.slice(0, 6).map((c) => ({ label: c.label, to: `/${c.slug}` })),
  },
  {
    title: "Newsletters",
    links: [
      { label: "Daily briefing", to: "/" },
      { label: "Weekly investigations", to: "/" },
      { label: "Court diary", to: "/" },
    ],
  },
  {
    title: "Contact",
    links: [
      { label: "Contact GhanaCrimes", to: "/about" },
      { label: "Report a scam", to: "/fraud-watch/report" },
      { label: "Send a tip", to: "/about" },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header
        onMenuClick={() => setMenuOpen(true)}
        onSearchClick={() => setSearchOpen(true)}
      />
      <BreakingNewsTicker />
      <NavigationDrawer open={menuOpen} onClose={() => setMenuOpen(false)} />
      <SearchOverlay open={searchOpen} onClose={() => setSearchOpen(false)} />
      <main className="mx-auto w-full max-w-editorial flex-1 bg-card px-4 py-8 md:px-12 md:py-12">
        {children}
      </main>
      <footer className="mt-12 border-t border-pale-rule bg-footer-cream">
        <div className="mx-auto max-w-editorial px-4 py-12 md:px-12">
          <div className="mb-10 text-center">
            <Link to="/" className="inline-block">
              <span className="masthead-word text-3xl md:text-4xl">GhanaCrimes</span>
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-4 font-sans text-[11px] font-bold uppercase tracking-[0.16em] text-foreground">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        to={link.to}
                        className="font-sans text-[13px] text-muted-fg hover:text-primary"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-pale-rule pt-6 font-sans text-xs text-muted-fg sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} GhanaCrimes. All rights reserved.</span>
            <Link to="/about" className="hover:text-primary">
              About GhanaCrimes and Editorial Policy
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
