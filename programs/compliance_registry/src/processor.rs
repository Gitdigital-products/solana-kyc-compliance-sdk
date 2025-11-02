use anchor_lang::prelude::*;
use anchor_spl::token_interface::{TransferHook, TransferHookAccount};
use solana_program::pubkey::Pubkey;

// Import your custom state and error definitions
use crate::state::*;
use crate::errors::ComplianceError;

// Define the required context for the transfer hook
#[derive(Accounts)]
pub struct TransferHookContext<'info> {
    // The account of the token that is being transferred.
    #[account(
        mint,
        // Ensure the Mint account has the Transfer Hook extension enabled
        // and its program ID points to *this* program's ID.
        has_extension = TransferHook
    )]
    pub mint: InterfaceAccount<'info, Mint>,

    // The token account the tokens are coming *from* (Source).
    #[account(token::mint = mint)]
    pub source: InterfaceAccount<'info, TokenAccount>,

    // The token account the tokens are going *to* (Destination).
    #[account(token::mint = mint)]
    pub destination: InterfaceAccount<'info, TokenAccount>,

    // The owner of the source token account. This is the wallet initiating the transfer.
    pub authority: Signer<'info>,

    // --- Custom Compliance Accounts ---

    // Derived address that holds the compliance status for the Source wallet.
    // PDA: ['compliance_status', source_owner_key]
    #[account(
        seeds = [b"compliance_status", authority.key().as_ref()],
        bump,
        // MUST be a valid, non-expired status
        constraint = source_status.is_compliant() @ ComplianceError::SourceWalletNotCompliant,
    )]
    pub source_status: Account<'info, ComplianceStatus>,

    // Derived address that holds the compliance status for the Destination wallet.
    // PDA: ['compliance_status', destination_owner_key]
    #[account(
        seeds = [b"compliance_status", destination.owner.key().as_ref()],
        bump,
        // MUST be a valid, non-expired status
        constraint = destination_status.is_compliant() @ ComplianceError::DestinationWalletNotCompliant,
    )]
    pub destination_status: Account<'info, ComplianceStatus>,
}


// --- THE TRANSFER HOOK FUNCTION ---
// This function is executed by the Solana runtime *before* the token transfer happens.
pub fn transfer_hook(ctx: Context<TransferHookContext>, _amount: u64) -> Result<()> {
    // 1. All compliance checks are handled by the constraints in TransferHookContext
    //    (e.g., source_status.is_compliant() and destination_status.is_compliant()).
    
    msg!(
        "Transfer permitted: Source ({}) and Destination ({}) wallets are compliant.",
        ctx.accounts.authority.key(),
        ctx.accounts.destination.owner.key()
    );
    
    // 2. Add custom logic here for more detailed checks if necessary.
    //    Example: Check if the token amount exceeds a regulatory limit.
    //    Example: Check against an on-chain Blocklist/Sanctions list.
    
    Ok(())
}
