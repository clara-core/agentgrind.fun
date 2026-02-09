'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { useDemoAgentMode } from '../lib/demo-mode';
import { AGENTGRIND_PROGRAM_ID, agentProfilePda, BOUNTY_ACCOUNT_SIZE, decodeBounty, type Bounty } from '../lib/agentgrind';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import idl from '../idl/agentgrind.json';

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

function BountyCard({ bounty, onClaim, agentDemo, canSubmitProof }: { bounty: (Bounty & { address: string; title?: string; description?: string }); onClaim: (address: string) => Promise<void>; agentDemo: boolean; canSubmitProof: boolean }) {
  const isExpired = bounty.deadline < Date.now() / 1000;
  const canActOnExpired = bounty.status !== 'Open' && bounty.status !== 'Claimed';

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-base font-semibold text-brand-text">
            <a className="hover:underline" href={`/bounties/${bounty.creator}/${bounty.bounty_id}`}>
              {bounty.title || bounty.bounty_id || 'Untitled bounty'}
            </a>
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
        {isExpired && !canActOnExpired ? (
          <span className="badge bg-red-500/10 text-red-400 border-red-500/20">Expired</span>
        ) : (
          <span className={statusBadge(bounty.status)}>{bounty.status}</span>
        )}
      </div>

      {bounty.description ? (
        <p className="text-sm text-brand-textMuted leading-relaxed break-words">{bounty.description}</p>
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
        {isExpired && (bounty.status === 'Open' || bounty.status === 'Claimed') ? (
          <div className="text-xs text-red-400 w-full text-center py-2 border border-red-500/20 rounded-lg">
            Expired — no actions available
          </div>
        ) : bounty.status === 'Open' && agentDemo ? (
          <button className="btn-primary text-sm w-full" onClick={() => onClaim(bounty.address)}>
            Claim
          </button>
        ) : bounty.status === 'Claimed' && agentDemo && canSubmitProof ? (
          <a className="btn-outline text-sm w-full text-center" href={`/bounties/${bounty.creator}/${bounty.bounty_id}`}>
            Submit proof
          </a>
        ) : bounty.status === 'Claimed' && agentDemo && !canSubmitProof ? (
          <div className="text-xs text-brand-textMuted w-full text-center py-2 border border-brand-border rounded-lg">
            Claimed (only claimer can submit)
          </div>
        ) : bounty.status === 'Open' && !agentDemo ? (
          <div className="text-xs text-brand-textMuted w-full text-center py-2 border border-brand-border rounded-lg">
            Agent actions hidden (enable Agent demo)
          </div>
        ) : null}
      </div>
    </div>
  );
}

export default function BountiesPage() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const { on: agentDemo } = useDemoAgentMode();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [bounties, setBounties] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const programId = useMemo(() => new PublicKey(AGENTGRIND_PROGRAM_ID.toBase58()), []);

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;
    const provider = new anchor.AnchorProvider(connection, wallet as any, { commitment: 'confirmed' });
    return new anchor.Program(idl as any, provider);
  }, [connection, wallet]);

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
              return { ...decodeBounty(a.account.data), address: a.pubkey.toBase58() };
            } catch {
              return null;
            }
          })
          .filter(Boolean) as any[];

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

  const filteredBounties = useMemo(() => {
    let result = bounties;

    // Status filter
    if (statusFilter !== 'All') {
      result = result.filter((b) => b.status === statusFilter);
    }

    // Search filter (title or description)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (b) =>
          (b.title && b.title.toLowerCase().includes(q)) ||
          (b.description && b.description.toLowerCase().includes(q)) ||
          (b.bounty_id && b.bounty_id.toLowerCase().includes(q))
      );
    }

    return result;
  }, [bounties, statusFilter, searchQuery]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Bounties (devnet)</h1>
          <p className="text-sm text-brand-textMuted mt-0.5">Live on-chain accounts from AgentGrind program</p>
        </div>
        <a href="/create" className="btn-primary text-sm">+ Post Bounty</a>
      </div>

      {/* Filters and Search */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Status filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="flex-shrink-0 bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-green transition-colors"
        >
          <option>All</option>
          <option>Open</option>
          <option>Claimed</option>
          <option>Submitted</option>
          <option>Completed</option>
          <option>Cancelled</option>
          <option>Rejected</option>
        </select>

        {/* Search */}
        <input
          type="text"
          placeholder="Search title, description, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors"
        />

        {/* Results count */}
        {(statusFilter !== 'All' || searchQuery.trim()) && (
          <div className="flex items-center gap-2 text-xs text-brand-textMuted">
            <span>{filteredBounties.length} result{filteredBounties.length === 1 ? '' : 's'}</span>
            <button
              onClick={() => {
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="text-brand-green hover:underline"
            >
              Clear
            </button>
          </div>
        )}
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
      ) : filteredBounties.length === 0 ? (
        <div className="card p-5">
          <p className="text-sm text-brand-text">No bounties match your filters.</p>
          <p className="text-xs text-brand-textMuted mt-1">Try adjusting your search or status filter.</p>
          <button
            onClick={() => {
              setStatusFilter('All');
              setSearchQuery('');
            }}
            className="btn-outline inline-block mt-4 text-sm"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredBounties.map((b: any) => (
            <BountyCard
              key={`${b.creator}-${b.bounty_id}-${b.deadline}`}
              bounty={b}
              agentDemo={agentDemo}
              canSubmitProof={!!wallet.publicKey && b.claimer === wallet.publicKey.toBase58()}
              onClaim={async (address) => {
                setError('');
                if (!wallet.publicKey || !program) {
                  setError('Connect wallet to claim.');
                  return;
                }
                try {
                  const [agentProfile] = agentProfilePda(wallet.publicKey);

                  await program.methods
                    .claimBounty()
                    .accounts({
                      bounty: new PublicKey(address),
                      agentProfile,
                      claimer: wallet.publicKey,
                      systemProgram: SystemProgram.programId,
                    })
                    .rpc();

                  // refresh claimed status locally
                  setBounties((prev) =>
                    prev.map((x: any) => (x.address === address ? { ...x, status: 'Claimed', claimer: wallet.publicKey.toBase58() } : x))
                  );
                } catch (e: any) {
                  setError(e?.message || 'Claim failed');
                }
              }}
            />
          ))}
        </div>
      )}

      <div className="mt-6 text-xs text-brand-textMuted">
        Filter: program accounts where <span className="font-mono">dataSize = {BOUNTY_ACCOUNT_SIZE}</span>.
      </div>
    </div>
  );
}
