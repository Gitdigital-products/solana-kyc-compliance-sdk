use anchor_lang::prelude::*;

#[account]
pub struct Registry {
    pub owner: Pubkey,
    pub verified_accounts: Vec<Pubkey>,
}

impl Registry {
    pub const MAX_SIZE: usize = 32 + 4 + (1000 * 32);
}
