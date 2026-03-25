import type { Metadata } from 'next';
import { Playfair_Display, DM_Sans } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/components/AuthProvider';

import { CookieBanner } from '@/components/ui/CookieBanner';

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-playfair',
  display: 'swap',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'EdUsaathiAI — Where Every Subject Finds Its Saathi',
    template: '%s · EdUsaathiAI',
  },
  description:
    '20 AI subject companions. Built for India. ₹199/month. Your Saathi knows your name, remembers your journey.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edusaathiai.in'),
  openGraph: {
    siteName: 'EdUsaathiAI',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <body className="min-h-screen bg-[#060F1D] text-white antialiased font-sans flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <CookieBanner />
      </body>
    </html>
  );
}

