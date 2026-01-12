# Solana KYC SDK - Implementation Guide

## 🚀 Quick Start (5 Minutes)

### 1. Installation
```bash
npm install @gitdigital/solana-kyc-sdk
```

2. Basic KYC Verification

```typescript
import { SolanaKYCClient } from '@gitdigital/solana-kyc-sdk';
import { Connection, PublicKey } from '@solana/web3.js';

// Initialize
const connection = new Connection('https://api.devnet.solana.com');
const kycClient = new SolanaKYCClient(connection);

// Verify KYC status
async function checkKYC(userWallet: string) {
  const result = await kycClient.verifyKYC(
    new PublicKey(userWallet),
    'basic' // 'basic' | 'enhanced' | 'verified'
  );
  
  if (result.verified) {
    console.log(`✅ User is KYC verified (Level: ${result.level})`);
    console.log(`Attestation ID: ${result.attestationId}`);
  } else {
    console.log(`❌ User not KYC verified: ${result.reason}`);
  }
}
```

3. KYC-Gated USDC Transfer

```typescript
import { createCompliantUSDCTransfer } from '@gitdigital/solana-kyc-sdk';

// Transfer with KYC check
const transfer = await createCompliantUSDCTransfer({
  sender: 'FsvS...SenderWallet',
  recipient: 'RecipientWallet123...',
  amount: '100.0', // USDC
  kycLevel: 'enhanced'
});
```
console.log(`Transfer created: ${transfer.id}`);


---

📚 Complete Implementation Guide

Chapter 1: Understanding the Architecture

1.1 Core Components


┌─────────────────────────────────────────────────┐
│                Your Application                 │
├─────────────────────────────────────────────────┤
│      GitDigital KYC SDK (TypeScript/JS)        │
├───────────┬───────────┬────────────────────────┤
│  SAS      │   ZK      │      Circle API        │
│ Integration│  Proofs  │     Integration        │
├───────────┴───────────┴────────────────────────┤
│           Solana Blockchain Network            │
└─────────────────────────────────────────────────┘


1.2 Data Flow

1. User Registration → Create SAS attestation
2. Transaction Request → Verify KYC status
3. Privacy Option → Generate ZK proof
4. Payment Processing → Circle API with KYC metadata

1.3 Security Model

· On-chain: SAS attestations (immutable, verifiable)
· Off-chain: ZK proofs (private, efficient)
· Hybrid: Circle API with on-chain verification

Chapter 2: SAS Integration

2.1 Setting Up SAS

Step 1: Configure Connection

```typescript
import { Connection, PublicKey } from '@solana/web3.js';
import { SolanaKYCClient } from '@gitdigital/solana-kyc-sdk';

// For development
const devnetConnection = new Connection(
  'https://api.devnet.solana.com',
  'confirmed'
);

// For production
const mainnetConnection = new Connection(
  process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com',
  'confirmed'
);
```
const kycClient = new SolanaKYCClient(mainnetConnection);


Step 2: Define KYC Schema

```typescript
const kycSchema = {
  name: 'gitdigital_kyc_v1',
  fields: [
    { name: 'wallet_address', type: 'publicKey' },
    { name: 'kyc_level', type: 'string' }, // 'basic' | 'enhanced' | 'verified'
    { name: 'country_code', type: 'string' },
    { name: 'verified_at', type: 'u64' },
    { name: 'expires_at', type: 'u64' },
    { name: 'issuer', type: 'publicKey' },
  ]
};
```
// Register schema (one-time operation)
const schemaId = await kycClient.registerSchema(kycSchema);


2.2 Creating KYC Attestations

For KYC Providers:

```typescript
async function issueKYCAttestation(
  userWallet: PublicKey,
  kycData: KYCData,
  issuerKeypair: Keypair
) {
  const attestationData = {
    wallet_address: userWallet.toBase58(),
    kyc_level: kycData.level,
    country_code: kycData.country,
    verified_at: Math.floor(Date.now() / 1000),
    expires_at: Math.floor(Date.now() / 1000) + (365 * 24 * 60 * 60), // 1 year
    issuer: issuerKeypair.publicKey.toBase58(),
  };

  const attestation = await kycClient.createAttestation({
    schemaId: 'gitdigital_kyc_v1',
    recipient: userWallet,
    data: attestationData,
    issuer: issuerKeypair,
  });

  console.log(`✅ KYC attestation issued: ${attestation.id}`);
  return attestation;
}
```

