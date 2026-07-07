import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { Providers } from './providers';
import { BASE_URL } from '@/lib/utils';
import './globals.css';

export const metadata: Metadata = {
  title: {
    default: 'GhanaCrimes - Ghana Crime News & Reports',
    template: '%s | GhanaCrimes',
  },
  description:
    'Stay informed with the latest crime news, police reports, court cases, and crime statistics from Ghana. Comprehensive coverage of violent crime, fraud, cybercrime, and more.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    siteName: 'GhanaCrimes',
    type: 'website',
    images: [{ url: '/og-image.png' }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@GhanaCrimes',
    images: ['/og-image.png'],
  },
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'GhanaCrimes',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', type: 'image/x-icon' },
      { url: '/favicon.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/pwa-192x192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#9A0044',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
