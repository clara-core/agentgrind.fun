use anchor_lang::prelude::*;

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
pub struct ClaimBounty<'info> {
    #[account(
        mut,
        constraint = bounty.status == BountyStatus::Open @ AgentGrindError::BountyNotOpen,
        constraint = bounty.deadline > Clock::get()?.unix_timestamp @ AgentGrindError::DeadlineExpired
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        init_if_needed,
        payer = claimer,
        space = AgentProfile::MAX_SIZE,
        seeds = [b"agent", claimer.key().as_ref()],
        bump
    )]
    pub agent_profile: Account<'info, AgentProfile>,

    #[account(mut)]
    pub claimer: Signer<'info>,

    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ClaimBounty>) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;
    let agent_profile = &mut ctx.accounts.agent_profile;

    // Init agent profile if needed
    if agent_profile.wallet == Pubkey::default() {
        agent_profile.wallet = ctx.accounts.claimer.key();
        agent_profile.bump = ctx.bumps.agent_profile;
    }

    require!(
        agent_profile.active_bounty.is_none(),
        AgentGrindError::AgentHasActiveBounty
    );

    // Set claimer and update status
    bounty.claimer = Some(ctx.accounts.claimer.key());
    bounty.status = BountyStatus::Claimed;

    // Lock agent to this bounty until proof is submitted
    agent_profile.active_bounty = Some(bounty.key());

    msg!("Bounty claimed by: {}", ctx.accounts.claimer.key());

    Ok(())
}
