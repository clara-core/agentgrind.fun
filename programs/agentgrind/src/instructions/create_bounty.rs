use anchor_lang::prelude::*;
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
#[instruction(bounty_id: String)]
pub struct CreateBounty<'info> {
    #[account(
        init,
        payer = creator,
        space = Bounty::MAX_SIZE,
        seeds = [b"bounty", creator.key().as_ref(), bounty_id.as_bytes()],
        bump
    )]
    pub bounty: Account<'info, Bounty>,

    #[account(
        init,
        payer = creator,
        token::mint = mint,
        token::authority = bounty,
        seeds = [b"vault", bounty.key().as_ref()],
        bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// CreatorProfile — init_if_needed so first-time creators get a profile automatically
    #[account(
        init_if_needed,
        payer = creator,
        space = CreatorProfile::MAX_SIZE,
        seeds = [b"profile", creator.key().as_ref()],
        bump
    )]
    pub profile: Account<'info, CreatorProfile>,

    pub mint: Account<'info, token::Mint>,

    #[account(
        mut,
        constraint = creator_token_account.mint == mint.key(),
        constraint = creator_token_account.owner == creator.key()
    )]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(
    ctx: Context<CreateBounty>,
    bounty_id: String,
    amount: u64,
    deadline: i64,
) -> Result<()> {
    // Validate inputs
    require!(amount > 0, AgentGrindError::InvalidAmount);
    require!(
        deadline > Clock::get()?.unix_timestamp,
        AgentGrindError::InvalidDeadline
    );
    require!(
        bounty_id.len() <= MAX_BOUNTY_ID_LEN,
        AgentGrindError::BountyIdTooLong
    );

    // ── Initialize profile if brand new ──
    let profile = &mut ctx.accounts.profile;
    if profile.wallet == Pubkey::default() {
        profile.wallet = ctx.accounts.creator.key();
        profile.reputation = REP_INITIAL;
        profile.total_created = 0;
        profile.total_completed = 0;
        profile.total_rejected = 0;
        profile.total_auto_finalized = 0;
        profile.total_cancelled = 0;
        profile.x_handle = String::new();
        profile.x_verified = false;
        profile.bump = ctx.bumps.profile;
    }

    // ── Reputation checks ──
    require!(profile.can_create(), AgentGrindError::ReputationTooLow);
    require!(
        amount <= profile.max_bounty_amount(),
        AgentGrindError::AmountExceedsRepLimit
    );

    // ── Initialize bounty account ──
    let bounty = &mut ctx.accounts.bounty;
    bounty.creator = ctx.accounts.creator.key();
    bounty.mint = ctx.accounts.mint.key();
    bounty.amount = amount;
    bounty.deadline = deadline;
    bounty.status = BountyStatus::Open;
    bounty.claimer = None;
    bounty.proof_uri = String::new();
    bounty.proof_submitted_at = 0;
    bounty.rejection_reason = String::new();
    bounty.bounty_id = bounty_id;
    bounty.bump = ctx.bumps.bounty;

    // ── Transfer USDC from creator to vault ──
    let cpi_accounts = Transfer {
        from: ctx.accounts.creator_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, amount)?;

    // ── Update profile stats ──
    profile.total_created += 1;

    msg!(
        "Bounty created: {} USDC, deadline: {}, rep: {}",
        amount,
        deadline,
        profile.reputation
    );

    Ok(())
}
