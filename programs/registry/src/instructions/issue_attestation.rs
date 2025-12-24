use anchor_lang::prelude::*;
use crate::state::Attestation;

#[derive(Accounts)]
pub struct IssueAttestation<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        seeds = [b"attestation", wallet.key().as_ref()],
        bump,
        space = 8 + 32 + 32 + 8 + 1 + 1
    )]
    pub attestation: Account<'info, Attestation>,

    /// The wallet being attested
    pub wallet: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}

pub fn issue_attestation(
    ctx: Context<IssueAttestation>,
    expiration: i64,
) -> Result<()> {
    let att = &mut ctx.accounts.attestation;

    att.wallet = ctx.accounts.wallet.key();
    att.issued_by = ctx.accounts.authority.key();
    att.expires_at = expiration;
    att.revoked = false;
    att.bump = *ctx.bumps.get("attestation").unwrap();

    Ok(())
}