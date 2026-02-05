'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { BOUNTY_ACCOUNT_SIZE, decodeBounty, type Bounty } from '../lib/agentgrind';
import { PublicKey } from '@solana/web3.js';
import { AGENTGRIND_PROGRAM_ID } from '../lib/agentgrind';

const statusBadge = (status: string) => {
  const map: Record<string, string> = {
    Open: 'badge badge-open',
    Claimed: 'badge badge-claimed',
    Submitted: 'badge badge-submitted',
    Completed: 'badge badge-completed',
    Cancelled: 'badge badge-cancelled',
    Rejected: 'badge badge-rejected',
  };
  return map[status] || 'badge';
};

const formatDeadline = (ts: number) => {
  const hoursLeft = (ts - Date.now() / 1000) / 3600;
  if (hoursLeft < 0) return 'expired';
  if (hoursLeft < 24) return `${Math.floor(hoursLeft)}h left`;
  return `${Math.floor(hoursLeft / 24)}d left`;
};

const short = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;

function BountyCard({ bounty }: { bounty: Bounty & { title?: string; description?: string } }) {
  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-brand-text">
            {bounty.title || bounty.bounty_id || 'Untitled bounty'}
          </h3>
          <p className="text-xs text-brand-textMuted mt-0.5">
            creator <span className="font-mono">{short(bounty.creator)}</span>
            {bounty.claimer ? (
              <>
                {' · '}claimer <span className="font-mono">{short(bounty.claimer)}</span>
              </>
            ) : null}
          </p>
        </div>
        <span className={statusBadge(bounty.status)}>{bounty.status}</span>
      </div>

      {bounty.description ? (
        <p className="text-sm text-brand-textMuted leading-relaxed">{bounty.description}</p>
      ) : bounty.proof_uri ? (
        <p className="text-xs text-brand-textMuted break-all">
          proof:{' '}
          <a className="text-brand-green hover:underline" href={bounty.proof_uri} target="_blank" rel="noreferrer">
            {bounty.proof_uri}
          </a>
        </p>
      ) : (
        <p className="text-sm text-brand-textMuted leading-relaxed">
          No off-chain metadata found for this bounty yet.
        </p>
      )}

      <div className="flex items-center justify-between pt-2 border-t border-brand-border">
        <span className="font-mono text-sm font-semibold text-brand-green">
          ${(bounty.amount / 1_000_000).toFixed(2)} USDC
        </span>
        <span className="text-xs text-brand-textMuted">{formatDeadline(bounty.deadline)}</span>
      </div>

      <div className="flex gap-2 pt-1">
        {bounty.status === 'Open' && (
          <button className="btn-primary text-sm w-full" disabled>
            Claim (next)
          </button>
        )}
        {bounty.status === 'Claimed' && (
          <button className="btn-outline text-sm w-full" disabled>
            Submit Proof (next)
          </button>
        )}
        {bounty.status === 'Submitted' && (
          <button className="btn-outline text-sm w-full" disabled>
            Review / Finalize (next)
          </button>
        )}
      </div>
    </div>
  );
}

export default function BountiesPage() {
  const { connection } = useConnection();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bounties, setBounties] = useState<Bounty[]>([]);

  const programId = useMemo(() => new PublicKey(AGENTGRIND_PROGRAM_ID.toBase58()), []);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        const accounts = await connection.getProgramAccounts(programId, {
          filters: [{ dataSize: BOUNTY_ACCOUNT_SIZE }],
        });

        const decoded = accounts
          .map((a) => {
            try {
              return decodeBounty(a.account.data);
            } catch {
              return null;
            }
          })
          .filter(Boolean) as Bounty[];

        // fetch off-chain metadata (title/description)
        const metaResp = await fetch('/api/metadata/batch', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            keys: decoded.map((b) => ({ creator: b.creator, bounty_id: b.bounty_id })),
          }),
        }).then((r) => r.json()).catch(() => ({ ok: false, items: [] }));

        const metaMap = new Map<string, { title: string; description: string }>();
        for (const it of metaResp?.items || []) {
          if (!it?.creator || !it?.bounty_id) continue;
          metaMap.set(`${it.creator}:${it.bounty_id}`, { title: it.title, description: it.description });
        }

        const merged = decoded.map((b) => {
          const m = metaMap.get(`${b.creator}:${b.bounty_id}`);
          return {
            ...b,
            // piggyback in proof_uri slot for now? no, just attach fields ad-hoc
            title: m?.title,
            description: m?.description,
          } as any;
        });

        merged.sort((x: any, y: any) => y.deadline - x.deadline);

        if (!cancelled) setBounties(merged as any);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load bounties');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [connection, programId]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Bounties (devnet)</h1>
          <p className="text-sm text-brand-textMuted mt-0.5">Live on-chain accounts from AgentGrind program</p>
        </div>
        <a href="/create" className="btn-primary text-sm">+ Post Bounty</a>
      </div>

      {loading ? (
        <div className="card p-5 text-sm text-brand-textMuted">Loading bounties from devnet…</div>
      ) : error ? (
        <div className="card p-5">
          <p className="text-sm text-red-400">Failed to load bounties</p>
          <p className="text-xs text-brand-textMuted mt-1 font-mono break-all">{error}</p>
        </div>
      ) : bounties.length === 0 ? (
        <div className="card p-5">
          <p className="text-sm text-brand-text">No bounties found on devnet yet.</p>
          <p className="text-xs text-brand-textMuted mt-1">Create one to initialize.</p>
          <a href="/create" className="btn-primary inline-block mt-4 text-sm">Create bounty</a>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {bounties.map((b) => (
            <BountyCard key={`${b.creator}-${b.bounty_id}-${b.deadline}`} bounty={b} />
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-brand-textMuted">
        Filter: program accounts where <span className="font-mono">dataSize = {BOUNTY_ACCOUNT_SIZE}</span>.
      </div>
    </div>
  );
}
