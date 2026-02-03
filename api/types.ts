/**
 * AgentGrind API Types
 */

export enum BountyStatus {
  OPEN = 'open',
  CLAIMED = 'claimed',
  SUBMITTED = 'submitted',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export interface Bounty {
  id: string;                    // On-chain PDA address
  creator: string;               // Wallet pubkey
  title: string;
  description: string;
  amount: number;                // USDC amount (UI, not atoms)
  deadline: number;              // Unix timestamp (seconds)
  status: BountyStatus;
  claimer?: string;              // Wallet pubkey of agent who claimed
  proofUri?: string;             // IPFS / Arweave / URL
  proofSubmittedAt?: number;     // Unix timestamp
  createdAt: number;             // Unix timestamp
  completedAt?: number;          // Unix timestamp
}

export interface CreateBountyRequest {
  title: string;
  description: string;
  amount: number;                // USDC (UI amount)
  deadline: number;              // Unix timestamp
}

export interface ClaimBountyRequest {
  bountyId: string;
}

export interface SubmitProofRequest {
  bountyId: string;
  proofUri: string;
}

export interface ApproveBountyRequest {
  bountyId: string;
}

export interface CancelBountyRequest {
  bountyId: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}
