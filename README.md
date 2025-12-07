
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

## sequence diagram for token transfer flow
```mermaid
sequenceDiagram
    participant UserWallet
    participant SDK
    participant KYCRegistry
    participant RiskEngine
    participant SolanaProgram

    UserWallet->>SDK: transferRequest
    SDK->>KYCRegistry: checkKYC
    SDK->>RiskEngine: getRiskScore
    SDK->>SolanaProgram: invokeTransferHook
    SolanaProgram-->>UserWallet: mint/transferToken
```

