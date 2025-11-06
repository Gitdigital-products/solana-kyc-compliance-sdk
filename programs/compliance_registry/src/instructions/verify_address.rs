*** Begin Patch
*** Update File: programs/compliance_registry/src/instructions/verify_address.rs
@@
-use anchor_lang::prelude::*;
-use crate::state::{VerifiedAddress, Registry};
-
-#[derive(Accounts)]
-pub struct VerifyAddress<'info> {
-    /// The account to be verified (must be a signer)
-    #[account(mut, signer)]
-    pub user: Signer<'info>,
-
-    /// Registry PDA
-    #[account(mut)]
-    pub registry: Account<'info, Registry>,
-
-    /// Verified address PDA to create
-    #[account(
-        init,
-        payer = user,
-        seeds = [b"verified", user.key().as_ref(), registry.key().as_ref()],
-        bump,
-        space = 8 + VerifiedAddress::SIZE
-    )]
-    pub verified_address: Account<'info, VerifiedAddress>,
-
-    pub system_program: Program<'info, System>,
-}
-
-pub fn verify_address(ctx: Context<VerifyAddress>, metadata: Vec<u8>) -> Result<()> {
-    let user_key = ctx.accounts.user.key();
-
-    let v = &mut ctx.accounts.verified_address;
-    v.owner = *user_key;
-    v.registry = ctx.accounts.registry.key();
-    v.metadata = metadata;
-    v.verified_at = Clock::get()?.unix_timestamp;
-
-    emit!(AddressVerified {
-        owner: *user_key,
-        registry: ctx.accounts.registry.key(),
-    });
-
-    Ok(())
-}
+use anchor_lang::prelude::*;
+use crate::state::{VerifiedAddress, Registry};
+
+/// Verify an address and create the VerifiedAddress PDA.
+/// NOTE: `user` is intentionally **not** a signer here — it's the account being verified.
+/// `registry_authority` is the signer that authorizes verification and pays for PDA creation.
+#[derive(Accounts)]
+pub struct VerifyAddress<'info> {
+    /// The account (address) being verified; non-signer.
+    /// We keep it `AccountInfo` to allow verifying arbitrary addresses (wallets, program-owned, etc.)
+    #[account(mut)]
+    pub user: AccountInfo<'info>,
+
+    /// The authority of the registry (must be signer). This account authorizes the verification
+    /// operation and will be used as the payer for PDA initialization.
+    pub registry_authority: Signer<'info>,
+
+    /// Registry PDA (holds registry-wide config).
+    #[account(mut, has_one = authority @ ErrorCode::UnauthorizedRegistryAuthority)]
+    pub registry: Account<'info, Registry>,
+
+    /// Verified address PDA to create
+    #[account(
+        init,
+        payer = registry_authority,
+        seeds = [b"verified", user.key().as_ref(), registry.key().as_ref()],
+        bump,
+        space = 8 + VerifiedAddress::SIZE
+    )]
+    pub verified_address: Account<'info, VerifiedAddress>,
+
+    pub system_program: Program<'info, System>,
+}
+
+pub fn verify_address(ctx: Context<VerifyAddress>, metadata: Vec<u8>) -> Result<()> {
+    // Use the user key from the non-signer AccountInfo
+    let user_key = ctx.accounts.user.key();
+
+    // Sanity: ensure registry_authority matches registry.authority (the account that can verify)
+    require_keys_eq!(
+        ctx.accounts.registry.authority,
+        ctx.accounts.registry_authority.key(),
+        ErrorCode::UnauthorizedRegistryAuthority
+    );
+
+    let v = &mut ctx.accounts.verified_address;
+    v.owner = *user_key;
+    v.registry = ctx.accounts.registry.key();
+    v.metadata = metadata;
+    v.verified_at = Clock::get()?.unix_timestamp;
+
+    emit!(AddressVerified {
+        owner: *user_key,
+        registry: ctx.accounts.registry.key(),
+        verifier: ctx.accounts.registry_authority.key(),
+    });
+
+    Ok(())
+}
*** End Patch