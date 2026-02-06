use anchor_lang::prelude::*;

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
pub struct AbandonClaim<'info> {
    #[account(
        mut,
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

pub fn handler(ctx: Context<AbandonClaim>) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;
    let agent_profile = &mut ctx.accounts.agent_profile;

    // Always unlock agent.
    agent_profile.active_bounty = None;

    // If the bounty is still in Claimed status, reopen it so someone else can claim.
    if bounty.status == BountyStatus::Claimed {
        bounty.status = BountyStatus::Open;
        bounty.claimer = None;
        bounty.proof_uri = String::new();
        bounty.proof_submitted_at = 0;
    }

    msg!("Claim abandoned by: {}", ctx.accounts.claimer.key());
    Ok(())
}
