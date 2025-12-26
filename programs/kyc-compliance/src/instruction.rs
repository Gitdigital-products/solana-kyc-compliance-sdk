use solana_program::program_error::ProgramError;
use std::mem::size_of;
use borsh::{BorshDeserialize, BorshSerialize};

#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub enum ComplianceInstruction {
    /// Register a new investor
    /// Accounts expected:
    /// 0. [signer] Payer
    /// 1. [] Compliance Registry PDA
    /// 2. [writable] Investor Record PDA
    /// 3. [] Investor Wallet
    /// 4. [] System Program
    RegisterInvestor {
        investor_data: InvestorData,
    },
    
    /// Revoke investor status
    /// Accounts expected:
    /// 0. [signer] Admin
    /// 1. [] Compliance Registry PDA
    /// 2. [writable] Investor Record PDA
    RevokeInvestor,
    
    /// Update compliance policy
    /// Accounts expected:
    /// 0. [signer] Admin
    /// 1. [writable] Policy Config PDA
    UpdatePolicy {
        policy: CompliancePolicy,
    },
    
    /// Set new admin authority
    /// Accounts expected:
    /// 0. [signer] Current Admin
    /// 1. [writable] Admin Authority PDA
    /// 2. [] New Admin
    SetAdmin,
    
    /// Freeze a wallet
    /// Accounts expected:
    /// 0. [signer] Admin
    /// 1. [writable] Investor Record PDA
    /// 2. [] Policy Config PDA
    FreezeWallet,
    
    /// Unfreeze a wallet
    /// Accounts expected:
    /// 0. [signer] Admin
    /// 1. [writable] Investor Record PDA
    /// 2. [] Policy Config PDA
    UnfreezeWallet,
    
    /// Validate transfer (used by transfer hook)
    /// Accounts expected:
    /// 0. [] Transfer Hook Program ID
    /// 1. [] Source Wallet
    /// 2. [] Destination Wallet
    /// 3. [] Policy Config PDA
    /// 4. [] Investor Record PDA (source)
    /// 5. [] Investor Record PDA (destination)
    ValidateTransfer,
}