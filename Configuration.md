---

# 📘 **configuration.md**

```markdown
# Configuration

The SDK supports flexible configuration for environments, API keys, jurisdiction rules, and verification modes.

---

## Basic Configuration

```ts
const client = new ComplianceClient({
  cluster: "mainnet-beta",
  apiKey: process.env.KYC_API_KEY,
});
