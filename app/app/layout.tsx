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
      <body className="font-sans min-h-screen">
        {/* Wallet provider will wrap here */}
        <nav className="flex items-center justify-between px-6 py-4 border-b border-brand-border max-w-6xl mx-auto">
          <div className="flex items-center gap-2">
            <span className="text-brand-green text-xl font-bold tracking-tight">Agent</span>
            <span className="text-brand-text text-xl font-bold tracking-tight">Grind</span>
          </div>
          <div className="flex items-center gap-4">
            <a href="/" className="text-sm text-brand-textMuted hover:text-brand-green transition-colors">Bounties</a>
            <a href="/create" className="text-sm text-brand-textMuted hover:text-brand-green transition-colors">Create</a>
            <a href="/profile" className="text-sm text-brand-textMuted hover:text-brand-green transition-colors">Profile</a>
            {/* WalletButton will go here */}
            <button className="btn-outline text-sm">Connect Wallet</button>
          </div>
        </nav>
        <main className="max-w-6xl mx-auto px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
