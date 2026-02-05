'use client';

import { useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

import idl from '../idl/agentgrind.json';
import { AGENTGRIND_PROGRAM_ID, bountyPda, vaultPda } from '../lib/agentgrind';

const USDC_MINT_DEVNET = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

export default function CreateBounty() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [bountyId, setBountyId] = useState(() => `b_${Date.now().toString(36)}`);
  const [amount, setAmount] = useState('10');
  const [deadlineDays, setDeadlineDays] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sig, setSig] = useState('');

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;
    const provider = new anchor.AnchorProvider(connection, wallet as any, {
      commitment: 'confirmed',
    });
    return new anchor.Program(idl as any, provider);
  }, [connection, wallet]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSig('');

    if (!wallet.publicKey || !program) {
      setError('Connect your wallet first.');
      return;
    }

    setSubmitting(true);

    try {
      const creator = wallet.publicKey;
      const mint = USDC_MINT_DEVNET;

      const amountAtoms = Math.floor(Number(amount) * 1_000_000);
      if (!Number.isFinite(amountAtoms) || amountAtoms <= 0) throw new Error('Invalid amount');

      const deadline = Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400;

      const [bounty] = bountyPda(creator, bountyId);
      const [vault] = vaultPda(bounty);
      const [profile] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), creator.toBuffer()],
        AGENTGRIND_PROGRAM_ID
      );

      const creatorTokenAccount = await getAssociatedTokenAddress(mint, creator);

      const txSig = await program.methods
        .createBounty(bountyId, new anchor.BN(amountAtoms), new anchor.BN(deadline))
        .accounts({
          bounty,
          vault,
          profile,
          mint,
          creatorTokenAccount,
          creator,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
          rent: anchor.web3.SYSVAR_RENT_PUBKEY,
        })
        .rpc();

      setSig(txSig);
    } catch (err: any) {
      const msg = err?.message || 'Failed to create bounty';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold text-brand-text mb-1">Create a Bounty (devnet)</h1>
      <p className="text-sm text-brand-textMuted mb-6">
        This sends a real on-chain transaction. You need devnet USDC in your wallet.
      </p>

      <form onSubmit={handleSubmit} className="card flex flex-col gap-5">
        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5">Bounty ID</label>
          <input
            type="text"
            value={bountyId}
            onChange={(e) => setBountyId(e.target.value)}
            required
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors font-mono"
          />
          <p className="text-xs text-brand-textMuted mt-1">Used for PDA seeds. Keep it short and unique.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">Amount (USDC)</label>
            <div className="relative">
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="10"
                min="1"
                step="0.01"
                required
                className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-brand-textMuted font-mono">USDC</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">Deadline</label>
            <select
              value={deadlineDays}
              onChange={(e) => setDeadlineDays(e.target.value)}
              className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text focus:outline-none focus:border-brand-green transition-colors"
            >
              <option value="1">1 day</option>
              <option value="2">2 days</option>
              <option value="3">3 days</option>
              <option value="7">7 days</option>
              <option value="14">14 days</option>
            </select>
          </div>
        </div>

        <div className="bg-brand-green/5 border border-brand-green/20 rounded-lg px-4 py-3">
          <p className="text-xs text-brand-green">
            Uses devnet USDC mint: <span className="font-mono">{USDC_MINT_DEVNET.toBase58()}</span>
          </p>
        </div>

        {error && <p className="text-sm text-red-400 break-words">{error}</p>}

        {sig && (
          <div className="bg-brand-card border border-brand-border rounded-lg px-4 py-3">
            <p className="text-xs text-brand-textMuted">Transaction</p>
            <a
              className="text-sm text-brand-green hover:underline font-mono break-all"
              href={`https://solscan.io/tx/${sig}?cluster=devnet`}
              target="_blank"
              rel="noreferrer"
            >
              {sig}
            </a>
          </div>
        )}

        <button type="submit" disabled={submitting || !wallet.publicKey} className="btn-primary text-sm">
          {submitting ? 'Creating…' : wallet.publicKey ? 'Create Bounty' : 'Connect Wallet'}
        </button>
      </form>
    </div>
  );
}
