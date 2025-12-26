use solana_program::program_error::ProgramError;
use thiserror::Error;

#[derive(Error, Debug, Copy, Clone)]
pub enum ComplianceError {
    #[error("Unauthorized")]
    Unauthorized,
    
    #[error("Already Registered")]
    AlreadyRegistered,
    
    #[error("Not Registered")]
    NotRegistered,
    
    #[error("Policy Violation")]
    PolicyViolation,
    
    #[error("Invalid Instruction")]
    InvalidInstruction,
    
    #[error("Account Not Initialized")]
    NotInitialized,
    
    #[error("Invalid Policy")]
    InvalidPolicy,
    
    #[error("Transfer Not Allowed")]
    TransferNotAllowed,
    
    #[error("Wallet Frozen")]
    WalletFrozen,
    
    #[error("Account Frozen")]
    AccountFrozen,
}

impl From<ComplianceError> for ProgramError {
    fn from(e: ComplianceError) -> Self {
        ProgramError::Custom(e as u32)
    }
}