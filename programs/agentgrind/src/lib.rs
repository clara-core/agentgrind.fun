use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::*;

declare_id!("HMUV19dpEUPxjSYdqnp4usgcsjHp6WrZ5ijutmKXcTDz");

#[program]
pub mod agentgrind {
    use super::*;

    /// Create a new bounty (deposits USDC into escrow, inits CreatorProfile if needed)
    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        bounty_id: String,
        amount: u64,
        deadline: i64,
    ) -> Result<()> {
        instructions::create_bounty::handler(ctx, bounty_id, amount, deadline)
    }

    /// Initialize a CreatorProfile without creating a bounty.
    pub fn init_profile(ctx: Context<InitProfile>) -> Result<()> {
        instructions::init_profile::handler(ctx)
    }

    /// Agent claims an open bounty
    pub fn claim_bounty(ctx: Context<ClaimBounty>) -> Result<()> {
        instructions::claim_bounty::handler(ctx)
    }

    /// Agent submits proof of work
    pub fn submit_proof(ctx: Context<SubmitProof>, proof_uri: String) -> Result<()> {
        instructions::submit_proof::handler(ctx, proof_uri)
    }

    /// Creator approves submitted proof → pays agent (+15 rep)
    pub fn approve_and_pay(ctx: Context<ApproveAndPay>) -> Result<()> {
        instructions::approve_and_pay::handler(ctx)
    }

    /// Creator rejects submitted proof → reopens bounty (-15 rep)
    pub fn reject_bounty(ctx: Context<RejectBounty>, reason: String) -> Result<()> {
        instructions::reject_bounty::handler(ctx, reason)
    }

    /// Anyone can call after 48h review window → auto-pays agent (-30 rep to creator)
    pub fn finalize_bounty(ctx: Context<FinalizeBounty>) -> Result<()> {
        instructions::finalize_bounty::handler(ctx)
    }

    /// Creator cancels unclaimed bounty after deadline (refund, 0 rep change)
    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()> {
        instructions::cancel_bounty::handler(ctx)
    }

    /// Link verified X handle to CreatorProfile (called by API after OAuth verification)
    pub fn link_x(ctx: Context<LinkX>, x_handle: String) -> Result<()> {
        instructions::link_x::handler(ctx, x_handle)
    }
}
