#[account]
pub struct UserCompliance {
    pub owner: Pubkey,
    pub bitmask: u64, // The "Identity Profile"
    pub expires_at: i64,
}

// Bitmask constants (Standardized)
pub const BIT_US_ACCREDITED: u64 = 1 << 0;
pub const BIT_EU_MICA: u64        = 1 << 1;
pub const BIT_SANCTIONED: u64     = 1 << 63; // High bit for immediate block
