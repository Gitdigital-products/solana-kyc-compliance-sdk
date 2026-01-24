# Privacy Model

The SDK is designed to maximize user privacy while meeting regulatory requirements across multiple jurisdictions.

---

## Core Principles

### 1. Zero PII On‑Chain
No personal data is ever written to Solana.  
Only hashed, signed, and non‑reversible proofs are stored.

### 2. Minimal Disclosure
Programs receive:
- A boolean: `verified / not verified`
- Jurisdiction flags
- Expiration timestamps

Nothing else.

### 3. Revocable & Expirable
Compliance proofs:
- Auto‑expire  
- Can be revoked  
- Are always re‑verifiable  

### 4. User‑Controlled
Users choose:
- When to verify  
- Which wallet to link  
- When to revoke consent  

---

## Data Stored Off‑Chain

- Identity documents  
- Sanctions screening results  
- Age verification  
- Jurisdictional compliance checks  

All encrypted and access‑controlled.

---

## Data Stored On‑Chain

- `verified: bool`  
- `jurisdiction: u16`  
- `expires_at: i64`  
- `revoked: bool`  
- `attestation_hash: bytes32`

---

## Threat Mitigations

- Replay protection  
- Signature validation  
- Tamper‑proof attestations  
- No PII leakage  
- Jurisdiction‑aware access control  

---

## Summary

The privacy model ensures:
- Maximum user protection  
- Minimum regulatory friction  
- Zero exposure of sensitive data  
- Full compatibility with Solana programs
