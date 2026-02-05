use anchor_lang::prelude::*;

use crate::state::*;

/// Initialize a CreatorProfile without creating a bounty.
/// This is purely UX: lets users link X and view reputation immediately.
#[derive(Accounts)]
pub struct InitProfile<'info> {
    #[account(
        init,
        payer = authority,
        space = CreatorProfile::MAX_SIZE,
        seeds = [b"profile", authority.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, CreatorProfile>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<InitProfile>) -> Result<()> {
    let profile = &mut ctx.accounts.profile;
    profile.wallet = ctx.accounts.authority.key();
    profile.reputation = REP_INITIAL;
    profile.total_created = 0;
    profile.total_completed = 0;
    profile.total_rejected = 0;
    profile.total_auto_finalized = 0;
    profile.total_cancelled = 0;
    profile.x_handle = String::new();
    profile.x_verified = false;
    profile.bump = ctx.bumps.profile;

    msg!("CreatorProfile initialized for {}", profile.wallet);
    Ok(())
}
