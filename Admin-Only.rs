pub fn update_user_compliance(
    ctx: Context<UpdateCompliance>, 
    new_bitmask: u64, 
    new_expiry: i64
) -> Result<()> {
    let identity = &mut ctx.accounts.user_identity;
    
    // You could also add logic to "merge" bits rather than overwrite
    identity.bitmask = new_bitmask;
    identity.expires_at = new_expiry;
    
    emit!(ComplianceUpdated {
        user: ctx.accounts.user_wallet.key(),
        bitmask: new_bitmask,
    });
    
    Ok(())
}
