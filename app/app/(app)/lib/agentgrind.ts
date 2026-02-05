import { PublicKey } from '@solana/web3.js';

// Devnet program id (same as declare_id)
export const AGENTGRIND_PROGRAM_ID = new PublicKey(
  'HMUV19dpEUPxjSYdqnp4usgcsjHp6WrZ5ijutmKXcTDz'
);

export function creatorProfilePda(wallet: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('profile'), wallet.toBuffer()],
    AGENTGRIND_PROGRAM_ID
  );
}

export function bountyPda(creator: PublicKey, bountyId: string) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bounty'), creator.toBuffer(), Buffer.from(bountyId)],
    AGENTGRIND_PROGRAM_ID
  );
}

export function vaultPda(bounty: PublicKey) {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), bounty.toBuffer()],
    AGENTGRIND_PROGRAM_ID
  );
}

export const BOUNTY_ACCOUNT_SIZE = 719;

type CreatorProfile = {
  wallet: string;
  reputation: number;
  total_created: number;
  total_completed: number;
  total_rejected: number;
  total_auto_finalized: number;
  total_cancelled: number;
  x_handle: string;
  x_verified: boolean;
  bump: number;
};

export type BountyStatus =
  | 'Open'
  | 'Claimed'
  | 'Submitted'
  | 'Completed'
  | 'Cancelled'
  | 'Rejected';

export type Bounty = {
  creator: string;
  mint: string;
  amount: number;
  deadline: number;
  status: BountyStatus;
  claimer: string | null;
  proof_uri: string;
  proof_submitted_at: number;
  rejection_reason: string;
  bounty_id: string;
  bump: number;
};

function readU32LE(dv: DataView, o: number) {
  return dv.getUint32(o, true);
}

function readU64LE(dv: DataView, o: number) {
  // NOTE: loses precision if > 2^53; fine for USDC amounts in our UI.
  const lo = dv.getUint32(o, true);
  const hi = dv.getUint32(o + 4, true);
  return hi * 4294967296 + lo;
}

function readI64LE(dv: DataView, o: number) {
  // Safe for our expected ranges (reputation, timestamps). Avoid BigInt (ts target ES2017).
  const lo = dv.getUint32(o, true);
  const hi = dv.getInt32(o + 4, true);
  return hi * 4294967296 + lo;
}

function readString(dv: DataView, o: number) {
  const len = readU32LE(dv, o);
  const start = o + 4;
  const end = start + len;
  const bytes = new Uint8Array(dv.buffer, dv.byteOffset + start, len);
  const str = new TextDecoder().decode(bytes);
  return { value: str, offset: end };
}

function readOptionPubkey(data: Uint8Array, o: number) {
  const tag = data[o];
  if (tag === 0) return { value: null as string | null, offset: o + 1 };
  const pk = new PublicKey(data.slice(o + 1, o + 33)).toBase58();
  return { value: pk, offset: o + 33 };
}

function decodeStatus(u: number): BountyStatus {
  // Matches Rust enum order
  switch (u) {
    case 0:
      return 'Open';
    case 1:
      return 'Claimed';
    case 2:
      return 'Submitted';
    case 3:
      return 'Completed';
    case 4:
      return 'Cancelled';
    case 5:
      return 'Rejected';
    default:
      return 'Open';
  }
}

export function decodeCreatorProfile(data: Uint8Array): CreatorProfile {
  // Anchor discriminator = first 8 bytes
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 8;

  const wallet = new PublicKey(data.slice(o, o + 32)).toBase58();
  o += 32;

  const reputation = readI64LE(dv, o);
  o += 8;

  const total_created = readU32LE(dv, o);
  o += 4;
  const total_completed = readU32LE(dv, o);
  o += 4;
  const total_rejected = readU32LE(dv, o);
  o += 4;
  const total_auto_finalized = readU32LE(dv, o);
  o += 4;
  const total_cancelled = readU32LE(dv, o);
  o += 4;

  const x = readString(dv, o);
  const x_handle = x.value;
  o = x.offset;

  const x_verified = dv.getUint8(o) === 1;
  o += 1;

  const bump = dv.getUint8(o);

  return {
    wallet,
    reputation,
    total_created,
    total_completed,
    total_rejected,
    total_auto_finalized,
    total_cancelled,
    x_handle,
    x_verified,
    bump,
  };
}

export function decodeBounty(data: Uint8Array): Bounty {
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 8; // disc

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

  return {
    creator,
    mint,
    amount,
    deadline,
    status,
    claimer,
    proof_uri,
    proof_submitted_at,
    rejection_reason,
    bounty_id,
    bump,
  };
}
