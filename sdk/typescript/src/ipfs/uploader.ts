*** Begin Patch
*** Add File: sdk/typescript/src/ipfs/uploader.ts
+import { create as createIpfsClient, IPFSHTTPClient } from "ipfs-http-client";
+import { initWasm, packAndCompress } from "../wasm/loader";
+
+export type IpfsConfig = {
+  url?: string; // e.g. "https://ipfs.infura.io:5001"
+  apiKey?: string; // optional if using a pinning provider
+  apiSecret?: string;
+};
+
+export async function initIpfs(cfg?: IpfsConfig): Promise<IPFSHTTPClient> {
+  const url = cfg?.url ?? "https://ipfs.infura.io:5001";
+  // For common providers, basic auth uses projectId:secret as header; keep it flexible here
+  const client = createIpfsClient({ url });
+  return client;
+}
+
+export async function uploadCompressedMetadata(client: IPFSHTTPClient, obj: any, quality = 4) {
+  await initWasm();
+  const compressed = await packAndCompress(obj, quality); // Uint8Array
+  const { cid } = await client.add(compressed);
+  return cid.toString();
+}
*** End Patch