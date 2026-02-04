use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
pub struct CancelBounty<'info> {
    #[account(
        mut,
        constraint = bounty.status == BountyStatus::Open @ AgentGrindError::BountyNotOpen,
        constraint = bounty.creator == creator.key() @ AgentGrindError::UnauthorizedCreator,
        constraint = bounty.deadline < Clock::get()?.unix_timestamp @ AgentGrindError::DeadlineNotPassed,
        seeds = [b"bounty", creator.key().as_ref(), bounty.bounty_id.as_bytes()],
        bump = bounty.bump
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        mut,
        seeds = [b"vault", bounty.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"profile", creator.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, CreatorProfile>,

    #[account(
        mut,
        constraint = creator_token_account.mint == bounty.mint,
        constraint = creator_token_account.owner == creator.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<CancelBounty>) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;

    // ── PDA signer seeds ──
    let bounty_id = bounty.bounty_id.clone();
    let seeds = &[
        b"bounty".as_ref(),
        ctx.accounts.creator.key.as_ref(),
        bounty_id.as_bytes(),
        &[bounty.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // ── Refund vault → creator ──
    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.creator_token_account.to_account_info(),
        authority: bounty.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, bounty.amount)?;

    // ── Close vault (rent back to creator) ──
    let close_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: bounty.to_account_info(),
    };
    let close_program = ctx.accounts.token_program.to_account_info();
    let close_ctx = CpiContext::new_with_signer(close_program, close_accounts, signer_seeds);
    token::close_account(close_ctx)?;

    // ── Update bounty ──
    bounty.status = BountyStatus::Cancelled;

    // ── Reputation: 0 (cancel is neutral, no penalty) ──
    let profile = &mut ctx.accounts.profile;
    profile.total_cancelled += 1;

    msg!(
        "Bounty cancelled and refunded: {} USDC. Rep unchanged: {}",
        bounty.amount,
        profile.reputation
    );

    Ok(())
}
