pub mod instructions;
pub mod state;

use anchor_lang::prelude::*;

declare_id!("MintManag3r111111111111111111111111111111111");

#[program]
pub mod mint_manager {
    use super::*;

    pub fn create_compliant_mint(
        ctx: Context<CreateCompliantMint>,
        decimals: u8,
    ) -> Result<()> {
        instructions::create_compliant_mint(ctx, decimals)
    }
}