use anchor_lang::prelude::*;

use crate::errors::AgentGrindError;
use crate::state::*;

/// Links an X (Twitter) handle to a CreatorProfile.
/// The actual X verification (OAuth / signature check) happens off-chain in the API.
/// The API calls this instruction only AFTER verifying the handle is real.
/// `authority` here is the wallet that owns the profile (must sign).
#[derive(Accounts)]
pub struct LinkX<'info> {
    #[account(
        mut,
        seeds = [b"profile", authority.key().as_ref()],
        bump,
        constraint = !profile.x_verified @ AgentGrindError::XAlreadyVerified
    )]
    pub profile: Account<'info, CreatorProfile>,

    pub authority: Signer<'info>,
}

pub fn handler(ctx: Context<LinkX>, x_handle: String) -> Result<()> {
    require!(
        x_handle.len() <= MAX_X_HANDLE_LEN,
        AgentGrindError::XHandleTooLong
    );
    require!(!x_handle.is_empty(), AgentGrindError::XHandleTooLong);

    let profile = &mut ctx.accounts.profile;
    profile.x_handle = x_handle.clone();
    profile.x_verified = true;

    msg!("X handle linked: @{}", x_handle);

    Ok(())
}
