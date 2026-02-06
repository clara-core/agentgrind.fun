use anchor_lang::prelude::*;

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(
        mut,
        constraint = bounty.status == BountyStatus::Claimed @ AgentGrindError::BountyNotClaimed,
        constraint = bounty.claimer == Some(claimer.key()) @ AgentGrindError::UnauthorizedClaimer
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        seeds = [b"agent", claimer.key().as_ref()],
        bump = agent_profile.bump,
        constraint = agent_profile.active_bounty == Some(bounty.key()) @ AgentGrindError::UnauthorizedClaimer
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    pub claimer: Signer<'info>,
}

pub fn handler(ctx: Context<SubmitProof>, proof_uri: String) -> Result<()> {
    require!(
        proof_uri.len() <= MAX_PROOF_URI_LEN,
        AgentGrindError::ProofUriTooLong
    );

    let bounty = &mut ctx.accounts.bounty;
    let agent_profile = &mut ctx.accounts.agent_profile;

    bounty.proof_uri = proof_uri.clone();
    bounty.proof_submitted_at = Clock::get()?.unix_timestamp;
    bounty.status = BountyStatus::Submitted;

    // Unlock agent so they can claim another bounty
    agent_profile.active_bounty = None;

    msg!("Proof submitted: {} at {}", proof_uri, bounty.proof_submitted_at);

    Ok(())
}
