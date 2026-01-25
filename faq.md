📘 faq.md

`markdown

FAQ

Common questions about the Solana KYC Compliance SDK.

---

Does the SDK store personal data on‑chain?

No. Only hashed, signed, non‑reversible proofs are stored.

---

Which jurisdictions are supported?

US, EU, UK, Canada, APAC, LATAM, and more.  
See Jurisdiction Support for details.

---

Can I enforce jurisdiction inside my Solana program?

Yes.

`rust
require!(proof.jurisdiction == US, CustomError::InvalidJurisdiction);
`

---

How long do proofs last?

Expiration varies by jurisdiction and verification type.

---

Can users revoke their verification?

Yes. Revocation is supported both off‑chain and on‑chain.

---

Does this work with Anchor?

Yes — the SDK is fully compatible with Anchor programs.

---

Is this grant‑ready?

Yes. The SDK includes:
- Compliance model  
- Privacy model  
- Architecture  
- Audit readiness  
- API reference  

---

Does this expose any PII?

No. All PII stays off‑chain and encrypted.

---

Can I customize verification checks?

Yes — identity, sanctions, age, and enhanced checks are all configurable.

---

Summary

This FAQ covers the most common questions developers and auditors ask when integrating the SDK.
`
