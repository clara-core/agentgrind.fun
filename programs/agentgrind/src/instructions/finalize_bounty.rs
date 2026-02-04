use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};

use crate::errors::AgentGrindError;
use crate::state::*;

/// Anyone can call this to auto-pay the agent after the 48h review window
/// has elapsed on a Submitted bounty (creator ghosted).
#[derive(Accounts)]
pub struct FinalizeBounty<'info> {
    #[account(
        mut,
        constraint = bounty.status == BountyStatus::Submitted @ AgentGrindError::BountyNotSubmitted,
        constraint = Clock::get()?.unix_timestamp > bounty.proof_submitted_at + REVIEW_WINDOW_SECS
            @ AgentGrindError::ReviewWindowActive
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        seeds = [b"vault", bounty.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Creator's profile — penalised for ghosting
    #[account(
        mut,
        seeds = [b"profile", bounty.creator.as_ref()],
        bump
    )]
    pub creator_profile: Account<'info, CreatorProfile>,

    /// Rent recipient (the caller pays nothing, gets nothing — just triggers finalize)
    #[account(mut)]
    pub caller: Signer<'info>,

    #[account(
        mut,
        constraint = claimer_token_account.mint == bounty.mint,
        constraint = claimer_token_account.owner == bounty.claimer.unwrap()
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<FinalizeBounty>) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;

    // ── PDA signer for bounty (needed to sign vault transfer) ──
    // Bounty PDA seeds: ["bounty", creator, bounty_id]
    let bounty_id = bounty.bounty_id.clone();
    let seeds = &[
        b"bounty".as_ref(),
        bounty.creator.as_ref(),
        bounty_id.as_bytes(),
        &[bounty.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // ── Transfer vault → claimer ──
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.claimer_token_account.to_account_info(),
        authority: bounty.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, bounty.amount)?;

    // ── Close vault (rent back to caller who triggered finalize) ──
    let close_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.caller.to_account_info(),
        authority: bounty.to_account_info(),
    };
    let close_program = ctx.accounts.token_program.to_account_info();
    let close_ctx = CpiContext::new_with_signer(close_program, close_accounts, signer_seeds);
    token::close_account(close_ctx)?;

    // ── Update bounty ──
    bounty.status = BountyStatus::Completed;

    // ── Reputation: -30 (ghost penalty) ──
    let profile = &mut ctx.accounts.creator_profile;
    profile.apply_rep(REP_GHOST);
    profile.total_auto_finalized += 1;

    msg!(
        "Bounty auto-finalized (creator ghosted). {} USDC paid to {}. Creator rep now: {}",
        bounty.amount,
        bounty.claimer.unwrap(),
        profile.reputation
    );

    Ok(())
}
