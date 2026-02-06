'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const STICKY_KEY = 'ag_wallet_sticky_connected';

function shortKey(s: string) {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function WalletButton() {
  const { connected, connecting, publicKey, disconnect } = useWallet();
  const { setVisible } = useWalletModal();
  const [stickyWanted, setStickyWanted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStickyWanted(window.localStorage.getItem(STICKY_KEY) === '1');
  }, [connected]);

  const restoring = !connected && stickyWanted;

  const label = useMemo(() => {
    if (connected && publicKey) return shortKey(publicKey.toBase58());
    return 'Connect wallet';
  }, [connected, publicKey]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => {
          if (connected) disconnect().catch(() => {});
          else setVisible(true);
        }}
        disabled={connecting || restoring}
        className={`h-9 min-w-[160px] rounded-lg border px-3 text-sm transition-colors ${
          connected
            ? 'border-brand-green/50 text-brand-text hover:border-brand-green'
            : 'border-brand-border text-brand-text hover:border-brand-green'
        } ${connecting || restoring ? 'opacity-70 cursor-wait' : ''}`}
        title={connected ? 'Disconnect wallet' : 'Connect wallet'}
      >
        {label}
      </button>

      {(connecting || restoring) && (
        <div className="h-2.5 w-2.5 rounded-full bg-brand-green/80 animate-pulse" title="Restoring wallet…" />
      )}
    </div>
  );
}
