import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'EdUsaathiAI Admin',
  description: 'Admin control centre — EdUsaathiAI',
  robots: { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} h-full bg-slate-950 text-slate-100 antialiased`}
      >
        {children}
      </body>
    </html>
  )
}
