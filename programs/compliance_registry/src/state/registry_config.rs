use anchor_lang::prelude::*;

#[account]
pub struct RegistryConfig {
    /// Who controls this config (super admin)
    pub super_admin: Pubkey,
    /// List of approved registry authorities
    pub authorities: Vec<Pubkey>,
}
