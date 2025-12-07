pub mod instructions;
pub mod state;
pub mod errors;

use anchor_lang::prelude::*;

declare_id!("REG1stry11111111111111111111111111111111111");

#[program]
pub mod compliance_registry {
    use super::*;

    pub fn issue_attestation(ctx: Context<IssueAttestation>, expiration: i64) -> Result<()> {
        instructions::issue_attestation(ctx, expiration)
    }

    pub fn revoke_attestation(ctx: Context<RevokeAttestation>) -> Result<()> {
        instructions::revoke_attestation(ctx)
    }

    pub fn check_status(_ctx: Context<CheckStatus>) -> Result<()> {
        Ok(())
    }
}