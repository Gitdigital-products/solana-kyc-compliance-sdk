# Jurisdiction Support

The Solana KYC Compliance SDK adapts verification rules based on the user's jurisdiction. This ensures regulatory alignment without requiring developers to manually track global compliance changes.

---

## Supported Regions

### 🇺🇸 United States
- OFAC sanctions screening  
- MSB guidance alignment  
- Age thresholds: 13+, 18+, 21+  
- Enhanced identity verification for financial apps  

### 🇪🇺 European Union
- AMLD5/6 compliance  
- eIDAS‑aligned identity checks  
- GDPR‑aligned data handling  
- PEP screening  

### 🇬🇧 United Kingdom
- FCA‑aligned KYC  
- UK sanctions list  
- Age thresholds: 18+  

### 🇨🇦 Canada
- FINTRAC KYC rules  
- Canadian sanctions lists  
- Identity document validation  

### 🌏 APAC (Japan, Singapore, Australia)
- Regional sanctions lists  
- Local identity document support  
- Age thresholds vary by country  

### 🌎 LATAM
- Regional fintech KYC rules  
- Identity document support  
- Sanctions screening  

---

## How Jurisdiction Logic Works

1. User submits verification  
2. SDK detects jurisdiction  
3. Appropriate rule set is applied  
4. Signed attestation is generated  
5. On‑chain proof includes jurisdiction flags  

---

## Developer Controls

You can override or restrict jurisdictions:

```ts
client.verifyUser({
  wallet,
  jurisdiction: "EU",
  checks: ["identity", "sanctions"],
});
