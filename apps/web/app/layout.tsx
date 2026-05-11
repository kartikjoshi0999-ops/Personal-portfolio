import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import { ThemeProvider } from '@/components/layout/ThemeProvider';
import { TRPCProvider } from '@/lib/trpc/Provider';
import { Toaster } from '@/components/ui/Toaster';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'SolveSphere AI', template: '%s | SolveSphere AI' },
  description: 'All-in-one intelligent assistant for math solving and personal finance management.',
  keywords: ['math solver', 'personal finance', 'AI assistant', 'budget tracker', 'investment portfolio'],
  authors: [{ name: 'SolveSphere AI' }],
  openGraph: {
    title: 'SolveSphere AI',
    description: 'Solve math problems & manage your finances with AI',
    type: 'website',
    images: ['/og-image.png'],
  },
  twitter: { card: 'summary_large_image', title: 'SolveSphere AI' },
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#2563eb' },
    { media: '(prefers-color-scheme: dark)', color: '#1e3a8a' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <TRPCProvider>
            {children}
            <Toaster />
          </TRPCProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
