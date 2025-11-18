use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq, Debug)]
pub enum Role {
    SuperAdmin = 0,
    Provider   = 1,
    User       = 2,
    Auditor    = 3,
}
impl Role {
    /// Returns true if self has >= privileges compared to other.
    /// Lower numeric value == higher privilege (SuperAdmin = 0)
    pub fn ge(&self, other: &Role) -> bool {
        (*self as u8) <= (*other as u8)
    }
}

#[macro_export]
macro_rules! check_role {
    ($signer_role:expr, $min_role:expr) => {
        require!($signer_role.ge(&$min_role), ErrorCode::InsufficientRole);
    };
}