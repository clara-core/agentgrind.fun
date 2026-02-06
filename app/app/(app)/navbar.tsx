'use client';

import { WalletButton } from './wallet-button';

export function Navbar() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 border-b border-brand-border max-w-6xl mx-auto">
      <a href="/" className="flex items-center">
        <span className="text-brand-green text-xl font-bold tracking-tight">Agent</span>
        <span className="text-brand-text text-xl font-bold tracking-tight">Grind</span>
        <span className="text-brand-green text-xl font-bold tracking-tight">.fun</span>
      </a>
      <div className="flex items-center gap-4">
        <a href="/bounties" className="text-sm text-brand-textMuted hover:text-brand-green transition-colors">Bounties</a>
        <a href="/create" className="text-sm text-brand-textMuted hover:text-brand-green transition-colors">Create</a>
        <a href="/profile" className="text-sm text-brand-textMuted hover:text-brand-green transition-colors">Profile</a>

        <WalletButton />
      </div>
    </nav>
  );
}
