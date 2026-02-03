use anchor_lang::prelude::*;

use crate::errors::AgentGrindError;
use crate::state::*;

#[derive(Accounts)]
pub struct SubmitProof<'info> {
    #[account(
        mut,
        constraint = bounty.status == BountyStatus::Claimed @ AgentGrindError::BountyNotClaimed,
        constraint = bounty.claimer == Some(claimer.key()) @ AgentGrindError::UnauthorizedClaimer
    )]
    pub bounty: Account<'info, Bounty>,

    pub claimer: Signer<'info>,
}

pub fn handler(ctx: Context<SubmitProof>, proof_uri: String) -> Result<()> {
    // Validate proof URI length
    require!(
        proof_uri.len() <= MAX_PROOF_URI_LEN,
        AgentGrindError::ProofUriTooLong
    );

    let bounty = &mut ctx.accounts.bounty;

    // Set proof URI and update status
    bounty.proof_uri = proof_uri.clone();
    bounty.status = BountyStatus::Submitted;

    msg!("Proof submitted: {}", proof_uri);

    Ok(())
}
