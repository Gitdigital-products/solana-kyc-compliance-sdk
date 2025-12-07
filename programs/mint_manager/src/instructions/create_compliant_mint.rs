use anchor_lang::prelude::*;
use anchor_spl::token_2022::{Token2022, Mint};
use crate::state::MintConfig;

#[derive(Accounts)]
pub struct CreateCompliantMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,

    #[account(
        init,
        payer = payer,
        space = 82,
        seeds = [b"mint_config", mint.key().as_ref()],
        bump
    )]
    pub config: Account<'info, MintConfig>,

    #[account(
        init,
        payer = payer,
        mint::decimals = decimals,
        mint::authority = payer
    )]
    pub mint: Account<'info, Mint>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
}

pub fn create_compliant_mint(
    ctx: Context<CreateCompliantMint>,
    decimals: u8,
) -> Result<()> {
    let cfg = &mut ctx.accounts.config;

    cfg.mint = ctx.accounts.mint.key();
    cfg.transfer_hook = Pubkey::from_str("Hook111111111111111111111111111111111111").unwrap();
    cfg.permanent_delegate = Pubkey::from_str("Deleg4te11111111111111111111111111111111").unwrap();

    cfg.bump = *ctx.bumps.get("config").unwrap();

    Ok(())
}