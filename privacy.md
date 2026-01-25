# Privacy

The Solana KYC Compliance SDK is built around a privacy‑first design that ensures no personal data is ever exposed on‑chain or to unauthorized parties.

---

## Privacy Principles

### 1. Zero PII On‑Chain
Only hashed, signed, non‑reversible proofs are stored.

### 2. Minimal Disclosure
Programs receive:
- Verified / not verified  
- Jurisdiction code  
- Expiration timestamp  

No identity data.

### 3. User Consent
Users control:
- When they verify  
- Which wallet they link  
- When they revoke  

### 4. Data Minimization
Only essential data is collected for compliance.

---

## Off‑Chain Data Handling

Stored securely:
- Encrypted identity documents  
- Sanctions screening results  
- Age verification  
- Jurisdiction checks  

---

## On‑Chain Data Handling

Stored publicly:
- `verified` boolean  
- `jurisdiction` code  
- `expires_at` timestamp  
- `revoked` flag  
- `attestation_hash`  

No personal information.

---

## Threat Mitigations

- Replay protection  
- Signature validation  
- Tamper‑proof attestations  
- No PII leakage  
- Jurisdiction‑aware access control  

---

## Summary

The privacy model ensures regulatory compliance without compromising user anonymity or exposing sensitive data.
