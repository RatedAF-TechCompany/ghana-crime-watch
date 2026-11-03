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
import { EmergencyButton } from "@/components/EmergencyButton";
import { LiteModeToggle } from "@/components/LiteModeToggle";

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
      { label: "Live Crime Map", to: "/map/live" },
      { label: "Crime This Week", to: "/crime-this-week" },
      { label: "Statistics", to: "/statistics" },
      { label: "Weekly Roundup", to: "/roundup" },
      { label: "Agencies", to: "/agencies" },
      { label: "Explainers", to: "/explainers" },
    ],
  },
  {
    title: "Public safety",
    links: [
      { label: "Scam Alerts", to: "/scam-alerts" },
      { label: "Scam of the Day", to: "/scam-of-the-day" },
      { label: "Know Your Rights", to: "/know-your-rights" },
      { label: "Fraud Watch Directory", to: "/fraud-watch/directory" },
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
      { label: "editor@ghanacrimes.com", to: "mailto:editor@ghanacrimes.com" },
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
      <main className="mx-auto w-full min-w-0 max-w-editorial flex-1 bg-background px-4 py-8 md:px-8 md:py-10">
        {children}
      </main>
      <EmergencyButton />
      <footer className="mt-16 bg-[#111111] text-white">
        <div className="mx-auto max-w-editorial px-4 py-12 md:px-8">
          <div className="mb-10 text-center">
            <Link href="/" className="inline-block">
              <img src="/brand/ghanacrimes-logo.png" alt="GhanaCrimes" width={600} height={200} className="block mx-auto h-10 w-auto md:h-12 max-w-full rounded-sm" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-8 md:grid-cols-5">
            {FOOTER_COLUMNS.map((col) => (
              <div key={col.title}>
                <h3 className="mb-4 font-headline text-lg font-bold tracking-tight text-white">
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.filter((l) => !isEmpty(l.to)).slice(0, 8).map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.to}
                        className="font-sans text-sm font-light text-white/75 hover:text-[#ffef00]"
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
          <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-white/15 pt-6 font-sans text-xs text-white/60 sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} GhanaCrimes. All rights reserved.</span>
            <span className="flex flex-wrap gap-4">
              <LiteModeToggle />
              <Link href="/lite" className="hover:text-[#ffef00]">Text-only</Link>
              <Link href="/editorial-policy" className="hover:text-[#ffef00]">Editorial Policy</Link>
              <Link href="/corrections" className="hover:text-[#ffef00]">Corrections</Link>
              <Link href="/privacy" className="hover:text-[#ffef00]">Privacy</Link>
              <Link href="/terms" className="hover:text-[#ffef00]">Terms</Link>
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
