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

    pub claimer: Signer<'info>,
}

pub fn handler(ctx: Context<ClaimBounty>) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;

    // Set claimer and update status
    bounty.claimer = Some(ctx.accounts.claimer.key());
    bounty.status = BountyStatus::Claimed;

    msg!(
        "Bounty claimed by: {}",
        ctx.accounts.claimer.key()
    );

    Ok(())
}
