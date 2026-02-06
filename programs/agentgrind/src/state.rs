use anchor_lang::prelude::*;

// ─── Bounty ────────────────────────────────────────────────────────────────

#[account]
#[derive(Default)]
pub struct Bounty {
    /// Creator of the bounty
    pub creator: Pubkey,
    /// USDC mint
    pub mint: Pubkey,
    /// Bounty amount in USDC atoms
    pub amount: u64,
    /// Deadline timestamp (Unix seconds)
    pub deadline: i64,
    /// Current bounty status
    pub status: BountyStatus,
    /// Agent who claimed this bounty
    pub claimer: Option<Pubkey>,
    /// Proof URI (IPFS/Arweave/URL)
    pub proof_uri: String,
    /// Timestamp when proof was submitted (for review window)
    pub proof_submitted_at: i64,
    /// Rejection reason (set by creator on reject)
    pub rejection_reason: String,
    /// Bounty ID (for PDA derivation)
    pub bounty_id: String,
    /// PDA bump seed
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Default)]
pub enum BountyStatus {
    #[default]
    Open,
    Claimed,
    Submitted,
    Completed,
    Cancelled,
    Rejected,
}

impl Bounty {
    /// 8 (disc) + 32 (creator) + 32 (mint) + 8 (amount) + 8 (deadline)
    /// + 1 (status) + 33 (option<claimer>) + 260 (proof_uri) + 8 (proof_submitted_at)
    /// + 260 (rejection_reason) + 68 (bounty_id) + 1 (bump)
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 33 + 260 + 8 + 260 + 68 + 1;
}

// ─── AgentProfile ─────────────────────────────────────────────────────────

#[account]
#[derive(Default)]
pub struct AgentProfile {
    /// Wallet pubkey
    pub wallet: Pubkey,
    /// If set, the agent has an active claimed bounty and must submit proof before claiming another
    pub active_bounty: Option<Pubkey>,
    /// PDA bump
    pub bump: u8,
}

impl AgentProfile {
    /// 8 (disc) + 32 (wallet) + 33 (option<pubkey>) + 1 (bump)
    pub const MAX_SIZE: usize = 8 + 32 + 33 + 1;
}

// ─── CreatorProfile ────────────────────────────────────────────────────────

#[account]
pub struct CreatorProfile {
    /// Wallet pubkey
    pub wallet: Pubkey,
    /// Reputation score (starts at INITIAL_REP, floor 0, cap 1000)
    pub reputation: i64,
    /// Total bounties created
    pub total_created: u32,
    /// Total bounties completed (agent paid)
    pub total_completed: u32,
    /// Total bounties rejected by this creator
    pub total_rejected: u32,
    /// Total bounties auto-finalized (creator ghosted)
    pub total_auto_finalized: u32,
    /// Total bounties cancelled
    pub total_cancelled: u32,
    /// Linked X (Twitter) handle (set via API + on-chain confirmation)
    pub x_handle: String,
    /// Whether X handle has been verified
    pub x_verified: bool,
    /// PDA bump
    pub bump: u8,
}

impl CreatorProfile {
    /// 8 (disc) + 32 (wallet) + 8 (reputation) + 4*5 (counters)
    /// + 4 + 64 (x_handle) + 1 (x_verified) + 1 (bump)
    pub const MAX_SIZE: usize = 8 + 32 + 8 + 20 + 68 + 1 + 1;

    /// Apply a reputation delta, clamped to [0, REP_CAP]
    pub fn apply_rep(&mut self, delta: i64) {
        self.reputation = (self.reputation + delta).max(REP_FLOOR).min(REP_CAP);
    }

    /// Max bounty amount (USDC atoms) based on reputation + verification tier
    pub fn max_bounty_amount(&self) -> u64 {
        if !self.x_verified {
            // Unverified: hard cap $10 USDC
            return 10 * 1_000_000;
        }
        if self.reputation < REP_TIER_BLOCKED {
            0 // blocked
        } else if self.reputation < REP_TIER_LIMITED {
            25 * 1_000_000 // $25 USDC
        } else {
            u64::MAX // no limit
        }
    }

    /// Whether this creator is allowed to post bounties
    pub fn can_create(&self) -> bool {
        if self.x_verified {
            self.reputation >= REP_TIER_BLOCKED
        } else {
            // Unverified allowed but capped
            true
        }
    }
}

// ─── Constants ─────────────────────────────────────────────────────────────

/// Reputation scoring
pub const REP_INITIAL: i64 = 100;
pub const REP_FLOOR: i64 = 0;
pub const REP_CAP: i64 = 1000;
pub const REP_COMPLETE: i64 = 15;   // +15 on successful completion
pub const REP_REJECT: i64 = -15;    // -15 on rejection
pub const REP_GHOST: i64 = -30;     // -30 on auto-finalize (ghost)
// cancel = 0 (neutral)

/// Reputation enforcement tiers
pub const REP_TIER_BLOCKED: i64 = 30;   // below this: can't create
pub const REP_TIER_LIMITED: i64 = 60;   // below this: max $25/bounty

/// Review window: 48 hours after proof submission before auto-finalize is available
pub const REVIEW_WINDOW_SECS: i64 = 48 * 60 * 60;

/// Validation constants
pub const MAX_PROOF_URI_LEN: usize = 256;
pub const MAX_BOUNTY_ID_LEN: usize = 64;
pub const MAX_REJECTION_REASON_LEN: usize = 256;
pub const MAX_X_HANDLE_LEN: usize = 64;

/// USDC mint address (mainnet)
pub const USDC_MINT_MAINNET: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
/// USDC mint address (devnet)
pub const USDC_MINT_DEVNET: &str = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
