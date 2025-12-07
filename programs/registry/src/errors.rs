use anchor_lang::prelude::*;

#[error_code]
pub enum RegistryError {
    #[msg("Attestation expired")]
    Expired,
    #[msg("Attestation revoked")]
    Revoked,
}