Example KYC Data:

```typescript
const kycData = {
  level: 'enhanced', // Requires ID verification
  country: 'US',
  requirements: {
    id_verified: true,
    selfie_match: true,
    liveness_check: true,
    address_verified: false, // Optional for 'enhanced'
  }
};
```

2.3 Verifying Attestations

Simple Verification:

```typescript
async function verifyUserKYC(userWallet: PublicKey) {
  const verification = await kycClient.verifyKYC(userWallet);
  
  return {
    verified: verification.verified,
    level: verification.level,
    issuer: verification.issuer,
    expires: new Date(verification.expires * 1000),
    attestationId: verification.attestationId,
  };
}
```

Advanced Verification with Rules:

```typescript
class KYCRules {
  static readonly MINIMUM_LEVELS = {
    defi_trading: 'basic',
    nft_purchases: 'basic',
    cross_border: 'enhanced',
    institutional: 'verified',
  };

  static readonly COUNTRY_RESTRICTIONS = {
    prohibited: ['KP', 'IR', 'SY', 'CU'], // OFAC countries
    enhanced_due_diligence: ['RU', 'BY', 'MM', 'VE'],
  };

  static validate(userKYC: KYCVerification, action: string): ValidationResult {
    // Check level requirement
    const requiredLevel = this.MINIMUM_LEVELS[action];
    if (!this.isLevelSufficient(userKYC.level, requiredLevel)) {
      return { valid: false, reason: 'Insufficient KYC level' };
    }

    // Check country restrictions
    if (this.COUNTRY_RESTRICTIONS.prohibited.includes(userKYC.country)) {
      return { valid: false, reason: 'Restricted country' };
    }

    // Check expiration
    if (userKYC.expires < Date.now() / 1000) {
      return { valid: false, reason: 'KYC expired' };
    }

    return { valid: true };
  }

  private static isLevelSufficient(userLevel: string, requiredLevel: string): boolean {
    const levels = ['basic', 'enhanced', 'verified'];
    return levels.indexOf(userLevel) >= levels.indexOf(requiredLevel);
  }
}
```

Chapter 3: Zero-Knowledge Proofs

3.1 Setting Up ZK Circuits

Circuit Structure:

```circom
// circuits/kyc_verifier.circom
pragma circom 2.0.0;

template KYCVerifier() {
  // Private inputs (known only to user)
  signal input secretSalt;
  signal input isAdult; // 1 = true, 0 = false
  signal input countryCode;
  signal input isSanctioned; // 1 = true, 0 = false
  signal input kycLevel;
  
  // Public inputs (known to everyone)
  signal output meetsRequirements;
  signal output countryApproved;
  signal output kycHash;
  
  // Constraints
  // Must be adult
  isAdult * (1 - isAdult) === 0;
  
  // Must not be sanctioned
  isSanctioned === 0;
  
  // Country must not be restricted
  // (This would have more complex logic in reality)
  countryApproved <== isCountryAllowed(countryCode);
  
  // KYC level must be sufficient
  meetsRequirements <== kycLevel >= 1; // At least level 1
  
  // Hash for verification
  kycHash <== poseidon([secretSalt, isAdult, countryCode, isSanctioned, kycLevel]);
}
```
component main = KYCVerifier();


3.2 Generating ZK Proofs

Client-side Proof Generation:

```typescript
import { ZKKYCVerifier } from '@gitdigital/solana-kyc-sdk';

class ZKProofService {
  private verifier: ZKKYCVerifier;
  
  constructor() {
    this.verifier = new ZKKYCVerifier({
      wasmPath: '/circuits/kyc_verifier.wasm',
      zkeyPath: '/circuits/kyc_final.zkey',
    });
  }

  async generatePrivacyProof(userKYC: PrivateKYCData): Promise<ZKProof> {
    const privateInputs = {
      secretSalt: this.generateSalt(userKYC.wallet),
      isAdult: userKYC.age >= 18 ? 1 : 0,
      countryCode: this.countryToCode(userKYC.country),
      isSanctioned: userKYC.isSanctioned ? 1 : 0,
      kycLevel: this.levelToNumber(userKYC.level),
      walletHash: this.hashWallet(userKYC.wallet),
    };

    const { proof, publicSignals } = await this.verifier.generateProof(privateInputs);
    
    return {
      proof,
      publicSignals,
      commitment: publicSignals[0], // First signal is the commitment
    };
  }

  private generateSalt(wallet: string): string {
    // Generate deterministic salt from wallet + secret
    return hash(wallet + process.env.USER_SECRET);
  }
}
```

