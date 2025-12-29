# 📄 `examples/README.md`

```md
# Examples

These examples demonstrate real-world compliance enforcement flows.

---

## Available Examples

### 1. Compliant Token Transfer
- Create a compliance-gated token
- Attempt transfer without KYC → fails
- Add attestation → succeeds

### 2. Registry Management
- Add/remove approved entities
- Update risk levels
- Freeze and unfreeze accounts

### 3. TypeScript SDK Usage
- Connect wallet
- Query compliance status
- Handle enforcement errors

---

## Running Examples

```bash
cd examples/<example-name>
npm install
npm run start

Each example is intentionally minimal and copy-paste friendly.

---
