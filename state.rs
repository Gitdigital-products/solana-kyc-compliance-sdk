use anchor_lang::prelude::*;

#[account]
pub struct ComplianceStatus {
    // The wallet address this status applies to.
    pub wallet: Pubkey,
    // A simplified enum to track status.
    pub status: KycStatus,
    // A Unix timestamp for when the status expires (e.g., 1 year from approval).
    pub valid_until: i64,
}

impl ComplianceStatus {
    pub const LEN: usize = 8 + 32 + 1 + 8; // Anchor Discriminator + Pubkey + Enum + i64

    pub fn is_compliant(&self) -> bool {
        let current_timestamp = Clock::get().unwrap().unix_timestamp;
        
        // Compliance check: Status must be Approved AND not expired.
        self.status == KycStatus::Approved && self.valid_until > current_timestamp
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq)]
pub enum KycStatus {
    Pending,
    Approved,
    Revoked,
}
