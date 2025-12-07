use anchor_lang::prelude::*;

#[account]
pub struct MintConfig {
    pub mint: Pubkey,
    pub transfer_hook: Pubkey,
    pub permanent_delegate: Pubkey,
    pub bump: u8,
}