use anchor_lang::prelude::*;

#[event]
pub struct RegistryInitialized {
    pub super_admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuthorityAdded {
    pub new_authority: Pubkey,
    pub added_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuthorityRemoved {
    pub removed_authority: Pubkey,
    pub removed_by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct SuperAdminTransferred {
    pub old_admin: Pubkey,
    pub new_admin: Pubkey,
    pub timestamp: i64,
}
