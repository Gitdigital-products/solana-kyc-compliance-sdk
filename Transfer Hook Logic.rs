#[interface(spl_transfer_hook_interface::execute)]
pub fn execute(ctx: Context<TransferHook>, _amount: u64) -> Result<()> {
    // 1. Safety Check: Ensure the program is actually in a "transferring" state
    // This prevents malicious external calls to the hook.
    assert_is_transferring(&ctx)?;

    let source_kyc = &ctx.accounts.source_kyc_info;
    let destination_kyc = &ctx.accounts.destination_kyc_info;
    let mint_config = &ctx.accounts.mint_compliance_config;

    // 2. Global Sanctions Check
    if (source_kyc.bitmask & BIT_SANCTIONED) != 0 || (destination_kyc.bitmask & BIT_SANCTIONED) != 0 {
        return err!(ComplianceError::SanctionedAddress);
    }

    // 3. Expiration Check
    let clock = Clock::get()?;
    if source_kyc.expires_at < clock.unix_timestamp || destination_kyc.expires_at < clock.unix_timestamp {
        return err!(ComplianceError::KycExpired);
    }

    // 4. Jurisdictional Policy Enforcement
    // The "mint_config" defines which bits are REQUIRED for this specific token.
    let required = mint_config.required_bitmask;
    
    if (source_kyc.bitmask & required) != required {
        return err!(ComplianceError::SourceIneligible);
    }
    if (destination_kyc.bitmask & required) != required {
        return err!(ComplianceError::DestinationIneligible);
    }

    Ok(())
}
