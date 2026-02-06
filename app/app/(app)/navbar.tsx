'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useDemoAgentMode } from './lib/demo-mode';

export function Navbar() {
  const { on, toggle } = useDemoAgentMode();
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

        <button
          type="button"
          onClick={toggle}
          className={`text-xs px-3 py-2 rounded-lg border transition-colors ${on ? 'border-brand-green text-brand-green' : 'border-brand-border text-brand-textMuted hover:text-brand-text'}`}
          title="Toggle agent demo actions in UI"
        >
          Agent demo: {on ? 'ON' : 'OFF'}
        </button>

        <div className="[&_.wallet-adapter-button]:!h-9 [&_.wallet-adapter-button]:!rounded-lg [&_.wallet-adapter-button]:!bg-transparent [&_.wallet-adapter-button]:!border [&_.wallet-adapter-button]:!border-brand-border [&_.wallet-adapter-button]:hover:!border-brand-green [&_.wallet-adapter-button]:!text-brand-text [&_.wallet-adapter-button]:!text-sm">
          <WalletMultiButton />
        </div>
      </div>
    </nav>
  );
}
