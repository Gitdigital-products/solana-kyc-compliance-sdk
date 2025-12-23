
# Solana KYC Compliance SDK

### Purpose
A compliance layer designed to bridge institutional KYC/AML processes with Solana’s token infrastructure.

### Key Features
- **On-chain Whitelist Registry:** Secure, transparent, and auditable list of verified addresses.
- **SDK Integration:** Simple TypeScript client for wallet-level verification and token gating.
- **Regulatory Alignment:** Eases the adoption of compliant Real-World Asset issuance.

### Quick Start
```bash
# Clone the repo
git clone https://github.com/Gitdigital-products/solana-kyc-compliance-sdk.git
cd solana-kyc-compliance-sdk

# Build the Rust program
cd programs/compliance_registry
cargo build-bpf

# Build the SDK
cd ../../sdk/typescript
npm install && npm run build
Open-source SDK for enforcing KYC/AML compliance directly at the token level on Solana using Token Extensions (Transfer Hook &amp; Permanent Delegate). Includes a Rust on-chain program, TypeScript SDK, and Compliance Registry for institutional-grade Real-World Asset (RWA) issuance.

```mermaid
graph LR
    Wallet -->|registerWallet()| SDK
    SDK -->|verifyAttestation()| KYCRegistry
    SDK -->|getRiskScore()| RiskEngine
    SDK -->|transfer()| SolanaProgram
```

sequenceDiagram
    participant UserWallet
    participant SDK
    participant KYCRegistry
    participant RiskEngine
    participant SolanaProgram
```mermaid
    UserWallet->>SDK: transferRequest
    SDK->>KYCRegistry: checkKYC
    SDK->>RiskEngine: getRiskScore
    SDK->>SolanaProgram: invokeTransferHook
    SolanaProgram-->>UserWallet: mint/transferToken
```

## ER Diagram compliance SDK scheme 
```mermaid
erDiagram
    Wallet ||--o{ KYCRecord : has
    KYCRecord ||--|| Attestation : links
    Wallet ||--o| RiskProfile : may_have
    TokenAccount ||--|| Wallet : belongs_to
    ComplianceRule ||--|| TokenAccount : applies_to
```
# Solana KYC Compliance SDK

**Mission:** This is an open-source SDK that enables institutions to enforce KYC/AML compliance directly on-chain for Real-World Asset (RWA) tokens using Solana Token Extensions. It is built for token issuers,合规 teams, and institutional developers. *(Stage: Beta / In Development)*

## 🎯 PHASE 1 - CLARITY & SCOPE
**Parent Initiative:** Org-wide Clarity & Core Infra
**Objective:** Formalize the project's mission and establish robust development workflows to support external contributors and enterprise adoption.

### Immediate Actions:
1.  **Roadmap Alignment:** Confirm if this project is a core revenue driver, a supporting infrastructure piece, or an open-source lead generator.
2.  **Set Up Tracking:** Create scoped GitHub Issues using templates for bugs, feature requests (from the community), and internal tasks.
3.  **Secure Pipeline:** Enhance CI/CD (using internal `Checkout` & `Setup-node`) to run Rust/TS tests, security audits (e.g., `cargo-audit`), and linting on every PR.

**Owner:** *[Assign Product/Tech Lead]*
**Roadmap Link:** See the central organizational roadmap in [gitdigital-products.io](https://github.com/Gitdigital-products/gitdigital-products.io)
