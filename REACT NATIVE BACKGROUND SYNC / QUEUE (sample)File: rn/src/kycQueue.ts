import AsyncStorage from "@react-native-async-storage/async-storage";
import BackgroundFetch from "react-native-background-fetch";
import { v4 as uuidv4 } from "uuid";
import { initMobileRuntime, prepareMetadataForUpload, computeMetadataHash } from "./mobileHelpers"; // import compiled/mobile runtime
import { create as createIpfsClient } from "ipfs-http-client";
import { sendRegisterTx } from "./solanaSdk"; // your function to prepare & send tx (abstracted)
import { Keypair } from "@solana/web3.js";

const QUEUE_KEY = "kyc_mobile_queue_v1";

export type QueueItem = {
  id: string;
  ts: number;
  action: "upload_metadata" | "register_onchain";
  payload: any;
};

export async function enqueue(item: QueueItem) {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  const cur = raw ? JSON.parse(raw) as QueueItem[] : [];
  cur.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(cur));
}

export async function peekAll() {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? JSON.parse(raw) as QueueItem[] : [];
}

export async function clearQueue() {
  await AsyncStorage.removeItem(QUEUE_KEY);
}

async function tryUploadToIpfs(compressedBytes: Uint8Array) {
  const client = createIpfsClient({ url: "https://ipfs.infura.io:5001" });
  const { cid } = await client.add(Buffer.from(compressedBytes));
  return cid.toString();
}

export async function processQueue() {
  const items = await peekAll();
  const remaining: QueueItem[] = [];

  for (const item of items) {
    try {
      if (item.action === "upload_metadata") {
        const compressed = Uint8Array.from(item.payload.compressed);
        const cid = await tryUploadToIpfs(compressed);
        // compute hash
        const hash = computeMetadataHash(compressed);
        // enqueue register action
        await enqueue({
          id: uuidv4(),
          ts: Date.now(),
          action: "register_onchain",
          payload: { cid, metadata_hash: Array.from(hash), registry: item.payload.registry }
        });
      } else if (item.action === "register_onchain") {
        // Try to send tx. This function must sign or request authority signature.
        await sendRegisterTx(item.payload);
      }
    } catch (e) {
      // keep item for retry
      remaining.push(item);
    }
  }

  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(remaining));
}

// Register background fetch
export function registerBackgroundSync() {
  BackgroundFetch.configure(
    {
      minimumFetchInterval: 15, // minutes, platform limit
      stopOnTerminate: false,
      startOnBoot: true,
      enableHeadless: true,
      requiredNetworkType: BackgroundFetch.NETWORK_TYPE_ANY,
    },
    async (taskId) => {
      try {
        await initMobileRuntime();
        await processQueue();
      } catch (err) {
        console.warn("bg process error", err);
      } finally {
        BackgroundFetch.finish(taskId);
      }
    },
    (error) => {
      console.error("BackgroundFetch failed to start", error);
    }
  );
}