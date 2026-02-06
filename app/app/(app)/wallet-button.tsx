'use client';

import { useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';

const STICKY_KEY = 'ag_wallet_sticky_connected';

function shortKey(s: string) {
  return `${s.slice(0, 4)}…${s.slice(-4)}`;
}

export function WalletButton() {
  const { connected, connecting, publicKey, disconnect, wallet } = useWallet();
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

  const icon = wallet?.adapter?.icon;
  const name = wallet?.adapter?.name;

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={() => setVisible(true)}
        className={`h-9 min-w-[170px] rounded-lg border px-3 text-sm transition-colors flex items-center gap-2 justify-center ${
          connected
            ? 'border-brand-green/50 text-brand-text hover:border-brand-green'
            : 'border-brand-border text-brand-text hover:border-brand-green'
        } ${connecting || restoring ? 'opacity-80' : ''}`}
        title={connected ? 'Wallet connected' : 'Connect wallet'}
      >
        {icon && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt={name ?? 'wallet'} className="h-4 w-4 rounded" />
        )}
        <span className="tabular-nums">{label}</span>
      </button>

      {connected && (
        <button
          type="button"
          onClick={() => disconnect().catch(() => {})}
          className="h-9 w-9 rounded-lg border border-brand-border hover:border-brand-green text-brand-textMuted hover:text-brand-text transition-colors"
          title="Disconnect"
        >
          ×
        </button>
      )}

      {(connecting || restoring) && (
        <div className="h-2.5 w-2.5 rounded-full bg-brand-green/80 animate-pulse" title={restoring ? 'Restoring wallet…' : 'Connecting…'} />
      )}
    </div>
  );
}
