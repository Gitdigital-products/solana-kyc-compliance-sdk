import express from "express";
import basicAuth from "basic-auth";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import pino from "pino";
import { create as createIpfsClient } from "ipfs-http-client";
import nacl from "tweetnacl";
import { sha256 } from "js-sha256";
import { encode as msgpackEncode } from "@msgpack/msgpack";
import brotli from "brotli";
import { v4 as uuidv4 } from "uuid";
import bs58 from "bs58";

const log = pino();
const app = express();
app.use(helmet());
app.use(express.json({ limit: "2mb" }));

// CONFIG — set via env (recommended)
const PORT = process.env.PORT || 3001;
const API_KEY = process.env.SIGNER_API_KEY || "dev-key-change-me";
const IPFS_URL = process.env.IPFS_URL || "https://ipfs.infura.io:5001";
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 60; // 60 requests / minute per IP

// Rate limiting
app.set("trust proxy", 1);
app.use(rateLimit({ windowMs: RATE_WINDOW_MS, max: RATE_MAX }));

// Instantiate IPFS client (optional)
const ipfs = createIpfsClient({ url: IPFS_URL });

// Keypair: production -> load from secure store/ENV. demo: create ephemeral key
// PRODUCTION: load base64/hex secret key from env and convert to Uint8Array
let SERVER_KEYPAIR = null;
if (process.env.SIGNER_SECRET_BASE64) {
  const secret = Buffer.from(process.env.SIGNER_SECRET_BASE64, "base64");
  SERVER_KEYPAIR = nacl.sign.keyPair.fromSecretKey(new Uint8Array(secret));
  log.info("Loaded signer from env");
} else {
  SERVER_KEYPAIR = nacl.sign.keyPair(); // ephemeral: for dev only
  log.warn("Using ephemeral keypair for dev. Set SIGNER_SECRET_BASE64 in env for prod.");
}
const SERVER_PUB_B58 = bs58.encode(Buffer.from(SERVER_KEYPAIR.publicKey));

// Simple API key middleware
function requireApiKey(req, res, next) {
  const credentials = basicAuth(req);
  const key = credentials ? credentials.name || credentials.pass : req.get("x-api-key") || "";
  if (key !== API_KEY) {
    return res.status(401).json({ error: "unauthorized" });
  }
  next();
}

// POST /sign
// body: { metadata: object } OR { packed: base64 } OR { cid: string }
// returns { cid, metadata_hash_hex, signature_b64, pubkey_b58, id }
app.post("/sign", requireApiKey, async (req, res) => {
  try {
    const id = uuidv4();
    let packed;
    if (req.body.cid) {
      // if client already uploaded to IPFS, server can fetch or just sign CID as a reference
      // best practice: server should verify content, but this demo simply returns signature over CID+ts
      const cid = req.body.cid;
      const message = Buffer.from(cid + "|" + Date.now().toString());
      const hashHex = sha256(message);
      const hashBytes = Buffer.from(hashHex, "hex");
      const sig = nacl.sign.detached(new Uint8Array(hashBytes), SERVER_KEYPAIR.secretKey);
      return res.json({
        id,
        cid,
        metadata_hash_hex: hashHex,
        signature_b64: Buffer.from(sig).toString("base64"),
        pubkey_b58: SERVER_PUB_B58
      });
    } else if (req.body.packed) {
      // client sent base64 or array -> decode to bytes
      packed = Buffer.from(req.body.packed, "base64");
    } else if (req.body.metadata) {
      // pack -> compress -> upload
      const metadataObj = req.body.metadata;
      packed = msgpackEncode(metadataObj);
    } else {
      return res.status(400).json({ error: "missing metadata | packed | cid" });
    }

    // compress
    const compressed = brotli.compress(Buffer.from(packed));
    // hash compressed bytes
    const hashHex = sha256(Buffer.from(compressed));
    const hashBytes = Buffer.from(hashHex, "hex");

    // sign
    const sig = nacl.sign.detached(new Uint8Array(hashBytes), SERVER_KEYPAIR.secretKey);
    // upload to ipfs (try/catch)
    let cid = null;
    try {
      const addRes = await ipfs.add(compressed);
      cid = addRes.cid.toString();
    } catch (e) {
      log.warn({ err: e }, "IPFS upload failed; returning signature & hash without CID");
    }

    // record audit (console/pino). In prod: write to DB (immutable log)
    log.info({ id, cid, hashHex, pubkey: SERVER_PUB_B58 }, "signed metadata");

    return res.json({
      id,
      cid,
      metadata_hash_hex: hashHex,
      signature_b64: Buffer.from(sig).toString("base64"),
      pubkey_b58: SERVER_PUB_B58
    });
  } catch (err) {
    log.error({ err }, "sign endpoint failure");
    return res.status(500).json({ error: "server_error" });
  }
});

// GET /pubkey -> returns server public key (base58)
app.get("/pubkey", (req, res) => {
  return res.json({ pubkey_b58: SERVER_PUB_B58 });
});

// basic health
app.get("/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  log.info(`Signer server listening on ${PORT}`);
});