'use client';

import { useEffect, useState } from 'react';
import { useConnection } from '@solana/wallet-adapter-react';
import { AGENTGRIND_PROGRAM_ID } from '../lib/agentgrind';

const short = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;

type ActivityItem = {
  signature: string;
  timestamp: number;
  signer: string;
  slot: number;
};

export default function ActivityPage() {
  const { connection } = useConnection();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      setError('');
      try {
        // Get recent transaction signatures for the program
        const sigs = await connection.getSignaturesForAddress(AGENTGRIND_PROGRAM_ID, { limit: 50 });

        const items: ActivityItem[] = sigs
          .filter((s) => !s.err)
          .map((s) => ({
            signature: s.signature,
            timestamp: s.blockTime || 0,
            signer: '', // Will show tx link instead
            slot: s.slot,
          }));

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

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">Platform Activity</h1>
          <p className="text-sm text-brand-textMuted mt-0.5">Recent transactions on AgentGrind program (devnet)</p>
        </div>
        {activities.length > 0 && (
          <div className="text-xs text-brand-textMuted">
            {activities.length} transaction{activities.length === 1 ? '' : 's'}
          </div>
        )}
      </div>

      {loading ? (
        <div className="card p-5 text-sm text-brand-textMuted">Loading activity…</div>
      ) : error ? (
        <div className="card p-5 text-sm text-red-400 break-words">{error}</div>
      ) : activities.length === 0 ? (
        <div className="card p-5 text-sm text-brand-textMuted">No activity yet.</div>
      ) : (
        <div className="space-y-2">
          {activities.map((item) => (
            <div key={item.signature} className="card p-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-brand-text">Program transaction</p>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    {item.timestamp > 0 ? new Date(item.timestamp * 1000).toLocaleString() : 'Pending'} · Slot {item.slot.toLocaleString()}
                  </p>
                </div>
                <a
                  href={`https://solscan.io/tx/${item.signature}?cluster=devnet`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-brand-green hover:underline font-mono"
                >
                  View tx →
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
