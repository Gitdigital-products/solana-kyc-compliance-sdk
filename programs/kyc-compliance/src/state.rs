use borsh::{BorshDeserialize, BorshSerialize};
use solana_program::pubkey::Pubkey;

/// Compliance Registry Account
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct ComplianceRegistry {
    pub admin: Pubkey,
    pub bump: u8,
    pub investor_count: u64,
    pub total_registered: u64,
    pub total_revoked: u64,
}

impl ComplianceRegistry {
    pub const LEN: usize = 32 + 1 + 8 + 8 + 8;
}

/// Policy Configuration Account
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct PolicyConfig {
    pub admin: Pubkey,
    pub bump: u8,
    pub policy: CompliancePolicy,
    pub permanent_delegate: Pubkey,
    pub is_transfer_hook_enabled: bool,
    pub last_updated: i64,
}

impl PolicyConfig {
    pub const LEN: usize = 32 + 1 + CompliancePolicy::LEN + 32 + 1 + 8;
}

/// Compliance Policy
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CompliancePolicy {
    pub require_kyc_for_transfer: bool,
    pub allow_anonymous_sender: bool,
    pub allow_anonymous_receiver: bool,
    pub max_transfer_amount: u64,
    pub min_kyc_level: u8,
    pub supported_countries: Vec<String>, // ISO country codes
    pub restricted_countries: Vec<String>,
    pub is_active: bool,
}

impl CompliancePolicy {
    pub const LEN: usize = 1 + 1 + 1 + 8 + 1 + 1;
}

/// Investor Record
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct InvestorRecord {
    pub investor_wallet: Pubkey,
    pub bump: u8,
    pub kyc_level: u8,
    pub country_code: String,
    pub is_verified: bool,
    pub is_frozen: bool,
    pub registration_date: i64,
    pub last_updated: i64,
    pub total_transfers: u64,
    pub total_volume: u64,
}

impl InvestorRecord {
    pub const LEN: usize = 32 + 1 + 1 + 2 + 1 + 1 + 8 + 8 + 8 + 8;
}

/// Investor Data for Registration
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct InvestorData {
    pub kyc_level: u8,
    pub country_code: String,
    pub investor_type: u8, // 0=individual, 1=institution
    pub accreditation_status: u8, // 0=non-accredited, 1=accredited
}

/// Transfer Validation Context
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct TransferContext {
    pub amount: u64,
    pub source: Pubkey,
    pub destination: Pubkey,
    pub timestamp: i64,
}