pub fn transfer_super_admin(ctx: Context<TransferSuperAdmin>, new_super_admin: Pubkey) -> Result<()> {
    registry_config::transfer_super_admin(ctx, new_super_admin)
}
