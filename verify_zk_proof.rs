pub fn execute(ctx: Context<TransferHook>, amount: u64, proof: ZkComplianceProof) -> Result<()> {
    // 1. Standard Transfer Hook Safety
    assert_is_transferring(&ctx)?;

    // 2. ZK Proof Verification
    // We check that the user's HIDDEN bitmask contains the REQUIRED_BIT
    // without the Hook ever seeing the full bitmask.
    let auditor_pubkey = ctx.accounts.mint_config.auditor_key;
    
    // Using Light Protocol's ZK-compression verifier
    verify_zk_compressed_state(
        &ctx.accounts.zk_registry_root,
        &proof,
        auditor_pubkey
    ).map_err(|_| ComplianceError::ZkVerificationFailed)?;

    Ok(())
}
