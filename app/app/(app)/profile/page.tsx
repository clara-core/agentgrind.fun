'use client';

import { useWallet } from '@solana/wallet-adapter-react';

const short = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;

export default function Profile() {
  const { publicKey } = useWallet();

  // TODO (Step 2): Fetch CreatorProfile from chain for this wallet.
  const demo = {
    reputation: 120,
    xHandle: '@web3_builder',
    xVerified: false,
    totalCreated: 8,
    totalCompleted: 6,
    totalRejected: 1,
    totalAutoFinalized: 0,
  };

  const repTier = demo.reputation >= 60
    ? { label: 'Full Access', color: 'text-brand-green' }
    : demo.reputation >= 30
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

      <div className="card flex flex-col gap-5">
        {/* Wallet + X */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-mono text-brand-textMuted">
              {publicKey ? short(publicKey.toBase58()) : '—'}
            </p>
            {demo.xVerified ? (
              <p className="text-sm mt-0.5">
                <span className="text-brand-green">✓</span>
                <span className="text-brand-textMuted ml-1.5">@{demo.xHandle?.replace('@', '')}</span>
                <span className="text-xs text-brand-textMuted ml-2">(verified)</span>
              </p>
            ) : (
              <button className="text-sm text-brand-green hover:underline mt-0.5" disabled={!publicKey}>
                + Link X account (next)
              </button>
            )}
          </div>
          <span className={`badge text-sm font-semibold ${repTier.color} bg-brand-card border border-brand-border`}>
            {repTier.label}
          </span>
        </div>

        {/* Reputation bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-brand-textMuted">Reputation</span>
            <span className="font-mono text-sm font-semibold text-brand-green">{demo.reputation} / 1000</span>
          </div>
          <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden">
            <div className="h-full bg-brand-green rounded-full" style={{ width: `${(demo.reputation / 1000) * 100}%` }} />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-red-400">Blocked (0–29)</span>
            <span className="text-xs text-yellow-400">Limited (30–59)</span>
            <span className="text-xs text-brand-green">Full (60+)</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-brand-border">
          {[
            { label: 'Created', value: demo.totalCreated, color: 'text-brand-text' },
            { label: 'Completed', value: demo.totalCompleted, color: 'text-brand-green' },
            { label: 'Rejected', value: demo.totalRejected, color: 'text-orange-400' },
            { label: 'Ghosted', value: demo.totalAutoFinalized, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-brand-textMuted">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="bg-brand-card border border-brand-border rounded-lg p-3 mt-1">
          <p className="text-xs text-brand-textMuted">
            Note: stats are still demo data until Step 2 (on-chain CreatorProfile fetch).
          </p>
        </div>
      </div>
    </div>
  );
}
