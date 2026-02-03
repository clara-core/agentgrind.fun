use anchor_lang::prelude::*;

#[error_code]
pub enum AgentGrindError {
    #[msg("Amount must be greater than zero")]
    InvalidAmount,
    
    #[msg("Deadline must be in the future")]
    InvalidDeadline,
    
    #[msg("Bounty has already been claimed")]
    BountyAlreadyClaimed,
    
    #[msg("Bounty is not in Open status")]
    BountyNotOpen,
    
    #[msg("Bounty is not in Claimed status")]
    BountyNotClaimed,
    
    #[msg("Bounty is not in Submitted status")]
    BountyNotSubmitted,
    
    #[msg("Only the claimer can submit proof")]
    UnauthorizedClaimer,
    
    #[msg("Only the creator can approve or cancel")]
    UnauthorizedCreator,
    
    #[msg("Bounty deadline has not passed")]
    DeadlineNotPassed,
    
    #[msg("Bounty deadline has passed")]
    DeadlineExpired,
    
    #[msg("Proof URI exceeds maximum length")]
    ProofUriTooLong,
    
    #[msg("Bounty ID exceeds maximum length")]
    BountyIdTooLong,
    
    #[msg("Invalid mint address")]
    InvalidMint,
}
