use anchor_lang::prelude::*;

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
pub struct RejectBounty<'info> {
    #[account(
        mut,
        constraint = bounty.status == BountyStatus::Submitted @ AgentGrindError::BountyNotSubmitted,
        constraint = bounty.creator == creator.key() @ AgentGrindError::UnauthorizedCreator,
        seeds = [b"bounty", creator.key().as_ref(), bounty.bounty_id.as_bytes()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        seeds = [b"profile", creator.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, CreatorProfile>,

    pub creator: Signer<'info>,
}

pub fn handler(ctx: Context<RejectBounty>, reason: String) -> Result<()> {
    require!(
        reason.len() <= MAX_REJECTION_REASON_LEN,
        AgentGrindError::RejectionReasonTooLong
    );

    let bounty = &mut ctx.accounts.bounty;

    // Reopens the bounty so another agent can claim
    bounty.status = BountyStatus::Open;
    bounty.rejection_reason = reason.clone();
    bounty.claimer = None;
    bounty.proof_uri = String::new();
    bounty.proof_submitted_at = 0;

    // ── Reputation: -15 ──
    let profile = &mut ctx.accounts.profile;
    profile.apply_rep(REP_REJECT);
    profile.total_rejected += 1;

    msg!(
        "Bounty rejected. Reason: {}. Rep now: {}",
        reason,
        profile.reputation
    );

    Ok(())
}
