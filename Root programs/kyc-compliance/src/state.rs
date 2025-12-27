cat > programs/kyc-compliance/src/state.rs << 'EOF'
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
    pub version: u8,
}

impl ComplianceRegistry {
    pub const LEN: usize = 32 + 1 + 8 + 8 + 8 + 1;
    
    pub fn new(admin: Pubkey, bump: u8) -> Self {
        Self {
            admin,
            bump,
            investor_count: 0,
            total_registered: 0,
            total_revoked: 0,
            version: 1,
        }
    }
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
    
    pub fn new(admin: Pubkey, bump: u8, permanent_delegate: Pubkey) -> Self {
        Self {
            admin,
            bump,
            policy: CompliancePolicy::default(),
            permanent_delegate,
            is_transfer_hook_enabled: true,
            last_updated: 0,
        }
    }
}

/// Compliance Policy
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct CompliancePolicy {
    pub require_kyc_for_transfer: bool,
    pub allow_anonymous_sender: bool,
    pub allow_anonymous_receiver: bool,
    pub max_transfer_amount: u64,
    pub min_kyc_level: u8,
    pub supported_countries: Vec<String>,
    pub restricted_countries: Vec<String>,
    pub is_active: bool,
    pub require_accreditation: bool,
    pub max_wallets_per_investor: u32,
}

impl CompliancePolicy {
    pub const LEN: usize = 1 + 1 + 1 + 8 + 1 + 1;
    
    pub fn default() -> Self {
        Self {
            require_kyc_for_transfer: true,
            allow_anonymous_sender: false,
            allow_anonymous_receiver: false,
            max_transfer_amount: 1_000_000_000, // 1 SOL in lamports
            min_kyc_level: 1,
            supported_countries: vec!["US".to_string(), "UK".to_string(), "DE".to_string()],
            restricted_countries: vec!["RU".to_string(), "KP".to_string(), "IR".to_string()],
            is_active: true,
            require_accreditation: false,
            max_wallets_per_investor: 5,
        }
    }
}

impl Default for CompliancePolicy {
    fn default() -> Self {
        Self::default()
    }
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
    pub investor_type: u8,
    pub accreditation_status: u8,
    pub wallet_count: u32,
}

impl InvestorRecord {
    pub const LEN: usize = 32 + 1 + 1 + 2 + 1 + 1 + 8 + 8 + 8 + 8 + 1 + 1 + 4;
    
    pub fn new(
        investor_wallet: Pubkey,
        bump: u8,
        kyc_level: u8,
        country_code: String,
        investor_type: u8,
        accreditation_status: u8,
        timestamp: i64,
    ) -> Self {
        Self {
            investor_wallet,
            bump,
            kyc_level,
            country_code,
            is_verified: true,
            is_frozen: false,
            registration_date: timestamp,
            last_updated: timestamp,
            total_transfers: 0,
            total_volume: 0,
            investor_type,
            accreditation_status,
            wallet_count: 1,
        }
    }
}

/// Investor Data for Registration
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct InvestorData {
    pub kyc_level: u8,
    pub country_code: String,
    pub investor_type: u8,
    pub accreditation_status: u8,
}

/// Transfer Validation Context
#[derive(BorshSerialize, BorshDeserialize, Debug, Clone)]
pub struct TransferContext {
    pub amount: u64,
    pub source: Pubkey,
    pub destination: Pubkey,
    pub timestamp: i64,
    pub transfer_type: u8, // 0=regular, 1=whitelist, 2=emergency
}
EOF