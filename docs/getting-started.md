# 📄 `docs/getting-started.md`

```md
# Getting Started

This guide walks through running the Solana KYC Compliance SDK locally and on devnet.

---

## Local Development

### Install Dependencies

- Solana CLI
- Anchor
- Node.js 18+

Verify:
```bash
solana --version
anchor --version
node --version


---

Start Local Validator

solana-test-validator

In another terminal:

anchor build
anchor deploy


---

Run Tests

anchor test

Tests include:

Registry initialization

Compliance enforcement

Transfer rejection and approval flows



---

Devnet Deployment

Configure Solana

solana config set --url https://api.devnet.solana.com

Fund your wallet:

solana airdrop 2


---

Deploy Programs

anchor deploy --provider.cluster devnet

Record deployed program IDs for SDK configuration.


---

Environment Variables

Some examples and SDK components require:

SOLANA_RPC_URL=
WALLET_KEYPAIR_PATH=
KYC_PROVIDER_API_KEY= (optional)


---

First Success Check

Attempt a token transfer without an attestation.

Expected result:

Transaction fails due to compliance enforcement


Add an attestation. Retry the transfer. It succeeds.

That’s the core loop.

---
