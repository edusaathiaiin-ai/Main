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
    '24 AI subject companions. Built for India. ₹199/month. Your Saathi knows your name, remembers your journey.',
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://edusaathiai.in'),
  openGraph: {
    siteName: 'EdUsaathiAI',
    type: 'website',
  },
  icons: {
    icon: '/icon.png',
    apple: '/icon.png',
    shortcut: '/icon.png',
  },
};

// Build-time version stamp — changes every deploy, forces stale tabs to reload
const BUILD_VERSION = Date.now().toString();

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${playfair.variable} ${dmSans.variable}`}>
      <head>
        <meta name="build-version" content={BUILD_VERSION} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function(){
                var v="${BUILD_VERSION}";
                var prev=localStorage.getItem("eusa_build");
                if(prev&&prev!==v){localStorage.setItem("eusa_build",v);location.reload();}
                else{localStorage.setItem("eusa_build",v);}
              })();
            `,
          }}
        />
      </head>
      <body className="min-h-screen bg-[#060F1D] text-white antialiased font-sans flex flex-col">
        <AuthProvider>{children}</AuthProvider>
        <CookieBanner />
      </body>
    </html>
  );
}

