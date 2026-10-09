import type { Metadata, Viewport } from 'next';
import { GoogleAnalytics } from '@/components/GoogleAnalytics';
import { Providers } from './providers';
import { BASE_URL } from '@/lib/utils';
import { Cormorant_Garamond, Inter, Libre_Baskerville, Lora } from 'next/font/google';
import './globals.css';

const baskerville = Libre_Baskerville({ subsets: ['latin'], weight: ['400', '700'], style: ['normal', 'italic'], display: 'swap', variable: '--font-baskerville' });
const inter = Inter({ subsets: ['latin'], weight: ['400', '500', '600', '700'], display: 'swap', variable: '--font-inter' });
const lora = Lora({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], display: 'swap', variable: '--font-lora' });
const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['600', '700'], display: 'swap', variable: '--font-cormorant' });

export const metadata: Metadata = {
  title: {
    default: 'GhanaCrimes - Ghana Crime News & Reports',
    template: '%s | GhanaCrimes',
  },
  description:
    'Stay informed with the latest crime news, police reports, court cases, and crime statistics from Ghana. Comprehensive coverage of violent crime, fraud, cybercrime, and more.',
  metadataBase: new URL(BASE_URL),
  robots: {
    index: true,
    follow: true,
    'max-image-preview': 'large',
    'max-snippet': -1,
    'max-video-preview': -1,
  },
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
      { url: '/icons/favicon.ico', sizes: 'any' },
      { url: '/icons/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-touch-icon.png', sizes: '180x180' }],
  },
};

export const viewport: Viewport = {
  themeColor: '#9A0044',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${baskerville.variable} ${inter.variable} ${lora.variable} ${cormorant.variable}`}>
      <head>
        <link rel="alternate" type="application/rss+xml" title="GhanaCrimes RSS" href="/rss.xml" />
      </head>
      <body>
        <GoogleAnalytics />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
