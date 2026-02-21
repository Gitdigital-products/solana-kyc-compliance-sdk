pub fn initialize_extra_account_meta_list(ctx: Context<InitializeExtraAccountMetaList>) -> Result<()> {
    let account_metas = vec![
        // Index 0-3 are standard (Source, Mint, Dest, Authority)
        // Index 4: Source KYC Account (Derived from Source Wallet)
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"kyc".to_vec() },
                Seed::AccountKey { index: 0 }, // 0 = Source Wallet
            ],
            false, // is_signer
            false, // is_writable
        )?,
        // Index 5: Destination KYC Account (Derived from Dest Wallet)
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::Literal { bytes: b"kyc".to_vec() },
                Seed::AccountKey { index: 2 }, // 2 = Destination Wallet
            ],
            false, 
            false,
        )?,
    ];

    // Initialize the account with the TLV (Type-Length-Value) data
    let account_info = ctx.accounts.extra_account_meta_list.to_account_info();
    let mut data = account_info.try_borrow_mut_data()?;
    ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &account_metas)?;

    Ok(())
}
