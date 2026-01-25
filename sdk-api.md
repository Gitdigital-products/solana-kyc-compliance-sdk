# SDK API Overview

The Solana KYC Compliance SDK exposes a clean, modular API for verification, proof retrieval, jurisdiction handling, and on‑chain validation.

This page provides a high‑level overview of the available classes, methods, and data structures.

---

## Core Classes

### `ComplianceClient`
Primary interface for interacting with the verification engine and on‑chain proof registry.

```ts
const client = new ComplianceClient({
  cluster: "mainnet-beta",
  apiKey: process.env.KYC_API_KEY,
});
