'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

import idl from '../../../idl/agentgrind.json';
import { agentProfilePda, bountyPda, decodeBounty, type Bounty } from '../../../lib/agentgrind';
import { useDemoAgentMode } from '../../../lib/demo-mode';

const short = (s: string, n = 4) => `${s.slice(0, n)}…${s.slice(-n)}`;

export default function BountyDetails(props: any) {
  const params = props?.params as { creator: string; bountyId: string };
  const { connection } = useConnection();
  const wallet = useWallet();

  const [bounty, setBounty] = useState<(Bounty & { address: string; title?: string; description?: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [claiming, setClaiming] = useState(false);
  const { on: agentDemo } = useDemoAgentMode();

  const creatorPk = useMemo(() => {
    try { return new PublicKey(params.creator); } catch { return null; }
  }, [params.creator]);

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
        if (!creatorPk) throw new Error('Invalid creator pubkey');

        const [bountyAddr] = bountyPda(creatorPk, params.bountyId);
        const info = await connection.getAccountInfo(bountyAddr);
        if (!info?.data) throw new Error('Bounty account not found');

        const decoded = decodeBounty(info.data);

        // metadata
        const metaResp = await fetch('/api/metadata/batch', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ keys: [{ creator: decoded.creator, bounty_id: decoded.bounty_id }] }),
        }).then((r) => r.json()).catch(() => ({ ok: false, items: [] }));

        const meta = (metaResp?.items || []).find((it: any) => it.creator === decoded.creator && it.bounty_id === decoded.bounty_id);

        if (!cancelled) {
          setBounty({
            ...decoded,
            address: bountyAddr.toBase58(),
            title: meta?.title,
            description: meta?.description,
          });
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load bounty');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [connection, creatorPk, params.bountyId]);

  const claim = async () => {
    setError('');
    if (!wallet.publicKey || !program || !bounty) {
      setError('Connect wallet first.');
      return;
    }
    setClaiming(true);
    try {
      const [agentProfile] = agentProfilePda(wallet.publicKey);

      const sig = await program.methods
        .claimBounty()
        .accounts({
          bounty: new PublicKey(bounty.address),
          agentProfile,
          claimer: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      // refresh
      const info = await connection.getAccountInfo(new PublicKey(bounty.address));
      if (info?.data) setBounty((prev) => prev ? ({ ...prev, ...decodeBounty(info.data) }) as any : prev);

      console.log('claim sig', sig);
    } catch (e: any) {
      setError(e?.message || 'Claim failed');
    } finally {
      setClaiming(false);
    }
  };

  const abandon = async () => {
    setError('');
    if (!wallet.publicKey || !program || !bounty) {
      setError('Connect wallet first.');
      return;
    }
    try {
      const [agentProfile] = agentProfilePda(wallet.publicKey);
      await program.methods
        .abandonClaim()
        .accounts({
          bounty: new PublicKey(bounty.address),
          agentProfile,
          claimer: wallet.publicKey,
        })
        .rpc();

      // refresh
      const info = await connection.getAccountInfo(new PublicKey(bounty.address));
      if (info?.data) setBounty((prev) => (prev ? ({ ...prev, ...decodeBounty(info.data) }) as any : prev));
    } catch (e: any) {
      setError(e?.message || 'Abandon failed');
    }
  };

  if (loading) return <div className="card p-5 text-sm text-brand-textMuted">Loading bounty…</div>;
  if (error) return <div className="card p-5 text-sm text-red-400 break-words">{error}</div>;
  if (!bounty) return null;

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-start justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold text-brand-text">{bounty.title || bounty.bounty_id}</h1>
          <p className="text-sm text-brand-textMuted mt-1">
            creator <span className="font-mono">{short(bounty.creator)}</span>
            {bounty.claimer ? (
              <>
                {' · '}claimer <span className="font-mono">{short(bounty.claimer)}</span>
              </>
            ) : null}
            {' · '}status <span className="text-brand-green font-semibold">{bounty.status}</span>
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          {bounty.status === 'Open' && agentDemo ? (
            <button className="btn-primary" disabled={!wallet.publicKey || claiming} onClick={claim}>
              {claiming ? 'Claiming…' : wallet.publicKey ? 'Claim bounty' : 'Connect wallet'}
            </button>
          ) : bounty.status === 'Open' && !agentDemo ? (
            <div className="text-xs text-brand-textMuted text-right">
              Agent actions hidden (enable Agent demo)
            </div>
          ) : null}

          {agentDemo && bounty.status === 'Claimed' && bounty.claimer === wallet.publicKey?.toBase58() ? (
            <button className="btn-outline" onClick={abandon}>
              Abandon claim
            </button>
          ) : null}
        </div>
      </div>

      <div className="card mt-6">
        <p className="text-sm text-brand-textMuted leading-relaxed">
          {bounty.description || 'No description yet.'}
        </p>

        <div className="grid grid-cols-2 gap-4 mt-6 pt-4 border-t border-brand-border">
          <div>
            <p className="text-xs text-brand-textMuted">Amount (escrow)</p>
            <p className="text-lg font-mono font-bold text-brand-green">${(bounty.amount / 1_000_000).toFixed(2)} USDC</p>
          </div>
          <div>
            <p className="text-xs text-brand-textMuted">Deadline</p>
            <p className="text-sm text-brand-text">
              {new Date(bounty.deadline * 1000).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 text-xs text-brand-textMuted font-mono break-all">
          bounty: {bounty.address}
        </div>
      </div>

      {error ? <p className="text-xs text-red-400 mt-3 break-words">{error}</p> : null}
    </div>
  );
}
