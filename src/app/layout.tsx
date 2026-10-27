import type { Metadata, Viewport } from 'next';
import { Fraunces, Inter } from 'next/font/google';
import { DemoBanner } from '@/components/DemoBanner';
import { SiteFooter, SiteHeader } from '@/components/SiteChrome';
import './globals.css';

const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-fraunces', display: 'swap' });
const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'A Una Milla · Same trip. Much less money.', template: '%s · A Una Milla' },
  description:
    'Compare cash and points for flights from Spain, see the real saving in euros, and get honest booking steps. Hackathon demo with illustrative data.',
  robots: { index: false, follow: false },
};

export const viewport: Viewport = { themeColor: '#fbf7f0', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${inter.variable}`}>
      <body className="flex min-h-dvh flex-col">
        <a
          href="#main"
          className="sr-only z-50 rounded-full bg-ink px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-2 focus:left-2"
        >
          Skip to content
        </a>
        <DemoBanner />
        <SiteHeader />
        <main id="main" className="flex-1">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
