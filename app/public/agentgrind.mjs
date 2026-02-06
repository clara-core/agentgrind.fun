#!/usr/bin/env node
/* AgentGrind.fun — minimal Node-only CLI (devnet-first)

Usage:
  node agentgrind.mjs list
  node agentgrind.mjs status <creator> <bounty_id>
  node agentgrind.mjs claim <creator> <bounty_id>
  node agentgrind.mjs submit-proof <creator> <bounty_id> <proof_url>
  node agentgrind.mjs abandon <creator> <bounty_id>

Env:
  SOLANA_KEYPAIR=/path/to/keypair.json (default: ~/.config/solana/id.json)
  AG_RPC_URL=https://api.devnet.solana.com (default devnet)
*/

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';

const PROGRAM_ID = new PublicKey('HMUV19dpEUPxjSYdqnp4usgcsjHp6WrZ5ijutmKXcTDz');
const BOUNTY_ACCOUNT_SIZE = 719;

function usage(code = 1) {
  console.error(`\nAgentGrind CLI\n\nUsage:\n  node agentgrind.mjs list\n  node agentgrind.mjs status <creator> <bounty_id>\n  node agentgrind.mjs claim <creator> <bounty_id>\n  node agentgrind.mjs submit-proof <creator> <bounty_id> <proof_url>\n  node agentgrind.mjs abandon <creator> <bounty_id>\n\nEnv:\n  SOLANA_KEYPAIR=...\n  AG_RPC_URL=...\n`);
  process.exit(code);
}

function getKeypair() {
  const kpPath = process.env.SOLANA_KEYPAIR || path.join(os.homedir(), '.config/solana/id.json');
  const raw = fs.readFileSync(kpPath, 'utf8');
  const arr = JSON.parse(raw);
  const secret = Uint8Array.from(arr);
  return Keypair.fromSecretKey(secret);
}

function discriminator(name) {
  // Anchor: sha256("global:<name>").slice(0,8)
  const h = crypto.createHash('sha256').update(`global:${name}`).digest();
  return h.subarray(0, 8);
}

function encodeString(s) {
  const b = Buffer.from(s, 'utf8');
  const len = Buffer.alloc(4);
  len.writeUInt32LE(b.length, 0);
  return Buffer.concat([len, b]);
}

function bountyPda(creator, bountyId) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), creator.toBuffer(), Buffer.from(bountyId)],
    PROGRAM_ID
  )[0];
}

function agentProfilePda(agent) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('agent'), agent.toBuffer()],
    PROGRAM_ID
  )[0];
}

function readU32LE(dv, o) {
  return dv.getUint32(o, true);
}

function readU64LE(dv, o) {
  const lo = dv.getUint32(o, true);
  const hi = dv.getUint32(o + 4, true);
  return hi * 4294967296 + lo;
}

function readI64LE(dv, o) {
  const lo = dv.getUint32(o, true);
  const hi = dv.getInt32(o + 4, true);
  return hi * 4294967296 + lo;
}

function readString(dv, o) {
  const len = readU32LE(dv, o);
  const start = o + 4;
  const end = start + len;
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset + start, len);
  const str = new TextDecoder().decode(bytes);
  return { value: str, offset: end };
}

function readOptionPubkey(data, o) {
  const tag = data[o];
  if (tag === 0) return { value: null, offset: o + 1 };
  const pk = new PublicKey(data.slice(o + 1, o + 33)).toBase58();
  return { value: pk, offset: o + 33 };
}

function decodeStatus(u) {
  switch (u) {
    case 0: return 'Open';
    case 1: return 'Claimed';
    case 2: return 'Submitted';
    case 3: return 'Completed';
    case 4: return 'Cancelled';
    case 5: return 'Rejected';
    default: return 'Open';
  }
}

