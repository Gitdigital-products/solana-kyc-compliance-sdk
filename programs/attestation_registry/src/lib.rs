use anchor_lang::prelude::*;

declare_id!("Reg1stry1111111111111111111111111111111111111");

#[program]
pub mod attestation_registry {
    use super::*;

    pub fn issue_attestation(
        ctx: Context<IssueAttestation>,
        expires_at: i64,
        jurisdiction: String,
        data_hash: [u8; 32],
    ) -> Result<()> {
        let att = &mut ctx.accounts.attestation;
        att.issuer = ctx.accounts.issuer.key();
        att.wallet = ctx.accounts.wallet.key();
        att.issued_at = Clock::get()?.unix_timestamp;
        att.expires_at = expires_at;
        att.jurisdiction = jurisdiction;
        att.data_hash = data_hash;
        att.revoked = false;
        Ok(())
    }

    pub fn revoke_attestation(ctx: Context<RevokeAttestation>) -> Result<()> {
        let att = &mut ctx.accounts.attestation;
        require!(
            ctx.accounts.issuer.key() == att.issuer,
            AttestationError::Unauthorized
        );
        att.revoked = true;
        Ok(())
    }

    pub fn check_status(_ctx: Context<CheckStatus>) -> Result<AttestationView> {
        let att = &_ctx.accounts.attestation;
        let now = Clock::get()?.unix_timestamp;
        let valid = !att.revoked && att.expires_at > now;
        Ok(AttestationView {
            wallet: att.wallet,
            issuer: att.issuer,
            issued_at: att.issued_at,
            expires_at: att.expires_at,
            jurisdiction: att.jurisdiction.clone(),
            data_hash: att.data_hash,
            valid,
        })
    }
}

#[derive(Accounts)]
#[instruction(expires_at: i64, jurisdiction: String, data_hash: [u8;32])]
pub struct IssueAttestation<'info> {
    #[account(mut, signer)]
    pub issuer: AccountInfo<'info>,
    /// CHECK: wallet being attested
    pub wallet: AccountInfo<'info>,
    #[account(
        init_if_needed,
        payer = issuer,
        space = 8 + Attestation::MAX_SIZE,
        seeds = [b"attestation", wallet.key.as_ref()],
        bump
    )]
    pub attestation: Account<'info, Attestation>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeAttestation<'info> {
    #[account(signer)]
    pub issuer: AccountInfo<'info>,
    #[account(mut, seeds = [b"attestation", attestation.wallet.as_ref()], bump)]
    pub attestation: Account<'info, Attestation>,
}

#[derive(Accounts)]
pub struct CheckStatus<'info> {
    /// CHECK: we only read attestation data
    #[account(seeds = [b"attestation", wallet.key.as_ref()], bump)]
    pub attestation: Account<'info, Attestation>,
    /// CHECK: wallet passed for seeds
    pub wallet: AccountInfo<'info>,
}

#[account]
pub struct Attestation {
    pub issuer: Pubkey,        // 32
    pub wallet: Pubkey,        // 32
    pub issued_at: i64,        // 8
    pub expires_at: i64,       // 8
    pub jurisdiction: String,  // 4 + len
    pub data_hash: [u8; 32],   // 32
    pub revoked: bool,         // 1
}

impl Attestation {
    // rough max size: 32 + 32 + 8 + 8 + (4 + 64) + 32 + 1 = 181
    pub const MAX_SIZE: usize = 32 + 32 + 8 + 8 + 4 + 64 + 32 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct AttestationView {
    pub wallet: Pubkey,
    pub issuer: Pubkey,
    pub issued_at: i64,
    pub expires_at: i64,
    pub jurisdiction: String,
    pub data_hash: [u8; 32],
    pub valid: bool,
}

#[error_code]
pub enum AttestationError {
    #[msg("Unauthorized")]
    Unauthorized,
}