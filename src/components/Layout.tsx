'use client';
import { useState } from "react";
import Link from "next/link";
import { Header } from "./Header";
import { NavigationDrawer } from "./NavigationDrawer";
import { SearchOverlay } from "./SearchOverlay";
import { BreakingNewsTicker } from "./BreakingNewsTicker";
import { NAV_CATEGORIES } from "@/lib/categories";
import { useIsEmptySection } from "@/components/EmptySectionsContext";
import { WhatsAppFollowBlock } from "@/components/WhatsAppFollowBlock";

interface LayoutProps {
  children: React.ReactNode;
}

const FOOTER_COLUMNS: { title: string; links: { label: string; to: string }[] }[] = [
  {
    title: "GhanaCrimes",
    links: [
      { label: "Homepage", to: "/" },
      { label: "Latest", to: "/latest" },
      { label: "Top Stories", to: "/top-stories" },
      { label: "Crime Map", to: "/map" },
      { label: "Statistics", to: "/statistics" },
      { label: "Weekly Roundup", to: "/roundup" },
      { label: "Topics", to: "/topics" },
      { label: "Explainers", to: "/explainers" },
    ],
  },
  {
    title: "Public safety",
    links: [
      { label: "Scam Alerts", to: "/scam-alerts" },
      { label: "Fraud Watch", to: "/fraud-watch" },
      { label: "Court Case Tracker", to: "/courts/cases" },
      { label: "Courts", to: "/courts" },
      { label: "Wanted", to: "/wanted" },
      { label: "Missing", to: "/missing" },
      { label: "Emergency Contacts", to: "/emergency-contacts" },
      { label: "Safety", to: "/safety" },
    ],
  },
  {
    title: "About us",
    links: [
      { label: "About GhanaCrimes", to: "/about" },
      { label: "Masthead", to: "/masthead" },
      { label: "Editorial Policy", to: "/editorial-policy" },
      { label: "How We Use AI", to: "/ai-use" },
      { label: "Corrections", to: "/corrections" },
      { label: "Privacy Policy", to: "/privacy" },
      { label: "Terms of Use", to: "/terms" },
    ],
  },
  {
    title: "Sections",
    links: NAV_CATEGORIES.slice(0, 8).map((c) => ({ label: c.label, to: `/${c.slug}` })),
  },
  {
    title: "Contact & follow",
    links: [
      { label: "Contact GhanaCrimes", to: "/contact" },
      { label: "Send a tip", to: "/tips" },
      { label: "Report a scam", to: "/fraud-watch/report" },
      { label: "Alerts & feeds", to: "/alerts" },
      { label: "RSS Feed", to: "/rss.xml" },
    ],
  },
];

export function Layout({ children }: LayoutProps) {
  const isEmpty = useIsEmptySection();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  return (
    <div className="flex min-h-screen max-w-full flex-col overflow-x-hidden bg-background">
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
            <Link href="/" className="inline-block">
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
                  {col.links.filter((l) => !isEmpty(l.to)).slice(0, 8).map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.to}
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
          <WhatsAppFollowBlock className="mx-auto mt-10 max-w-md" />
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-pale-rule pt-6 font-sans text-xs text-muted-fg sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} GhanaCrimes. All rights reserved.</span>
            <span className="flex flex-wrap gap-4">
              <Link href="/editorial-policy" className="hover:text-primary">Editorial Policy</Link>
              <Link href="/corrections" className="hover:text-primary">Corrections</Link>
              <Link href="/privacy" className="hover:text-primary">Privacy</Link>
              <Link href="/terms" className="hover:text-primary">Terms</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
