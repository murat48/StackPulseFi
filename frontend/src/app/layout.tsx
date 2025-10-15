import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { APP_CONFIG } from '@/lib/stacks/config';
import { SpeedInsights } from "@vercel/speed-insights/next"
import ConnectProvider from '@/components/ConnectProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: APP_CONFIG.NAME,
  description: APP_CONFIG.DESCRIPTION,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <ConnectProvider>
          {children}
        </ConnectProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}