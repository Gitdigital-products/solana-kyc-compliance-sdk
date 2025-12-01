# Solana KYC Compliance SDK - Integration Guide

## Quick Start

```typescript
import { SolanaKYCClient, ZKKYCVerifier } from '@gitdigital/solana-kyc-sdk';
import { Connection } from '@solana/web3.js';

// Initialize
const connection = new Connection('https://api.devnet.solana.com');
const kycClient = new SolanaKYCClient(connection);

// Check KYC status
const isVerified = await kycClient.verifyKycAttestation(
  userWalletAddress,
  'basic' // 'basic' | 'enhanced' | 'verified'
);