3.3 Verifying ZK Proofs

Server-side Verification:

```typescript
class ZKVerificationService {
  async verifyProof(proof: ZKProof, requirements: VerificationRequirements): Promise<boolean> {
    // Verify cryptographic proof
    const proofValid = await this.verifier.verifyProof(
      proof.proof,
      proof.publicSignals
    );
    
    if (!proofValid) {
      return false;
    }
    
    // Check business logic from public signals
    const meetsRequirements = BigInt(proof.publicSignals[1]) === 1n;
    const countryApproved = BigInt(proof.publicSignals[2]) === 1n;
    
    // Additional checks based on requirements
    if (requirements.minLevel) {
      const userLevel = Number(proof.publicSignals[3]);
      if (userLevel < requirements.minLevel) {
        return false;
      }
    }
    
    return meetsRequirements && countryApproved;
  }
}
```

Chapter 4: Circle API Integration

4.1 Setting Up Circle

Configuration:

```typescript
// circle.config.ts
export const circleConfig = {
  // Sandbox for testing
  sandbox: {
    apiKey: process.env.CIRCLE_SANDBOX_API_KEY,
    baseUrl: 'https://api-sandbox.circle.com/v1',
    walletSetId: process.env.SANDBOX_WALLET_SET_ID,
  },
  
  // Production
  production: {
    apiKey: process.env.CIRCLE_PRODUCTION_API_KEY,
    baseUrl: 'https://api.circle.com/v1',
    walletSetId: process.env.PRODUCTION_WALLET_SET_ID,
  },
  
  // Webhook configuration
  webhooks: {
    url: process.env.WEBHOOK_URL,
    secret: process.env.WEBHOOK_SECRET,
  }
};
```

4.2 KYC-Gated Transfers

Complete Transfer Flow:

```typescript
class CompliantTransferService {
  async createKYCVerifiedTransfer(params: TransferParams): Promise<TransferResult> {
    // Step 1: Verify sender KYC
    const kycCheck = await this.kycClient.verifyKYC(
      new PublicKey(params.sender),
      params.requiredLevel || 'basic'
    );
    
    if (!kycCheck.verified) {
      throw new Error(`KYC verification failed: ${kycCheck.reason}`);
    }
    
    // Step 2: Check AML/CTF
    const amlCheck = await this.amlService.checkTransaction({
      sender: params.sender,
      recipient: params.recipient,
      amount: params.amount,
      currency: params.currency,
    });
    
    if (!amlCheck.approved) {
      throw new Error(`AML check failed: ${amlCheck.reason}`);
    }
    
    // Step 3: Create Circle transfer
    const transfer = await this.circleClient.createTransfer({
      source: {
        type: 'wallet',
        walletId: await this.getCircleWalletId(params.sender),
      },
      destination: {
        type: 'blockchain',
        address: params.recipient,
        chain: params.chain || 'SOL',
      },
      amount: {
        amount: this.toBaseUnits(params.amount, params.currency),
        currency: params.currency,
      },
      metadata: {
        kycAttestationId: kycCheck.attestationId,
        amlCheckId: amlCheck.id,
        purpose: params.purpose,
        sourceOfFunds: params.sourceOfFunds,
      },
      idempotencyKey: `kyc_${Date.now()}_${params.sender}`,
    });
    
    // Step 4: Log for compliance
    await this.complianceLogger.logTransfer({
      transferId: transfer.id,
      sender: params.sender,
      recipient: params.recipient,
      amount: params.amount,
      currency: params.currency,
      kycAttestationId: kycCheck.attestationId,
      timestamp: new Date(),
    });
    
    return {
      transferId: transfer.id,
      status: transfer.status,
      estimatedCompletion: transfer.estimatedCompletion,
    };
  }
}
```
4.3 Travel Rule Compliance