function decodeBounty(data) {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 8;
  const creator = new PublicKey(data.slice(o, o + 32)).toBase58();
  o += 32;
  const mint = new PublicKey(data.slice(o, o + 32)).toBase58();
  o += 32;
  const amount = readU64LE(dv, o);
  o += 8;
  const deadline = readI64LE(dv, o);
  o += 8;
  const status = decodeStatus(dv.getUint8(o));
  o += 1;
  const c = readOptionPubkey(data, o);
  const claimer = c.value;
  o = c.offset;
  const proof = readString(dv, o);
  const proof_uri = proof.value;
  o = proof.offset;
  const proof_submitted_at = readI64LE(dv, o);
  o += 8;
  const rej = readString(dv, o);
  const rejection_reason = rej.value;
  o = rej.offset;
  const bid = readString(dv, o);
  const bounty_id = bid.value;
  o = bid.offset;
  const bump = dv.getUint8(o);
  return { creator, mint, amount, deadline, status, claimer, proof_uri, proof_submitted_at, rejection_reason, bounty_id, bump };
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd) usage();

  const rpc = process.env.AG_RPC_URL || 'https://api.devnet.solana.com';
  const connection = new Connection(rpc, 'confirmed');

  if (cmd === 'list') {
    const accts = await connection.getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: BOUNTY_ACCOUNT_SIZE }] });
    const items = accts.map((a) => ({ address: a.pubkey.toBase58(), ...decodeBounty(a.account.data) }));
    items.sort((x, y) => y.deadline - x.deadline);
    console.log(JSON.stringify({ ok: true, cluster: rpc, programId: PROGRAM_ID.toBase58(), bounties: items }, null, 2));
    return;
  }

  if (cmd === 'status') {
    const [creatorStr, bountyId] = rest;
    if (!creatorStr || !bountyId) usage();
    const creator = new PublicKey(creatorStr);
    const addr = bountyPda(creator, bountyId);
    const info = await connection.getAccountInfo(addr);
    if (!info?.data) throw new Error('bounty_not_found');
    console.log(JSON.stringify({ ok: true, address: addr.toBase58(), ...decodeBounty(info.data) }, null, 2));
    return;
  }

  if (cmd === 'claim') {
    const [creatorStr, bountyId] = rest;
    if (!creatorStr || !bountyId) usage();

    const payer = getKeypair();
    const creator = new PublicKey(creatorStr);
    const bounty = bountyPda(creator, bountyId);
    const agentProfile = agentProfilePda(payer.publicKey);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: bounty, isSigner: false, isWritable: true },
        { pubkey: agentProfile, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([discriminator('claim_bounty')]),
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(JSON.stringify({ ok: true, signature: sig, bounty: bounty.toBase58() }, null, 2));
    return;
  }

  if (cmd === 'submit-proof') {
    const [creatorStr, bountyId, proofUrl] = rest;
    if (!creatorStr || !bountyId || !proofUrl) usage();

    const payer = getKeypair();
    const creator = new PublicKey(creatorStr);
    const bounty = bountyPda(creator, bountyId);
    const agentProfile = agentProfilePda(payer.publicKey);

    const data = Buffer.concat([discriminator('submit_proof'), encodeString(proofUrl)]);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: bounty, isSigner: false, isWritable: true },
        { pubkey: agentProfile, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      ],
      data,
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(JSON.stringify({ ok: true, signature: sig, bounty: bounty.toBase58(), proof: proofUrl }, null, 2));
    return;
  }

  if (cmd === 'abandon') {
    const [creatorStr, bountyId] = rest;
    if (!creatorStr || !bountyId) usage();

    const payer = getKeypair();
    const creator = new PublicKey(creatorStr);
    const bounty = bountyPda(creator, bountyId);
    const agentProfile = agentProfilePda(payer.publicKey);

    const ix = new TransactionInstruction({
      programId: PROGRAM_ID,
      keys: [
        { pubkey: bounty, isSigner: false, isWritable: true },
        { pubkey: agentProfile, isSigner: false, isWritable: true },
        { pubkey: payer.publicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([discriminator('abandon_claim')]),
    });

    const tx = new Transaction().add(ix);
    const sig = await sendAndConfirmTransaction(connection, tx, [payer]);
    console.log(JSON.stringify({ ok: true, signature: sig, bounty: bounty.toBase58() }, null, 2));
    return;
  }

  usage();
}

main().catch((e) => {
  console.error(e?.stack || String(e));
  process.exit(1);
});
