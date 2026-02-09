'use client';

import { useEffect, useMemo, useState } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createTransferInstruction,
  getAssociatedTokenAddress,
  getAccount,
  TOKEN_PROGRAM_ID,
} from '@solana/spl-token';
import * as anchor from '@coral-xyz/anchor';

import idl from '../idl/agentgrind.json';
import { AGENTGRIND_PROGRAM_ID, bountyPda, vaultPda } from '../lib/agentgrind';

const USDC_MINT_DEVNET = new PublicKey('Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr');

export default function CreateBounty() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('10');
  const [deadlineDays, setDeadlineDays] = useState('3');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [sig, setSig] = useState('');
  const [usdcBalance, setUsdcBalance] = useState<number | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);

  // internal id (PDA seed); user shouldn't choose
  const bountyId = useMemo(() => `b_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`,
    []
  );

  // Fetch USDC balance when wallet connects
  useEffect(() => {
    if (!wallet.publicKey) {
      setUsdcBalance(null);
      return;
    }

    const fetchBalance = async () => {
      setBalanceLoading(true);
      try {
        const ata = await getAssociatedTokenAddress(USDC_MINT_DEVNET, wallet.publicKey!);
        const accountInfo = await getAccount(connection, ata);
        const balance = Number(accountInfo.amount) / 1_000_000;
        setUsdcBalance(balance);
      } catch (err) {
        // ATA doesn't exist or other error → balance is 0
        setUsdcBalance(0);
      } finally {
        setBalanceLoading(false);
      }
    };

    fetchBalance();
  }, [wallet.publicKey, connection]);

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

    if (!title.trim() || !description.trim()) {
      setError('Title and description are required.');
      return;
    }

    const treasuryStr = process.env.NEXT_PUBLIC_TREASURY_DEVNET;
    if (!treasuryStr) {
      setError('Missing NEXT_PUBLIC_TREASURY_DEVNET (platform fee destination).');
      return;
    }

    setSubmitting(true);

    try {
      const creator = wallet.publicKey;
      const mint = USDC_MINT_DEVNET;
      const treasury = new PublicKey(treasuryStr);

      const grossAtoms = Math.floor(Number(amount) * 1_000_000);
      if (!Number.isFinite(grossAtoms) || grossAtoms <= 0) throw new Error('Invalid amount');

      // Check balance before attempting transaction
      if (usdcBalance !== null && Number(amount) > usdcBalance) {
        throw new Error(`Insufficient USDC balance. You have ${usdcBalance.toFixed(2)} USDC, need ${Number(amount).toFixed(2)} USDC.`);
      }

      const feeAtoms = Math.floor(grossAtoms * 0.1);
      const netAtoms = grossAtoms - feeAtoms;
      if (netAtoms <= 0) throw new Error('Amount too small after fee');

      const deadline = Math.floor(Date.now() / 1000) + Number(deadlineDays) * 86400;

      const [bounty] = bountyPda(creator, bountyId);
      const [vault] = vaultPda(bounty);
      const [profile] = PublicKey.findProgramAddressSync(
        [Buffer.from('profile'), creator.toBuffer()],
        AGENTGRIND_PROGRAM_ID
      );

      const creatorTokenAccount = await getAssociatedTokenAddress(mint, creator);
      
      // Check if creator has USDC token account
      try {
        await getAccount(connection, creatorTokenAccount);
      } catch (ataErr) {
        throw new Error('You need a USDC token account. Get some devnet USDC first: https://faucet.solana.com');
      }

      const treasuryTokenAccount = await getAssociatedTokenAddress(mint, treasury);

      const ix: anchor.web3.TransactionInstruction[] = [];

      // ensure treasury ATA exists (optional)
      const treasuryAtaInfo = await connection.getAccountInfo(treasuryTokenAccount);
      if (!treasuryAtaInfo) {
        ix.push(
          createAssociatedTokenAccountInstruction(
            creator,
            treasuryTokenAccount,
            treasury,
            mint
          )
        );
      }

      // fee transfer
      if (feeAtoms > 0) {
        ix.push(
          createTransferInstruction(
            creatorTokenAccount,
            treasuryTokenAccount,
            creator,
            feeAtoms
          )
        );
      }

      // program instruction (net atoms into vault)
      const programIx = await program.methods
        .createBounty(bountyId, new anchor.BN(netAtoms), new anchor.BN(deadline))
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
        .instruction();

      ix.push(programIx);

      const tx = new anchor.web3.Transaction().add(...ix);
      tx.feePayer = creator;
      const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash('confirmed');
      tx.recentBlockhash = blockhash;

      const signed = await wallet.signTransaction!(tx);
      const txSig = await connection.sendRawTransaction(signed.serialize(), { skipPreflight: false });
      await connection.confirmTransaction({ signature: txSig, blockhash, lastValidBlockHeight }, 'confirmed');

      // store off-chain metadata
      const metaRes = await fetch('/api/metadata', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          creator: creator.toBase58(),
          bounty_id: bountyId,
          title: title.trim(),
          description: description.trim(),
        }),
      }).catch(() => null);

      if (!metaRes || !metaRes.ok) {
        const detail = metaRes ? await metaRes.text().catch(() => '') : '';
        // tx succeeded, so we treat this as warning
        setError(
          'Bounty created on-chain, but metadata save failed. (Vercel Postgres not configured?) ' +
            (detail ? `Details: ${detail}` : '')
        );
      }

      setSig(txSig);
    } catch (err: any) {
      // Provide better error messages
      let msg = err?.message || 'Failed to create bounty';
      
      if (msg.includes('User rejected')) {
        msg = 'Transaction cancelled.';
      } else if (msg.includes('Attempt to debit an account but found no record of a prior credit')) {
        msg = 'Insufficient USDC balance or token account not found.';
      } else if (msg.includes('0x1')) {
        msg = 'Insufficient funds for transaction fee (need ~0.01 SOL).';
      }
      
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
          <label className="block text-sm font-medium text-brand-text mb-1.5">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Audit my Solana program"
            required
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-brand-text mb-1.5">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe scope, requirements, and what proof of completion looks like."
            required
            rows={4}
            className="w-full bg-brand-bg border border-brand-border rounded-lg px-3 py-2.5 text-sm text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-brand-green transition-colors resize-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-brand-text mb-1.5">Budget (USDC)</label>
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
            {wallet.publicKey && (
              <p className="text-xs text-brand-textMuted mt-1.5">
                {balanceLoading ? (
                  'Loading balance…'
                ) : usdcBalance !== null ? (
                  <>
                    Balance: <span className="font-mono">{usdcBalance.toFixed(2)}</span> USDC
                    {Number(amount) > 0 && Number(amount) > usdcBalance && (
                      <span className="text-red-400 ml-2">⚠️ Insufficient balance</span>
                    )}
                  </>
                ) : (
                  'Balance: --'
                )}
              </p>
            )}
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
            Platform fee: <strong>10%</strong> (sent to treasury) · Escrow: <strong>90%</strong> (paid to agent)
          </p>
          <p className="text-xs text-brand-textMuted mt-1">
            Uses devnet USDC mint: <span className="font-mono">{USDC_MINT_DEVNET.toBase58()}</span>
          </p>
        </div>

        {error && <p className="text-sm text-red-400 break-words">{error}</p>}

        {sig ? (
          <>
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

            <div className="flex gap-3">
              <a href={`/bounties/${wallet.publicKey?.toBase58()}/${bountyId}`} className="btn-primary text-sm flex-1 text-center">
                View bounty
              </a>
              <button
                type="button"
                onClick={() => {
                  setSig('');
                  setError('');
                  setTitle('');
                  setDescription('');
                  setAmount('10');
                  setDeadlineDays('3');
                }}
                className="btn-outline text-sm flex-1"
              >
                Create another
              </button>
            </div>
          </>
        ) : (
          <button type="submit" disabled={submitting || !wallet.publicKey} className="btn-primary text-sm">
            {submitting ? 'Creating…' : wallet.publicKey ? 'Create Bounty' : 'Connect Wallet'}
          </button>
        )}
      </form>
    </div>
  );
}