For Transfers > $3,000:

```typescript
class TravelRuleService {
  async handleTravelRuleTransfer(transfer: LargeTransfer): Promise<TravelRuleResult> {
    // Collect required information
    const senderInfo = await this.getSenderInformation(transfer.sender);
    const beneficiaryInfo = await this.getBeneficiaryInformation(transfer.recipient);
    
    // Validate information
    const validation = this.validateTravelRuleInfo(senderInfo, beneficiaryInfo);
    if (!validation.valid) {
      throw new Error(`Travel rule validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Submit to Travel Rule solution
    const submission = await this.travelRuleProvider.submit({
      transfer: {
        amount: transfer.amount,
        currency: transfer.currency,
        timestamp: transfer.timestamp,
      },
      originator: senderInfo,
      beneficiary: beneficiaryInfo,
    });
    
    // Store for regulatory reporting
    await this.travelRuleRepository.save({
      transferId: transfer.id,
      submissionId: submission.id,
      senderInfo,
      beneficiaryInfo,
      submittedAt: new Date(),
    });
    
    return {
      submitted: true,
      submissionId: submission.id,
      requiredActions: submission.requiredActions || [],
    };
  }
}
```

Chapter 5: Integration Patterns

5.1 DeFi Protocol Integration

Lending Protocol Example:

```typescript
class KYCEnabledLendingPool {
  async borrow(user: string, amount: number, asset: string) {
    // Check KYC before allowing borrow
    const kycValid = await this.kycCheck(user, {
      action: 'borrow',
      amount,
      asset,
    });
    
    if (!kycValid) {
      throw new Error('KYC verification required for borrowing');
    }
    
    // Check risk based on KYC level
    const riskLimits = this.getRiskLimits(user);
    if (amount > riskLimits.maxBorrow) {
      throw new Error(`Borrow amount exceeds limit for KYC level ${riskLimits.level}`);
    }
    
    // Proceed with borrow
    return await this.executeBorrow(user, amount, asset);
  }
  
  private async kycCheck(user: string, context: BorrowContext): Promise<boolean> {
    const kyc = await this.kycClient.verifyKYC(new PublicKey(user));
    
    if (!kyc.verified) return false;
    
    // Different rules based on amount
    if (context.amount > 10000) {
      return kyc.level === 'enhanced' || kyc.level === 'verified';
    }
    
    if (context.amount > 100000) {
      return kyc.level === 'verified';
    }
    
    return true; // Small amounts only need basic KYC
  }
}
```

5.2 NFT Marketplace Integration

Marketplace with KYC:

```typescript
class KYCEnabledMarketplace {
  async listNFT(nft: NFT, price: number, seller: string) {
    // Verify seller KYC
    const sellerKYC = await this.verifySellerKYC(seller);
    
    // Some NFTs require enhanced KYC
    if (nft.value > 10000 || nft.category === 'high_value') {
      if (sellerKYC.level !== 'enhanced' && sellerKYC.level !== 'verified') {
        throw new Error('Enhanced KYC required for high-value NFTs');
      }
    }
    
    // List NFT with KYC metadata
    return await this.listNFTWithMetadata(nft, {
      price,
      seller,
      sellerKYCLevel: sellerKYC.level,
      kycAttestationId: sellerKYC.attestationId,
      listedAt: new Date(),
    });
  }
  
