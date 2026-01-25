# FAQ

Common questions about the Solana KYC Compliance SDK.

---

## Does the SDK store personal data on‑chain?

No. Only hashed, signed, non‑reversible proofs are stored.

---

## Which jurisdictions are supported?

US, EU, UK, Canada, APAC, LATAM, and more.  
See **Jurisdiction Support** for details.

---

## Can I enforce jurisdiction inside my Solana program?

Yes.

```rust
require!(proof.jurisdiction == US, CustomError::InvalidJurisdiction);
