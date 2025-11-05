// Assuming you have created a new PDA context in lib.rs called RevokeAddressPDA
pub fn revoke_address(ctx: Context<crate::RevokeAddressPDA>) -> Result<()> {
    // SECURITY CHECK: Ensure the caller is the registered owner.
    require_keys_eq!(ctx.accounts.signer.key(), ctx.accounts.registry.owner, CustomError::Unauthorized);

    // Option A: Revoke by setting the status (Good for auditing)
    ctx.accounts.compliance_status_pda.status = crate::state::KycStatus::Revoked;
    ctx.accounts.compliance_status_pda.valid_until = Clock::get()?.unix_timestamp.checked_sub(1).unwrap(); // Expire immediately

    // Option B: Revoke by closing the account (Good for rent savings)
    // let status_pda = ctx.accounts.compliance_status_pda.to_account_info();
    // let recipient = ctx.accounts.signer.to_account_info();
    // anchor_lang::system_program::close_account(CpiContext::new_with_signer(...))?

    Ok(())
}
