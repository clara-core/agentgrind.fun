use anchor_lang::prelude::*;

pub mod state;
pub mod instructions;
pub mod errors;

use instructions::*;

declare_id!("8tCF5KGdXXNtsA1FGfoJ7VJ7Mn7YCA5UEEPoRuTu9y8i");

#[program]
pub mod agentgrind {
    use super::*;

    pub fn create_bounty(
        ctx: Context<CreateBounty>,
        bounty_id: String,
        amount: u64,
        deadline: i64,
    ) -> Result<()> {
        instructions::create_bounty::handler(ctx, bounty_id, amount, deadline)
    }

    pub fn claim_bounty(ctx: Context<ClaimBounty>) -> Result<()> {
        instructions::claim_bounty::handler(ctx)
    }

    pub fn submit_proof(ctx: Context<SubmitProof>, proof_uri: String) -> Result<()> {
        instructions::submit_proof::handler(ctx, proof_uri)
    }

    pub fn approve_and_pay(ctx: Context<ApproveAndPay>) -> Result<()> {
        instructions::approve_and_pay::handler(ctx)
    }

    pub fn cancel_bounty(ctx: Context<CancelBounty>) -> Result<()> {
        instructions::cancel_bounty::handler(ctx)
    }
}
