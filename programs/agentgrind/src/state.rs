use anchor_lang::prelude::*;

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
}

impl Bounty {
    /// Calculate space needed for Bounty account
    /// 8 (discriminator) + 32 (creator) + 32 (mint) + 8 (amount) + 8 (deadline)
    /// + 1 (status) + 1 + 32 (option<claimer>) + 4 + 256 (proof_uri)
    /// + 4 + 64 (bounty_id) + 1 (bump)
    pub const MAX_SIZE: usize = 8 + 32 + 32 + 8 + 8 + 1 + 33 + 260 + 68 + 1;
}

/// Validation constants
pub const MAX_PROOF_URI_LEN: usize = 256;
pub const MAX_BOUNTY_ID_LEN: usize = 64;

/// USDC mint address (mainnet)
pub const USDC_MINT_MAINNET: &str = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
/// USDC mint address (devnet)
pub const USDC_MINT_DEVNET: &str = "Gh9ZwEmdLJ8DscKNTkTqPbNwLNNBjuSzaG9Vp2KGtKJr";