  async purchaseNFT(nftId: string, buyer: string) {
    // Verify buyer KYC
    const buyerKYC = await this.verifyBuyerKYC(buyer);
    
    // Check if NFT requires specific KYC
    const nft = await this.getNFT(nftId);
    if (nft.requirements?.minKYCLevel) {
      if (!this.isLevelSufficient(buyerKYC.level, nft.requirements.minKYCLevel)) {
        throw new Error(`NFT requires ${nft.requirements.minKYCLevel} KYC`);
      }
    }
    
    // Execute purchase
    return await this.executePurchase(nftId, buyer, {
      buyerKYCLevel: buyerKYC.level,
      kycAttestationId: buyerKYC.attestationId,
    });
  }
}
```

Chapter 6: Testing Strategy

6.1 Unit Tests

Testing SAS Integration:

```typescript
// test/sas-integration.test.ts
describe('SAS Integration', () => {
  test('should verify valid KYC attestation', async () => {
    const mockAttestation = createMockAttestation({
      wallet: testWallet.publicKey,
      level: 'enhanced',
      issuer: trustedIssuer.publicKey,
      expires: futureTimestamp,
    });
    
    const result = await kycClient.verifyKYC(testWallet.publicKey);
    
    expect(result.verified).toBe(true);
    expect(result.level).toBe('enhanced');
    expect(result.issuer).toBe(trustedIssuer.publicKey.toBase58());
  });
  
  test('should reject expired attestation', async () => {
    const expiredAttestation = createMockAttestation({
      expires: pastTimestamp,
    });
    
    const result = await kycClient.verifyKYC(testWallet.publicKey);
    
    expect(result.verified).toBe(false);
    expect(result.reason).toMatch(/expired/);
  });
});
```

6.2 Integration Tests

End-to-End Flow:

```typescript
// test/integration/kyc-transfer.test.ts
describe('KYC-Gated Transfer Flow', () => {
  test('complete KYC-verified USDC transfer', async () => {
    // Setup: Create KYC attestation
    const kycAttestation = await createKYCAttestation(
      senderWallet,
      { level: 'enhanced', country: 'US' },
      issuerWallet
    );
    
    // Action: Create transfer
    const transfer = await createCompliantUSDCTransfer({
      sender: senderWallet.publicKey.toBase58(),
      recipient: recipientWallet.publicKey.toBase58(),
      amount: '100.0',
      kycLevel: 'enhanced',
    });
    
    // Verify: Transfer created with KYC metadata
    expect(transfer.id).toBeDefined();
    expect(transfer.metadata.kycAttestationId).toBe(kycAttestation.id);
    expect(transfer.status).toBe('pending');
    
    // Monitor: Wait for completion
    const completed = await waitForTransferCompletion(transfer.id);
    expect(completed.status).toBe('complete');
  });
});
```

Chapter 7: Deployment & Monitoring

7.1 Production Deployment

Docker Configuration:

```dockerfile
# Dockerfile
FROM node:18-alpine

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/
COPY circuits/ ./circuits/

# Environment
ENV NODE_ENV=production
ENV PORT=3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node dist/healthcheck.js

EXPOSE 3000

CMD ["node", "dist/index.js"]
```

Kubernetes Deployment:

```yaml
# k8s/deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: kyc-sdk-service
spec:
  replicas: 3
  selector:
    matchLabels:
      app: kyc-sdk
  template:
    metadata:
      labels:
        app: kyc-sdk
    spec:
      containers:
      - name: kyc-sdk
        image: gitdigital/kyc-sdk:latest
        ports:
        - containerPort: 3000
        env:
        - name: SOLANA_RPC_URL
          valueFrom:
            secretKeyRef:
              name: kyc-secrets
              key: solana-rpc-url
        - name: CIRCLE_API_KEY
          valueFrom:
            secretKeyRef:
              name: kyc-secrets
              key: circle-api-key
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

7.2 Monitoring & Alerts

Metrics Dashboard:

```typescript
class KYCMetrics {
  private metrics = {
    verifications: {
      total: 0,
      successful: 0,
      failed: 0,
      byLevel: { basic: 0, enhanced: 0, verified: 0 },
    },
    transfers: {
      total: 0,
      kycGated: 0,
      travelRule: 0,
      rejected: 0,
    },
    performance: {
      avgVerificationTime: 0,
      avgProofGenerationTime: 0,
      errorRate: 0,
    },
  };
  
  async recordVerification(result: VerificationResult) {
    this.metrics.verifications.total++;
    
    if (result.verified) {
      this.metrics.verifications.successful++;
      this.metrics.verifications.byLevel[result.level]++;
    } else {
      this.metrics.verifications.failed++;
    }
    
    // Export to monitoring system
    await this.exportMetrics();
  }
}
```

Alert Configuration:

