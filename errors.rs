use anchor_lang::prelude::*;

#[error_code]
pub enum ComplianceError {
    #[msg("The source wallet is not compliant, status is pending, revoked, or expired.")]
    SourceWalletNotCompliant,
    #[msg("The destination wallet is not compliant, status is pending, revoked, or expired.")]
    DestinationWalletNotCompliant,
}
