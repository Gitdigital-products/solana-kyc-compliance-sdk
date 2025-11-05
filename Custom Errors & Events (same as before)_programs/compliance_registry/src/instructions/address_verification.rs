#[error_code]
pub enum CustomError {
    #[msg("This address is not verified.")]
    AddressNotVerified,
    #[msg("User key mismatch.")]
    UserKeyMismatch,
}

#[event]
pub struct AddressVerified {
    pub user: Pubkey,
    pub verifier: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AddressRevoked {
    pub user: Pubkey,
    pub revoked_by: Pubkey,
    pub timestamp: i64,
}