```yaml
# alerts/rules.yaml
groups:
- name: kyc-sdk-alerts
  rules:
  - alert: HighFailureRate
    expr: rate(kyc_verification_failed_total[5m]) / rate(kyc_verification_total[5m]) > 0.1
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "High KYC verification failure rate"
      description: "Failure rate is {{ $value }}% over last 5 minutes"
  
  - alert: SlowVerification
    expr: histogram_quantile(0.95, rate(kyc_verification_duration_seconds_bucket[5m])) > 3
    for: 10m
    labels:
      severity: warning
    annotations:
      summary: "Slow KYC verification response"
      description: "95th percentile verification time is {{ $value }} seconds"
```

---

🆘 Troubleshooting Guide

Common Issues & Solutions

Issue 1: SAS Attestation Not Found

Symptoms: Error: Attestation not found for wallet
Solutions:

1. Check wallet address is correct
2. Verify attestation exists on-chain:
   ```bash
   solana confirm <transaction_signature>
   ```
3. Ensure correct SAS program ID
4. Check if attestation was revoked

Issue 2: ZK Proof Generation Fails

Symptoms: Error: Witness generation failed
Solutions:

1. Verify circuit compatibility
2. Check input data types
3. Ensure WASM file is loaded
4. Verify proving key exists

Issue 3: Circle API Authentication Error

Symptoms: 401 Unauthorized
Solutions:

1. Verify API key is correct
2. Check key permissions
3. Ensure not using sandbox key in production
4. Verify IP whitelisting

Issue 4: High Latency

Symptoms: Slow verification (>5 seconds)
Solutions:

1. Use dedicated RPC endpoint
2. Implement caching for frequent verifications
3. Use batch operations
4. Consider premium RPC service

---

📈 Performance Optimization

1. Caching Strategy

```typescript
class KYCCache {
  private cache = new Map<string, CachedVerification>();
  
  async getWithCache(wallet: PublicKey): Promise<VerificationResult> {
    const key = wallet.toBase58();
    
    // Check cache
    const cached = this.cache.get(key);
    if (cached && Date.now() < cached.expires) {
      return cached.result;
    }
    
    // Fetch fresh
    const result = await this.fetchFromChain(wallet);
    
    // Cache with TTL based on KYC level
    const ttl = this.getTTL(result.level);
    this.cache.set(key, {
      result,
      expires: Date.now() + ttl,
    });
    
    return result;
  }
  
  private getTTL(level: string): number {
    return {
      'basic': 5 * 60 * 1000,    // 5 minutes
      'enhanced': 30 * 60 * 1000, // 30 minutes
      'verified': 24 * 60 * 60 * 1000, // 24 hours
    }[level];
  }
}
```

2. Batch Operations

```typescript
class BatchKYCHandler {
  async verifyMultiple(wallets: PublicKey[]): Promise<Map<string, VerificationResult>> {
    // Group by likely attestation location
    const batches = this.createBatches(wallets);
    
    const results = new Map();
    
    for (const batch of batches) {
      const batchResults = await this.verifyBatch(batch);
      batchResults.forEach((result, wallet) => {
        results.set(wallet.toBase58(), result);
      });
    }
    
    return results;
  }
}
```

---

🎯 Best Practices

1. Security Best Practices

· Never store private keys in code or environment variables
· Use hardware security modules (HSM) for production
· Implement rate limiting on verification endpoints
· Regular security audits every 6 months
· Bug bounty program for white-hat hackers

2. Compliance Best Practices

· Maintain audit trails for all KYC verifications
· Regular regulatory updates check
· Data minimization - only collect necessary information
· User consent for data processing
· Right to be forgotten implementation

3. Performance Best Practices

· Cache frequently accessed data
· Use connection pooling for RPC calls
· Implement circuit breakers for external services
· Monitor and alert on performance degradation
· Load test before major releases

---

📞 Getting Help

Support Channels

1. Documentation: https://docs.gitdigital.com/solana-kyc-compliance-sdk
2. GitHub Issues: For bugs and feature requests
3. Discord Community: Real-time help from community
4. Enterprise Support: SLA-backed support for businesses

When Asking for Help

Please provide:

1. SDK version
2. Error message and stack trace
3. Code snippet showing the issue
4. Environment details
5. Steps to reproduce

---

Implementation Guide Version: 1.0.0
Last Updated: $(date +%Y-%m-%d)
Maintainer: GitDigital KYC Team

---

Happy Building! 🚀

Your compliance solution is now ready to help build the future of regulated DeFi on Solana.
