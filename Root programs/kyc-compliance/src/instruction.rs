cat > programs/kyc-compliance/src/instruction.rs << 'EOF'
use solana_program::program_error::ProgramError;
use borsh::{BorshDeserialize, BorshSerialize};
use crate::state::{InvestorData, CompliancePolicy};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum ComplianceInstruction {
    /// Register a new investor
    RegisterInvestor {
        investor_data: InvestorData,
    },
    
    /// Revoke investor status
    RevokeInvestor,
    
    /// Update compliance policy
    UpdatePolicy {
        policy: CompliancePolicy,
    },
    
    /// Set new admin authority
    SetAdmin,
    
    /// Freeze a wallet
    FreezeWallet,
    
    /// Unfreeze a wallet
    UnfreezeWallet,
    
    /// Validate transfer (used by transfer hook)
    ValidateTransfer {
        amount: u64,
    },
    
    /// Initialize compliance registry
    InitializeRegistry,
    
    /// Initialize policy config
    InitializePolicy,
}

impl ComplianceInstruction {
    pub fn unpack(input: &[u8]) -> Result<Self, ProgramError> {
        let (tag, rest) = input.split_first().ok_or(ProgramError::InvalidInstructionData)?;
        Ok(match tag {
            0 => {
                let investor_data = InvestorData::try_from_slice(rest)?;
                Self::RegisterInvestor { investor_data }
            }
            1 => Self::RevokeInvestor,
            2 => {
                let policy = CompliancePolicy::try_from_slice(rest)?;
                Self::UpdatePolicy { policy }
            }
            3 => Self::SetAdmin,
            4 => Self::FreezeWallet,
            5 => Self::UnfreezeWallet,
            6 => {
                let amount = rest
                    .get(..8)
                    .and_then(|slice| slice.try_into().ok())
                    .map(u64::from_le_bytes)
                    .ok_or(ProgramError::InvalidInstructionData)?;
                Self::ValidateTransfer { amount }
            }
            7 => Self::InitializeRegistry,
            8 => Self::InitializePolicy,
            _ => return Err(ProgramError::InvalidInstructionData.into()),
        })
    }
    
    pub fn pack(&self) -> Vec<u8> {
        let mut buf = Vec::new();
        match self {
            Self::RegisterInvestor { investor_data } => {
                buf.push(0);
                buf.extend_from_slice(&investor_data.try_to_vec().unwrap());
            }
            Self::RevokeInvestor => buf.push(1),
            Self::UpdatePolicy { policy } => {
                buf.push(2);
                buf.extend_from_slice(&policy.try_to_vec().unwrap());
            }
            Self::SetAdmin => buf.push(3),
            Self::FreezeWallet => buf.push(4),
            Self::UnfreezeWallet => buf.push(5),
            Self::ValidateTransfer { amount } => {
                buf.push(6);
                buf.extend_from_slice(&amount.to_le_bytes());
            }
            Self::InitializeRegistry => buf.push(7),
            Self::InitializePolicy => buf.push(8),
        }
        buf
    }
}
EOF