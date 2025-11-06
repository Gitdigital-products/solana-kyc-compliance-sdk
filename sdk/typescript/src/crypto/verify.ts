*** Begin Patch
*** Add File: sdk/typescript/src/crypto/verify.ts
+import nacl from "tweetnacl";
+
+/** verify ed25519 signature (publicKey: base58 or Uint8Array) */
+export function verifyEd25519(pubKeyBytes: Uint8Array, message: Uint8Array, sigBytes: Uint8Array): boolean {
+  try {
+    return nacl.sign.detached.verify(message, sigBytes, pubKeyBytes);
+  } catch (e) {
+    console.warn("verify error", e);
+    return false;
+  }
+}
*** End Patch