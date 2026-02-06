'use client';

import { WalletMultiButton } from '@solana/wallet-adapter-react-ui';
import { useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';

const STICKY_KEY = 'ag_wallet_sticky_connected';

export function WalletButton() {
  const { connected, connecting } = useWallet();
  const [stickyWanted, setStickyWanted] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    setStickyWanted(window.localStorage.getItem(STICKY_KEY) === '1');
  }, [connected]);

  const restoring = !connected && stickyWanted;

  return (
    <div className="relative flex items-center">
      <div className="[&_.wallet-adapter-button]:!h-9 [&_.wallet-adapter-button]:!rounded-lg [&_.wallet-adapter-button]:!bg-transparent [&_.wallet-adapter-button]:!border [&_.wallet-adapter-button]:!border-brand-border [&_.wallet-adapter-button]:hover:!border-brand-green [&_.wallet-adapter-button]:!text-brand-text [&_.wallet-adapter-button]:!text-sm">
        <WalletMultiButton />
      </div>

      {(connecting || restoring) && (
        <div className="absolute -left-7 top-1/2 -translate-y-1/2" title={restoring ? 'Restoring wallet connection…' : 'Connecting…'}>
          <div className="h-4 w-4 rounded-full border-2 border-brand-border border-t-brand-green animate-spin" />
        </div>
      )}
    </div>
  );
}
