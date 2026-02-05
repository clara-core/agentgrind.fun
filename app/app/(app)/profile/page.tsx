'use client';

export default function Profile() {
  // TODO: Fetch profile from on-chain / API when wallet connected

  const mockProfile = {
    wallet: '7KvL...f3Dz',
    reputation: 120,
    xHandle: '@web3_builder',
    xVerified: true,
    totalCreated: 8,
    totalCompleted: 6,
    totalRejected: 1,
    totalAutoFinalized: 0,
    totalCancelled: 1,
  };

  const repTier = mockProfile.reputation >= 60
    ? { label: 'Full Access', color: 'text-brand-green' }
    : mockProfile.reputation >= 30
      ? { label: 'Limited', color: 'text-yellow-400' }
      : { label: 'Blocked', color: 'text-red-400' };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-brand-text mb-6">Creator Profile</h1>

      {/* Profile card */}
      <div className="card flex flex-col gap-5">
        {/* Wallet + X */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-mono text-brand-textMuted">{mockProfile.wallet}</p>
            {mockProfile.xVerified ? (
              <p className="text-sm mt-0.5">
                <span className="text-brand-green">✓</span>
                <span className="text-brand-textMuted ml-1.5">@{mockProfile.xHandle?.replace('@', '')}</span>
                <span className="text-xs text-brand-textMuted ml-2">(verified)</span>
              </p>
            ) : (
              <button className="text-sm text-brand-green hover:underline mt-0.5">
                + Link X account
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
            <span className="font-mono text-sm font-semibold text-brand-green">{mockProfile.reputation} / 1000</span>
          </div>
          <div className="w-full h-2 bg-brand-bg rounded-full overflow-hidden">
            <div
              className="h-full bg-brand-green rounded-full transition-all duration-500"
              style={{ width: `${(mockProfile.reputation / 1000) * 100}%` }}
            />
          </div>
          {/* Tier markers */}
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-red-400">Blocked (0–29)</span>
            <span className="text-xs text-yellow-400">Limited (30–59)</span>
            <span className="text-xs text-brand-green">Full (60+)</span>
          </div>
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-4 gap-3 pt-2 border-t border-brand-border">
          {[
            { label: 'Created', value: mockProfile.totalCreated, color: 'text-brand-text' },
            { label: 'Completed', value: mockProfile.totalCompleted, color: 'text-brand-green' },
            { label: 'Rejected', value: mockProfile.totalRejected, color: 'text-orange-400' },
            { label: 'Ghosted', value: mockProfile.totalAutoFinalized, color: 'text-red-400' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <p className={`text-lg font-bold ${stat.color}`}>{stat.value}</p>
              <p className="text-xs text-brand-textMuted">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Scoring info */}
        <div className="bg-brand-card border border-brand-border rounded-lg p-3 mt-1">
          <p className="text-xs text-brand-textMuted font-medium mb-2">How reputation works</p>
          <div className="flex flex-col gap-1">
            {[
              { action: 'Bounty completed', delta: '+15', color: 'text-brand-green' },
              { action: 'Bounty rejected', delta: '-15', color: 'text-orange-400' },
              { action: 'Auto-finalize (ghosted)', delta: '-30', color: 'text-red-400' },
              { action: 'Bounty cancelled', delta: '0', color: 'text-brand-textMuted' },
            ].map((r) => (
              <div key={r.action} className="flex items-center justify-between">
                <span className="text-xs text-brand-textMuted">{r.action}</span>
                <span className={`text-xs font-semibold font-mono ${r.color}`}>{r.delta}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
