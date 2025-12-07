# Solana KYC Compliance SDK - quickstart
 
This repo includes:
- `attestation_registry` Anchor program: issue / revoke / check attestation (SBT-like).
- `transfer_hook` Anchor program: verify_transfer hook implementing:
  - KYC attestation checks (SBT / PDA)
  - AML blacklist check using Merkle proofs against an on-chain root
  - Velocity limits per-wallet
  - Jurisdiction gating
- TypeScript helper templates (client side) to:
  - Issue/revoke/check attestations (use Anchor program client)
  - Build AML Merkle proofs off-chain (server-side)
  - Prepare extra account metas required for Transfer Hook
  - Mint manager template for SPL Token-2022 with Transfer Hook configuration
 
## Security & integration notes
1. **Do not store PII on-chain.** Only hashes + minimal claims belong on-chain (attestation.data_hash).
2. **Issuer authority** must be an HSM-custodied key (or multisig) to avoid a single compromised signer issuing fake attestations.
3. **AML root updates** should be gated by multisig and off-chain audit; merkle root changes are on-chain admin ops.
4. **Velocity tracking** is stored per-wallet (PDA). Consider privacy trade-offs and aggregation strategies.
5. **Audit & test**: fuzz tests, property tests, and slotted replay protection are critical before production.
6. **Gas / rent**: velocity accounts and attestations use rent — you may use rent-exempt PDAs or offload historical telemetry off-chain.