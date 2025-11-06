*** Begin Patch
*** Add File: sdk/typescript/src/offline/queue.ts
+// tiny offline queue using localStorage. Good fallback for mobile/webview.
+// Each queued item = { id, timestamp, action, payload }
+const QUEUE_KEY = "kyc_offline_queue_v1";
+
+export type QueueItem = {
+  id: string;
+  ts: number;
+  action: string;
+  payload: any;
+};
+
+function loadQueue(): QueueItem[] {
+  try {
+    const raw = localStorage.getItem(QUEUE_KEY);
+    return raw ? JSON.parse(raw) as QueueItem[] : [];
+  } catch (e) {
+    console.warn("queue load failed", e);
+    return [];
+  }
+}
+
+function saveQueue(q: QueueItem[]) {
+  try {
+    localStorage.setItem(QUEUE_KEY, JSON.stringify(q));
+  } catch (e) {
+    console.warn("queue save failed", e);
+  }
+}
+
+export function enqueue(item: QueueItem) {
+  const q = loadQueue();
+  q.push(item);
+  saveQueue(q);
+}
+
+export function peekAll(): QueueItem[] {
+  return loadQueue();
+}
+
+export function clearQueue() {
+  saveQueue([]);
+}
+
+/** processQueue takes a processor callback that returns a Promise that resolves when item processed */
+export async function processQueue(processor: (item: QueueItem) => Promise<void>) {
+  const q = loadQueue();
+  const remaining: QueueItem[] = [];
+  for (const item of q) {
+    try {
+      await processor(item);
+    } catch (err) {
+      // keep item in queue to retry later
+      console.warn("processor error, keeping item", err);
+      remaining.push(item);
+    }
+  }
+  saveQueue(remaining);
+}
+
*** End Patch