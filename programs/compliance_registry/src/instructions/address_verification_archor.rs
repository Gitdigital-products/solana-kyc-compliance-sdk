hereuse anchor_lang::prelude::*;

/// Each verified address record lives at a PDA derived from:
/// seeds = ["address", user.key()]
#[account]
pub struct VerifiedAddress {
    pub user: Pubkey,
    pub verifier: Pubkey,
    pub verified: bool,
    pub timestamp: i64,
}

#[derive(Accounts)]
#[instruction()]
pub struct VerifyAddress<'info> {
    /// The registry authority who approves and pays for verification.
    #[account(mut)]
    pub registry_authority: Signer<'info>,

    /// The PDA where this user's verification data will be stored.
    /// Seeds = ["address", user.key()]
    #[account(
        init,
        payer = registry_authority,
        space = 8 + 32 + 32 + 1 + 8, // discriminator + fields
        seeds = [b"address", user.key().as_ref()],
        bump
    )]
    pub verified_address: Account<'info, VerifiedAddress>,

    /// The user being verified — no signature required.
    /// Just passed as AccountInfo so we can reference the pubkey.
    /// We're not writing to this account, just recording it.
    /// (This can be a wallet or another program-owned account.)
    /// Not mutable or signer.
    /// 
    pub user: AccountInfo<'info>,

    /// System program for creating PDAs.
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAddress<'info> {
    /// The registry authority revoking the verification.
    pub registry_authority: Signer<'info>,

    /// The user whose verification record is being revoked.
    pub user: AccountInfo<'info>,

    /// PDA record to be revoked.
    #[account(
        mut,
        seeds = [b"address", user.key().as_ref()],
        bump,
        close = registry_authority
    )]
    pub verified_address: Account<'info, VerifiedAddress>,
}
