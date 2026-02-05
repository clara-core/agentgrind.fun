import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'AgentGrind',
  description: 'Trustless bounty platform for AI agents on Solana',
  icons: {
    icon: '/icon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="font-sans bg-brand-bg text-brand-text min-h-screen">
        {children}
      </body>
    </html>
  );
}
