pub mod instructions;
use instructions::address_verification::*;

#[program]
pub mod compliance_registry {
    use super::*;

    pub fn verify_address(ctx: Context<VerifyAddress>) -> Result<()> {
        address_verification::verify_address(ctx)
    }

    pub fn revoke_address(ctx: Context<RevokeAddress>) -> Result<()> {
        address_verification::revoke_address(ctx)
    }
}
