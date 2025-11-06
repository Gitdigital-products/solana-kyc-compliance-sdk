*** Begin Patch
*** Update File: crates/kyc-core/src/lib.rs
@@
 use sha2::{Digest, Sha256};
 use solana_program::pubkey::Pubkey;
 
 /// Compute SHA256 digest of metadata bytes and return hex (or raw).
 pub fn metadata_hash(metadata: &[u8]) -> [u8; 32] {
     let mut hasher = Sha256::new();
     hasher.update(metadata);
     let res = hasher.finalize();
     let mut out = [0u8; 32];
     out.copy_from_slice(&res);
     out
 }
 
 /// Deterministic PDA seed helpers (same order as on-chain utils.rs).
 pub const USER_KYC_SEED: &[u8] = b"user_kyc";
 pub const REGISTRY_SEED: &[u8] = b"registry";
 
 /// Convert a Pubkey (solana_program::pubkey::Pubkey) to bytes for seeding.
 pub fn pk_bytes(pk: &Pubkey) -> [u8; 32] {
     pk.to_bytes()
 }
+
+// --- WASM exports (feature gated) ---------------------------
+#[cfg(feature = "wasm")]
+mod wasm_exports {
+    use super::*;
+    use wasm_bindgen::prelude::*;
+
+    /// Return sha256 as hex string for easier JS consumption.
+    #[wasm_bindgen]
+    pub fn metadata_hash_hex(metadata: &[u8]) -> String {
+        let hash = metadata_hash(metadata);
+        hex::encode(hash)
+    }
+
+    /// Return the USER_KYC_SEED as a string (so JS can use same seed bytes)
+    #[wasm_bindgen]
+    pub fn user_kyc_seed() -> Vec<u8> {
+        USER_KYC_SEED.to_vec()
+    }
+
+    /// Return the REGISTRY_SEED as bytes.
+    #[wasm_bindgen]
+    pub fn registry_seed() -> Vec<u8> {
+        REGISTRY_SEED.to_vec()
+    }
+}
+
*** End Patch
