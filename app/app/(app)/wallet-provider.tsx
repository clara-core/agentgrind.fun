'use client';

import { ReactNode, useEffect, useMemo } from 'react';
import { ConnectionProvider, WalletProvider, useWallet } from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';

const STICKY_KEY = 'ag_wallet_sticky_connected';

function WalletStickyConnect() {
  const { wallet, connected, connecting, connect } = useWallet();

  // If the user previously connected and did NOT explicitly disconnect, reconnect on load/navigation.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const want = window.localStorage.getItem(STICKY_KEY) === '1';
    if (!want) return;
    if (!wallet) return;
    if (connected || connecting) return;

    connect().catch(() => {
      // If connect fails (e.g. extension not available), don't loop.
      window.localStorage.removeItem(STICKY_KEY);
    });
  }, [wallet?.adapter?.name, wallet, connected, connecting, connect]);

  // Persist "connected" intent, but ONLY clear it on an actual adapter disconnect.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (connected) window.localStorage.setItem(STICKY_KEY, '1');
  }, [connected]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const adapter = wallet?.adapter as any;
    if (!adapter?.on) return;

    const onDisconnect = () => {
      window.localStorage.removeItem(STICKY_KEY);
    };

    adapter.on('disconnect', onDisconnect);
    return () => {
      try {
        adapter.off?.('disconnect', onDisconnect);
      } catch {
        // ignore
      }
    };
  }, [wallet]);

  return null;
}

export function AppWalletProvider({ children }: { children: ReactNode }) {
  // Devnet-first (per Marko). Switch later for mainnet.
  const endpoint = 'https://api.devnet.solana.com';

  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect={false}>
        <WalletModalProvider>
          <WalletStickyConnect />
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
