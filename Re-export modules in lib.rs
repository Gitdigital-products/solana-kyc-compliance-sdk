*** Begin Patch
*** Update File: crates/kyc-utils/src/lib.rs
@@
 pub const USER_KYC_SEED: &[u8] = b"user_kyc";
 pub const REGISTRY_SEED: &[u8] = b"registry";
 
 pub fn derive_registry_pda(program_id: &Pubkey, registry_authority: &Pubkey) -> (Pubkey, u8) {
     Pubkey::find_program_address(&[REGISTRY_SEED, registry_authority.as_ref()], program_id)
 }
 
 pub fn derive_user_kyc_pda(program_id: &Pubkey, registry: &Pubkey, user: &Pubkey) -> (Pubkey, u8) {
     Pubkey::find_program_address(&[USER_KYC_SEED, registry.as_ref(), user.as_ref()], program_id)
 }
+
+pub mod cache;
+pub mod rpc_client;
+pub mod crypto;
+pub mod rate_limiter;
*** End Patch