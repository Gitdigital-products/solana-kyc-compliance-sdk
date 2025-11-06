*** Begin Patch
*** Update File: programs/compliance_registry/src/errors.rs
@@
 #[error_code]
 pub enum ErrorCode {
     #[msg("Registry not found")]
     RegistryNotFound,
+    #[msg("Registry authority mismatch or unauthorized")]
+    UnauthorizedRegistryAuthority,
     // ... other errors ...
 }
*** End Patch