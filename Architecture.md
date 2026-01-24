---

# **📘 architecture.md**

```markdown
# Architecture

The Solana KYC Compliance SDK is built around a hybrid model combining off‑chain verification, on‑chain proofs, and jurisdiction‑aware policy enforcement.

---

## High‑Level Components

### 1. Verification Engine (Off‑Chain)
- Performs identity checks  
- Runs sanctions screening  
- Applies jurisdiction‑specific rules  
- Generates signed compliance attestations  

### 2. Proof Registry (On‑Chain)
A lightweight Solana program storing:
- Verification status  
- Expiration timestamps  
- Jurisdiction flags  
- Revocation state  

### 3. Client SDK (TS + Rust)
- Submits verification requests  
- Fetches on‑chain proofs  
- Validates signatures  
- Integrates with Anchor programs  

---

## Data Flow

1. **User submits verification**  
2. **Off‑chain engine validates identity**  
3. **Engine signs a compliance attestation**  
4. **Attestation is written to Solana**  
5. **Your program checks the proof**  
6. **Access is granted or denied**

---

## Why This Architecture Works

- **Fast**: On‑chain footprint is minimal  
- **Private**: No PII stored on Solana  
- **Composable**: Works with any Solana program  
- **Grant‑Ready**: Aligns with regulatory expectations  
- **Jurisdiction‑Aware**: Rules adapt automatically  

---

## Diagram (Textual)
