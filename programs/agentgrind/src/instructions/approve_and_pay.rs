use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer, CloseAccount};

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
pub struct ApproveAndPay<'info> {
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
        seeds = [b"vault", bounty.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = claimer_token_account.mint == bounty.mint,
        constraint = claimer_token_account.owner == bounty.claimer.unwrap()
    )]
    pub claimer_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ApproveAndPay>) -> Result<()> {
    let bounty = &mut ctx.accounts.bounty;

    // Transfer funds from vault to claimer
    let bounty_id = bounty.bounty_id.clone();
    let seeds = &[
        b"bounty",
        ctx.accounts.creator.key.as_ref(),
        bounty_id.as_bytes(),
        &[bounty.bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.claimer_token_account.to_account_info(),
        authority: bounty.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, bounty.amount)?;

    // Close vault account (reclaim rent to creator)
    let close_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: bounty.to_account_info(),
    };
    let close_program = ctx.accounts.token_program.to_account_info();
    let close_ctx = CpiContext::new_with_signer(close_program, close_accounts, signer_seeds);
    token::close_account(close_ctx)?;

    // Update bounty status
    bounty.status = BountyStatus::Completed;

    msg!(
        "Bounty approved and paid: {} USDC to {}",
        bounty.amount,
        bounty.claimer.unwrap()
    );

    Ok(())
}
