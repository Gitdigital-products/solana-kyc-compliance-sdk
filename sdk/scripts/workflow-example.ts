#!/usr/bin/env ts-node
/**
 * Complete workflow example for the KYC Compliance SDK.
 * Run with: npx ts-node scripts/workflow-example.ts
 */

import { ComplianceSDK } from '../src/compliance-sdk';
import { Connection, Keypair, clusterApiUrl, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { WalletNotConnectedError, TransferDeniedByHookError } from '../src/errors';

async function main() {
  console.log('🚀 Starting KYC Compliance SDK Workflow Example\n');
  
  // Configuration
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const programId = new PublicKey('YOUR_PROGRAM_ID_HERE');
  
  // Create test wallets
  const issuer = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();
  
  console.log('📋 Wallet Addresses:');
  console.log(`  Issuer:  ${issuer.publicKey.toBase58()}`);
  console.log(`  User 1:  ${user1.publicKey.toBase58()}`);
  console.log(`  User 2:  ${user2.publicKey.toBase58()}`);
  
  // Initialize SDK
  const sdk = new ComplianceSDK({ connection, programId });
  console.log('\n✅ SDK Initialized');
  
  try {
    // Example 1: Initialize a compliant mint
    console.log('\n1️⃣  Initializing Compliant Mint...');
    const mintTx = await sdk.initializeCompliantMint({
      payer: issuer,
      mintAuthority: issuer.publicKey,
      freezeAuthority: issuer.publicKey,
      decimals: 6,
      initialKycData: {
        kycProvider: 'veriff',
        requiredLevel: 'basic',
        expirationDays: 90,
        jurisdiction: ['US', 'EU'],
      },
    });
    
    console.log(`   Mint Transaction: ${mintTx}`);
    
    // Check status
    await new Promise(resolve => setTimeout(resolve, 5000));
    const mintStatus = await sdk.checkTransferStatus(mintTx);
    console.log(`   Mint Status: ${mintStatus.status}`);
    
    // Example 2: Attempt transfer without KYC (should fail)
    console.log('\n2️⃣  Attempting Transfer Without KYC...');
    try {
      const transferTx = await sdk.transferCheckedWithHook({
        source: user1.publicKey,
        mint: issuer.publicKey, // Using issuer as placeholder mint
        destination: user2.publicKey,
        owner: user1,
        amount: 100,
        kycProof: [],
      });
      console.log(`   ❌ Transfer unexpectedly succeeded: ${transferTx}`);
    } catch (error) {
      if (error instanceof TransferDeniedByHookError) {
        console.log(`   ✅ Transfer correctly denied: ${error.message}`);
      } else {
        console.log(`   ❌ Unexpected error: ${error.message}`);
      }
    }
    
    // Example 3: Transfer with valid KYC
    console.log('\n3️⃣  Attempting Transfer With Valid KYC...');
    const transferWithKycTx = await sdk.transferCheckedWithHook({
      source: user1.publicKey,
      mint: issuer.publicKey,
      destination: user2.publicKey,
      owner: user1,
      amount: 50,
      kycProof: [{
        provider: 'veriff',
        sessionId: 'valid_session_123',
        timestamp: Date.now(),
        signature: '0xvalid_signature_here',
        data: {
          level: 'basic',
          expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000,
          jurisdiction: 'US',
        },
      }],
    });
    
    console.log(`   Transfer Transaction: ${transferWithKycTx}`);
    
    // Check transfer status
    const transferStatus = await sdk.checkTransferStatus(transferWithKycTx);
    console.log(`   Transfer Status: ${transferStatus.status}`);
    
    if (transferStatus.hookValidation) {
      console.log(`   Hook Validation: ${transferStatus.hookValidation.passed ? '✅ Passed' : '❌ Failed'}`);
      transferStatus.hookValidation.checks.forEach((check, i) => {
        console.log(`     Check ${i + 1} (${check.type}): ${check.passed ? '✅' : '❌'}`);
      });
    }
    
    console.log('\n🎉 Workflow completed successfully!');
    
  } catch (error) {
    console.error('\n❌ Workflow failed:');
    
    if (error instanceof WalletNotConnectedError) {
      console.error('   Please ensure wallets are properly connected');
    } else if (error instanceof TransferDeniedByHookError) {
      console.error(`   Transfer denied: ${error.hookReason || error.message}`);
    } else {
      console.error(`   ${error.message}`);
    }
    
    process.exit(1);
  }
}

// Run the workflow
if (require.main === module) {
  main().catch(console.error);
}