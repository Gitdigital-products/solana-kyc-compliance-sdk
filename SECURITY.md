This project is under active development. Use in production only after:

Independent audit

Custom threat modeling

Program ID immutability



---

License

MIT

---

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

# 📄 `docs/releases.md` (Release Strategy)

```md
# Release Strategy

This project follows Semantic Versioning.

## Versions

- `0.x` — Experimental, breaking changes allowed
- `1.0.0` — Stable on-chain interfaces
- `1.x` — Backward-compatible SDK updates

Breaking on-chain changes require a major version bump.

---

## Distribution

- TypeScript SDK published to npm
- Rust crates published to crates.io
- GitHub releases with changelogs

---

## Stability Guarantees

Stable:
- Program instruction interfaces
- Registry schemas
- SDK public APIs

Unstable:
- Internal helpers
- Example implementations

# Security Policy
If you discover a vulnerability, email ricksonlinebusinesses425@outlook.com. Do not file a public issue before it is patched.


# Security Policy

The Solana KYC Compliance SDK is security-sensitive infrastructure.

Please treat it accordingly.

---

## Reporting a Vulnerability

**Do not open public GitHub issues for security concerns.**

If you believe you have found a vulnerability, please report it privately.

**Email:** security@gitdigital.io  
(Or ricks.online.businesses425@gmail.com )

---

## Scope

In scope:
- On-chain programs
- Compliance enforcement logic
- Registry and attestation validation
- SDK interactions with on-chain programs

Out of scope:
- Off-chain KYC providers
- Risk scoring algorithms
- Third-party services

---

## Disclosure Policy

- We aim to acknowledge reports within 72 hours
- Fixes will be prioritized based on severity
- Public disclosure will occur only after mitigation

Thank you for helping keep this project secure.
