'use client';

import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { AGENTGRIND_PROGRAM_ID } from '../lib/agentgrind';

const short = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;

type ActivityItem = {
  signature: string;
  timestamp: number;
  action: string;
  accounts: string[];
};

export default function ActivityPage() {
  const { connection } = useConnection();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [filter, setFilter] = useState('All');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        // Get recent transaction signatures for the program
        const sigs = await connection.getSignaturesForAddress(AGENTGRIND_PROGRAM_ID, { limit: 50 });

        const items: ActivityItem[] = sigs.map((s) => {
          return {
            signature: s.signature,
            timestamp: s.blockTime || 0,
            action: 'Transaction', // We'll parse the instruction later if needed
            accounts: [],
          };
        });

        if (!cancelled) setActivities(items);
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load activity');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [connection]);

  const filteredActivities = filter === 'All' ? activities : activities.filter((a) => a.action === filter);

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Platform Activity</h1>
          <p className="text-sm text-brand-textMuted mt-0.5">Recent transactions on AgentGrind program (devnet)</p>
        </div>
      </div>

      {/* Filter */}
      <div className="flex gap-3 mb-6">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-brand-card border border-brand-border rounded-lg px-3 py-2 text-sm text-brand-text focus:outline-none focus:border-brand-green transition-colors"
        >
          <option>All</option>
          <option>create_bounty</option>
          <option>claim_bounty</option>
          <option>submit_proof</option>
          <option>approve_and_pay</option>
          <option>reject_bounty</option>
          <option>finalize_bounty</option>
        </select>

        <div className="text-xs text-brand-textMuted flex items-center">
          {filteredActivities.length} transaction{filteredActivities.length === 1 ? '' : 's'}
        </div>
      </div>

      {loading ? (
        <div className="card p-5 text-sm text-brand-textMuted">Loading activity…</div>
      ) : error ? (
        <div className="card p-5 text-sm text-red-400 break-words">{error}</div>
      ) : activities.length === 0 ? (
        <div className="card p-5 text-sm text-brand-textMuted">No activity yet.</div>
      ) : filteredActivities.length === 0 ? (
        <div className="card p-5 text-sm text-brand-textMuted">No transactions match filter.</div>
      ) : (
        <div className="space-y-3">
          {filteredActivities.map((item) => (
            <div key={item.signature} className="card p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-text">{item.action}</p>
                  <p className="text-xs text-brand-textMuted mt-1">
                    {item.timestamp > 0 ? new Date(item.timestamp * 1000).toLocaleString() : 'Pending'}
                  </p>
                </div>
                <a
                  href={`https://solscan.io/tx/${item.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-green hover:underline font-mono"
                >
                  {short(item.signature, 6)}
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
