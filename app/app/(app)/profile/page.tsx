'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { creatorProfilePda, decodeCreatorProfile } from '../lib/agentgrind';

const short = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;

type LoadState =
  | { kind: 'idle' }
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'loaded'; profile: ReturnType<typeof decodeCreatorProfile> }
  | { kind: 'error'; message: string };

export default function Profile() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [state, setState] = useState<LoadState>({ kind: 'idle' });

  const [pda] = useMemo(() => {
    if (!publicKey) return [null as any, null as any];
    return creatorProfilePda(publicKey);
  }, [publicKey]);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!publicKey) {
        setState({ kind: 'idle' });
        return;
      }

      setState({ kind: 'loading' });
      try {
        const info = await connection.getAccountInfo(pda);
        if (!info?.data) {
          if (!cancelled) setState({ kind: 'missing' });
          return;
        }
        const decoded = decodeCreatorProfile(info.data);
        if (!cancelled) setState({ kind: 'loaded', profile: decoded });
      } catch (e: any) {
        if (!cancelled) setState({ kind: 'error', message: e?.message || 'Failed to load profile' });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey, pda]);

  const profile = state.kind === 'loaded' ? state.profile : null;
  const reputation = profile?.reputation ?? 0;

  const repTier = reputation >= 60
    ? { label: 'Full Access', color: 'text-brand-green' }
    : reputation >= 30
      ? { label: 'Limited', color: 'text-yellow-400' }
      : { label: 'Blocked', color: 'text-red-400' };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-brand-text mb-2">Creator Profile</h1>
      <p className="text-sm text-brand-textMuted mb-6">
        {publicKey ? (
          <>Connected wallet: <span className="font-mono">{short(publicKey.toBase58())}</span></>
        ) : (
          <>Connect your wallet to view your on-chain profile.</>
        )}
      </p>

      {!publicKey ? null : state.kind === 'loading' ? (
        <div className="card p-5 text-sm text-brand-textMuted">Loading on-chain profile…</div>
      ) : state.kind === 'missing' ? (
        <div className="card p-5">
          <p className="text-sm text-brand-text">No on-chain CreatorProfile found yet.</p>
          <p className="text-xs text-brand-textMuted mt-1">
            It auto-initializes the first time you create a bounty on devnet.
          </p>
          <a href="/create" className="btn-primary inline-block mt-4 text-sm">Initialize by posting a bounty</a>
        </div>
      ) : state.kind === 'error' ? (
        <div className="card p-5">
          <p className="text-sm text-red-400">Failed to load profile</p>
          <p className="text-xs text-brand-textMuted mt-1 font-mono">{state.message}</p>
        </div>
      ) : null}

      {profile && (
        <div className="card flex flex-col gap-5 mt-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-mono text-brand-textMuted">{short(profile.wallet)}</p>
              {profile.x_verified ? (
                <p className="text-sm mt-0.5">
                  <span className="text-brand-green">✓</span>
                  <span className="text-brand-textMuted ml-1.5">@{profile.x_handle?.replace('@', '')}</span>
                  <span className="text-xs text-brand-textMuted ml-2">(verified)</span>
                </p>
              ) : (
                <button className="text-sm text-brand-green hover:underline mt-0.5">
                  + Link X account (next)
                </button>
              )}
            </div>
            <span className={`badge text-sm font-semibold ${repTier.color} bg-brand-card border border-brand-border`}>
              {repTier.label}
            </span>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-sm text-brand-textMuted">Reputation</span>
              <span className="font-mono text-sm font-semibold text-brand-green">{profile.reputation} / 1000</span>
            </div>
            <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden">
              <div className="h-full bg-brand-green rounded-full" style={{ width: `${(profile.reputation / 1000) * 100}%` }} />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-3 pt-2 border-t border-brand-border">
            {[
              { label: 'Created', value: profile.total_created, color: 'text-brand-text' },
              { label: 'Completed', value: profile.total_completed, color: 'text-brand-green' },
              { label: 'Rejected', value: profile.total_rejected, color: 'text-orange-400' },
              { label: 'Ghosted', value: profile.total_auto_finalized, color: 'text-red-400' },
            ].map((stat) => (
              <div key={stat.label} className="text-center">
                <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-brand-textMuted">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="bg-brand-card border border-brand-border rounded-lg p-3 mt-1">
            <p className="text-xs text-brand-textMuted font-mono">
              profile PDA: {short(pda.toBase58())}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
