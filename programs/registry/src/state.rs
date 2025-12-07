use anchor_lang::prelude::*;

#[account]
pub struct Attestation {
    pub wallet: Pubkey,
    pub issued_by: Pubkey,
    pub expires_at: i64,
    pub revoked: bool,
    pub bump: u8,
}