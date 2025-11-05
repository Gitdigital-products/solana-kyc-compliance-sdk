herepub fn verify_address(ctx: Context<crate::VerifyAddress>, user: Pubkey) -> Result<()> {
    let registry = &mut ctx.accounts.registry;
    if !registry.verified_accounts.contains(&user) {
        registry.verified_accounts.push(user);
    }
    Ok(())
}
