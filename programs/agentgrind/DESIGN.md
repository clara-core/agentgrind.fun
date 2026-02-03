# AgentGrind Anchor Program Design

## Overview

Single Anchor program with 5 instructions for bounty lifecycle.

## Account Structure

### Bounty PDA

**Seeds:** `["bounty", creator.key(), bounty_id.as_bytes()]`

```rust
#[account]
pub struct Bounty {
    pub creator: Pubkey,           // 32
    pub mint: Pubkey,              // 32 (USDC mint)
    pub amount: u64,               // 8
    pub deadline: i64,             // 8 (Unix timestamp)
    pub status: BountyStatus,      // 1 (enum)
    pub claimer: Option<Pubkey>,   // 33 (1 + 32)
    pub proof_uri: String,         // 4 + up to 256 (flexible)
    pub bump: u8,                  // 1
}
```

**Total:** ~375 bytes (conservative estimate with String padding)

### BountyStatus Enum

```rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq)]
pub enum BountyStatus {
    Open,
    Claimed,
    Submitted,
    Completed,
    Cancelled,
}
```

### Vault Token Account

**Owner:** Bounty PDA  
**Mint:** USDC  
**Authority:** Bounty PDA (via CPI)

## Instructions

### 1. `create_bounty`

**Accounts:**
- `creator` (signer, mut) - pays rent + deposits USDC
- `bounty` (init, mut) - PDA to create
- `vault` (init, mut) - token account for escrow
- `mint` (immutable) - USDC mint
- `creator_token_account` (mut) - creator's USDC account (source)
- `token_program`
- `system_program`
- `rent`

**Logic:**
1. Validate amount > 0, deadline > now
2. Initialize Bounty PDA with status = Open
3. Initialize vault token account owned by PDA
4. Transfer `amount` USDC from creator to vault (CPI to token program)

**Security:**
- Verify mint is USDC (hardcoded constant)
- Use anchor constraints to enforce creator is signer
- Ensure deadline is in future

### 2. `claim_bounty`

**Accounts:**
- `claimer` (signer, mut)
- `bounty` (mut)

**Logic:**
1. Validate bounty.status == Open
2. Validate now < bounty.deadline
3. Set bounty.claimer = claimer.key()
4. Set bounty.status = Claimed

**Security:**
- Only Open bounties can be claimed
- Cannot claim expired bounties

### 3. `submit_proof`

**Accounts:**
- `claimer` (signer)
- `bounty` (mut)

**Args:**
- `proof_uri: String`

**Logic:**
1. Validate bounty.status == Claimed
2. Validate claimer == bounty.claimer
3. Set bounty.proof_uri = proof_uri
4. Set bounty.status = Submitted

**Security:**
- Only the claimer can submit proof
- Proof URI max length enforced (256 chars)

### 4. `approve_and_pay`

**Accounts:**
- `creator` (signer)
- `bounty` (mut)
- `vault` (mut)
- `claimer_token_account` (mut) - claimer's USDC account (destination)
- `token_program`

**Logic:**
1. Validate bounty.status == Submitted
2. Validate creator == bounty.creator
3. Transfer vault balance to claimer_token_account (CPI with PDA signer)
4. Set bounty.status = Completed

**Security:**
- Only creator can approve
- PDA signs the CPI transfer (using bump seed)
- Close vault account after transfer (reclaim rent to creator)

### 5. `cancel_bounty`

**Accounts:**
- `creator` (signer, mut)
- `bounty` (mut)
- `vault` (mut)
- `creator_token_account` (mut) - creator's USDC account (refund)
- `token_program`

**Logic:**
1. Validate bounty.status == Open
2. Validate now > bounty.deadline (expired)
3. Validate creator == bounty.creator
4. Transfer vault balance back to creator (CPI with PDA signer)
5. Set bounty.status = Cancelled

**Security:**
- Only creator can cancel
- Can only cancel Open bounties (not Claimed/Submitted)
- Must be past deadline

## Security Considerations

1. **Reentrancy:** Not applicable (no callbacks, single instruction flow)
2. **PDA Authority:** Vault is owned by Bounty PDA, transfers require PDA signer seeds
3. **Double-spend:** Status enum prevents claiming/approving multiple times
4. **Front-running:** Claim is first-come-first-serve (acceptable for bounties)
5. **Griefing:** Agents can't hold bounty hostage indefinitely (creator can wait for deadline + cancel)

## Constants

```rust
pub const USDC_MINT: Pubkey = pubkey!("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
pub const MAX_PROOF_URI_LEN: usize = 256;
```

## Testing

- ✅ Happy path: create → claim → submit → approve
- ✅ Cancel path: create → (wait for deadline) → cancel
- ✅ Unauthorized claim (wrong wallet)
- ✅ Unauthorized approve (non-creator)
- ✅ Double claim (already claimed)
- ✅ Submit proof without claiming
- ✅ Approve without proof
- ✅ Cancel before deadline (should fail)
- ✅ Cancel claimed bounty (should fail)

## Deployment

1. Build: `anchor build`
2. Deploy to devnet: `anchor deploy --provider.cluster devnet`
3. Test with devnet USDC mint
4. If stable after 48h testing → deploy to mainnet
