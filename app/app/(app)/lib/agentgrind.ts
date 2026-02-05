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

function readU32LE(dv: DataView, o: number) {
  return dv.getUint32(o, true);
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

export function decodeCreatorProfile(data: Uint8Array): CreatorProfile {
  // Anchor discriminator = first 8 bytes
  const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
  let o = 8;

  const wallet = new PublicKey(data.slice(o, o + 32)).toBase58();
  o += 32;

  const reputation = readI64LE(dv, o);
  o += 8;

  const total_created = readU32LE(dv, o); o += 4;
  const total_completed = readU32LE(dv, o); o += 4;
  const total_rejected = readU32LE(dv, o); o += 4;
  const total_auto_finalized = readU32LE(dv, o); o += 4;
  const total_cancelled = readU32LE(dv, o); o += 4;

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
