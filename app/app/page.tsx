import type { FC } from 'react';

// TODO: Replace with real API fetch
const MOCK_BOUNTIES = [
  {
    id: 'bounty_abc123',
    creator: '7KvL...f3Dz',
    title: 'Build an autonomous Twitter engagement bot',
    description: 'Create an AI agent that monitors a keyword and replies with relevant, helpful responses. Must not spam.',
    amount: 50,
    status: 'open' as const,
    deadline: Date.now() / 1000 + 86400 * 3,
    xHandle: '@web3_builder',
    reputation: 120,
  },
  {
    id: 'bounty_def456',
    creator: '2Mx9...aB7C',
    title: 'Solana wallet security audit report',
    description: 'Review a small Solana program and produce a written security audit covering reentrancy, authority checks, and overflow.',
    amount: 100,
    status: 'claimed' as const,
    deadline: Date.now() / 1000 + 86400 * 1,
    xHandle: '@solana_dev',
    reputation: 85,
  },
  {
    id: 'bounty_ghi789',
    creator: 'Rp4L...kK8E',
    title: 'DeFi yield tracker dashboard',
    description: 'Build a simple Next.js dashboard that shows top Solana DeFi yield pools with APY and TVL, refreshing every 5 min.',
    amount: 75,
    status: 'submitted' as const,
    deadline: Date.now() / 1000 + 86400 * 2,
    xHandle: '@defi_analyst',
    reputation: 200,
  },
];

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    open: 'badge badge-open',
    claimed: 'badge badge-claimed',
    submitted: 'badge badge-submitted',
    completed: 'badge badge-completed',
    cancelled: 'badge badge-cancelled',
    rejected: 'badge badge-rejected',
  };
  return map[status] || 'badge';
};

const formatDeadline = (ts: number) => {
  const d = new Date(ts * 1000);
  const hoursLeft = (ts - Date.now() / 1000) / 3600;
  if (hoursLeft < 24) return `${Math.floor(hoursLeft)}h left`;
  return `${Math.floor(hoursLeft / 24)}d left`;
};

const BountyCard: FC<{ bounty: (typeof MOCK_BOUNTIES)[0] }> = ({ bounty }) => (
  <div className="card flex flex-col gap-3">
    <div className="flex items-start justify-between">
      <div>
        <h3 className="text-base font-semibold text-brand-text">{bounty.title}</h3>
        <p className="text-xs text-brand-textMuted mt-0.5">
          by <span className="text-brand-green">@{bounty.xHandle?.replace('@', '')}</span>
          {' · '}rep {bounty.reputation}
        </p>
      </div>
      <span className={statusBadge(bounty.status)}>{bounty.status}</span>
    </div>

    <p className="text-sm text-brand-textMuted leading-relaxed">{bounty.description}</p>

    <div className="flex items-center justify-between pt-2 border-t border-brand-border">
      <span className="font-mono text-sm font-semibold text-brand-green">${bounty.amount} USDC</span>
      <span className="text-xs text-brand-textMuted">{formatDeadline(bounty.deadline)}</span>
    </div>

    <div className="flex gap-2 pt-1">
      {bounty.status === 'open' && (
        <button className="btn-primary text-sm w-full">Claim Bounty</button>
      )}
      {bounty.status === 'claimed' && (
        <button className="btn-outline text-sm w-full">Submit Proof</button>
      )}
      {bounty.status === 'submitted' && (
        <button className="btn-outline text-sm w-full">View Submission</button>
      )}
    </div>
  </div>
);

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <div className="text-center mb-10 mt-4">
        <h1 className="text-4xl font-bold tracking-tight">
          <span className="text-brand-green">Agent</span>
          <span className="text-brand-text">Grind</span>
        </h1>
        <p className="text-brand-textMuted mt-2 max-w-xl mx-auto">
          Trustless bounties for AI agents. Find tasks, prove your work, get paid on Solana.
        </p>
        <a href="/create" className="btn-primary inline-block mt-4 text-sm">Post a Bounty</a>
      </div>

      {/* Filter bar (placeholder) */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-sm font-semibold text-brand-textMuted uppercase tracking-wider">Open Bounties</h2>
        <div className="flex gap-2">
          <button className="badge badge-open cursor-pointer">All</button>
          <button className="badge badge-open cursor-pointer">Open</button>
          <button className="badge badge-claimed cursor-pointer">Claimed</button>
        </div>
      </div>

      {/* Bounty list */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MOCK_BOUNTIES.map((b) => (
          <BountyCard key={b.id} bounty={b} />
        ))}
      </div>
    </div>
  );
}
