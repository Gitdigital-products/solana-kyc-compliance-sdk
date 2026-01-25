---

# 📘 **api-reference.md**

```markdown
# API Reference

This page provides detailed reference documentation for all SDK methods, parameters, and return types.

---

## `verifyUser(options)`

Triggers a verification flow.

### Parameters

| Field | Type | Description |
|-------|------|-------------|
| `wallet` | `PublicKey` | User wallet |
| `jurisdiction` | `string` | Region code (e.g., "US", "EU") |
| `checks` | `string[]` | identity, sanctions, age, enhanced |

### Returns

`Promise<VerificationResult>`

---

## `getOnChainProof(wallet)`

Fetches the user's on‑chain compliance proof.

### Returns

`Promise<OnChainProof | null>`

---

## `isVerified(wallet)`

Returns a boolean indicating verification status.

---

## `revoke(wallet)`

Revokes the user's compliance proof.

---

## `ComplianceClient(options)`

### Options

| Field | Type | Description |
|-------|------|-------------|
| `cluster` | string | Solana cluster |
| `apiKey` | string | Verification engine key |
| `endpoint` | string | Custom RPC endpoint |
| `logging` | boolean | Enable debug logs |

---

## Error Codes

| Code | Meaning |
|------|---------|
| `ERR_INVALID_JURISDICTION` | Unsupported region |
| `ERR_VERIFICATION_FAILED` | Identity or sanctions failure |
| `ERR_PROOF_NOT_FOUND` | No on‑chain proof exists |
| `ERR_PROOF_EXPIRED` | Proof expired |
| `ERR_PROOF_REVOKED` | Proof revoked |

---

## Summary

This reference provides everything needed to integrate the SDK into production‑grade Solana applications.
