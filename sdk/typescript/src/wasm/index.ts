*** Begin Patch
*** Add File: sdk/typescript/src/wasm/index.ts
+// Lightweight wrapper to load the wasm-pack output and expose functions.
+// Usage:
+//   import { initWasm, metadataHashHex } from "./wasm";
+//   await initWasm();
+//   const hex = metadataHashHex(new TextEncoder().encode("hello"));
+
+let wasm: any = null;
+
+export async function initWasm() {
+  if (wasm) return wasm;
+  // dynamic import the generated pkg (path relative to this file)
+  // wasm-pack outputs an index.js that registers the wasm module.
+  try {
+    // eslint-disable-next-line @typescript-eslint/no-var-requires
+    wasm = await import("./pkg");
+    // if default export contains `default` that is the initializer in some outputs
+    if (wasm && typeof wasm.default === "function") {
+      await wasm.default(); // initialize if needed
+    }
+    return wasm;
+  } catch (err) {
+    console.error("Failed to load wasm module:", err);
+    throw err;
+  }
+}
+
+export function metadataHashHex(metadata: Uint8Array): string {
+  if (!wasm) throw new Error("WASM not initialized. Call initWasm()");
+  // `metadata` will be passed as Uint8Array across the wasm glue
+  return wasm.metadata_hash_hex(metadata);
+}
+
+export function userKycSeed(): Uint8Array {
+  if (!wasm) throw new Error("WASM not initialized. Call initWasm()");
+  return Uint8Array.from(wasm.user_kyc_seed());
+}
+
+export function registrySeed(): Uint8Array {
+  if (!wasm) throw new Error("WASM not initialized. Call initWasm()");
+  return Uint8Array.from(wasm.registry_seed());
+}
+
*** End Patch
