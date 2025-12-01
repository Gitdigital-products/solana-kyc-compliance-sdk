/**
 * Example: Circle API Integration for USDC Transfers with KYC Verification
 * 
 * This example shows how to use Circle's Programmable Wallets API to create a USDC transfer,
 * with a prerequisite KYC check using the GitDigital KYC SDK.
 */

import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { SolanaKYCClient } from '../src/sas-integration';
import { ZKKYCVerifier } from '../src/zk-kyc';

// --- Configuration ---
const CIRCLE_API_BASE_URL = process.env.CIRCLE_API_BASE_URL || 'https://api.circle.com/v1';
const CIRCLE_API_KEY = process.env.CIRCLE_API_KEY!; // Your Circle API key
const SOLANA_RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.mainnet-beta.solana.com';

// Initialize SDK Clients
const connection = new Connection(SOLANA_RPC_URL, 'confirmed');
const kycClient = new SolanaKYCClient(connection, 'mainnet-beta');
const zkVerifier = new ZKKYCVerifier();

/**
 * Main function to create a compliant USDC transfer via Circle API.
 * Checks for a valid KYC attestation before proceeding.
 */
export async function createCompliantUSDCTransfer(
  senderWalletAddress: string,
  recipientWalletAddress: string,
  amountUSDC: string, // e.g., "10.50"
  circleWalletSetId: string, // Your Circle Wallet Set ID
  kycIssuer: string = 'gitdigital' // Expected issuer of the KYC attestation
): Promise<{ transferId: string; status: string }> {
  
  console.log('🚀 Initiating compliant USDC transfer...');

  // --- Step 1: Verify Sender's KYC Status ---
  console.log('\n🔍 Step 1: Verifying sender KYC status via Solana Attestation Service (SAS)...');
  
  // Convert addresses to PublicKey objects
  const senderPubKey = new PublicKey(senderWalletAddress);
  const recipientPubKey = new PublicKey(recipientWalletAddress);
  
  // Verify the sender has a valid, non-revoked KYC attestation from a trusted issuer[citation:2][citation:10]
  const kycStatus = await kycClient.verifySASAttestation(senderPubKey, 'kyc/v1', kycIssuer);
  
  if (!kycStatus.isVerified) {
    throw new Error(`❌ KYC verification failed. Reason: ${kycStatus.reason || 'Attestation not found or invalid.'}`);
  }
  console.log(`✅ Sender KYC verified. Attestation ID: ${kycStatus.attestationId}`);
  
  // --- Step 2: (Optional) Generate a ZK Proof for Privacy-Preserving Verification ---
  console.log('\n🔒 Step 2: Generating privacy-preserving ZK proof (Optional)...');
  // This step is optional but recommended for enhanced privacy, proving KYC status without revealing details[citation:3][citation:6].
  const zkProof = await zkVerifier.generateKYCProof({
    wallet: senderWalletAddress,
    isVerified: true,
    issuer: kycIssuer,
    attestationId: kycStatus.attestationId!
  });
  console.log('✅ ZK proof generated for on-chain verification.');

  // --- Step 3: Prepare Circle API Transfer Request ---
  console.log('\n💸 Step 3: Preparing Circle USDC transfer request...');
  const amountInBaseUnits = Math.floor(parseFloat(amountUSDC) * 1_000_000); // USDC has 6 decimals
  
  const transferRequestBody = {
    source: {
      type: 'wallet',
      walletId: await getSenderCircleWalletId(senderWalletAddress, circleWalletSetId),
    },
    destination: {
      type: 'blockchain',
      address: recipientWalletAddress,
      chain: 'SOL', // Using 'SOL' for Solana mainnet. Use 'SOL-DEVNET' for devnet[citation:1].
      idempotencyKey: `kyc_transfer_${Date.now()}`, // Crucial to prevent duplicate transfers[citation:4]
    },
    amount: {
      amount: amountInBaseUnits.toString(),
      currency: 'USD', // For USDC transfers[citation:8]
    },
    // Attach the KYC attestation ID as metadata for audit and compliance
    metadata: {
      kycAttestationId: kycStatus.attestationId,
      zkProofPublicSignal: zkProof.publicSignals[0], // Store public signal for future verification
      complianceSdk: 'gitdigital-kyc-sdk-v1.0',
    },
  };
  
  // --- Step 4: Call Circle API to Create Transfer ---
  console.log('\n📤 Step 4: Calling Circle API to create transfer...');
  const response = await fetch(`${CIRCLE_API_BASE_URL}/transfers`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${CIRCLE_API_KEY}`,
    },
    body: JSON.stringify(transferRequestBody),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Circle API request failed: ${response.status} - ${errorText}`);
  }

  const transferData = await response.json();
  console.log(`✅ Circle transfer initiated successfully.`);
  console.log(`   Transfer ID: ${transferData.data?.id}`);
  console.log(`   Status: ${transferData.data?.status}`);
  
  // --- Step 5: Monitor Transfer Status (Optional) ---
  console.log('\n📊 Step 5: You can now monitor the transfer status.');
  console.log(`   Use the Circle API or webhooks to track: ${CIRCLE_API_BASE_URL}/transfers/${transferData.data?.id}`);

  return {
    transferId: transferData.data?.id,
    status: transferData.data?.status,
  };
}

/**
 * Helper function to retrieve a wallet's internal Circle ID from the Wallet Set.
 * In a real implementation, you would map Solana addresses to their Circle Wallet IDs.
 */
async function getSenderCircleWalletId(solanaAddress: string, walletSetId: string): Promise<string> {
  // This is a placeholder. Your implementation would likely involve:
  // 1. Calling Circle's 'GET /v1/wallets' endpoint to list wallets in the set[citation:1][citation:4].
  // 2. Finding the wallet where the 'address' field matches the provided solanaAddress.
  // 3. Returning its 'id'.
  console.log(`⚠️  Placeholder: Mapping Solana address ${solanaAddress} to Circle Wallet ID.`);
  // Example API call structure:
  // const walletsResponse = await circleApiClient.listWallets({ walletSetId });
  // const targetWallet = walletsResponse.data.wallets.find(w => w.address === solanaAddress);
  // if (!targetWallet) throw new Error('Sender wallet not found in Circle Wallet Set.');
  // return targetWallet.id;
  
  return 'YOUR_CIRCLE_WALLET_ID_PLACEHOLDER'; // Replace with actual logic
}

/**
 * Function to demonstrate a complete KYC-gated transfer flow.
 */
async function runExample() {
  try {
    // Example parameters. Replace these with real values from your environment.
    const result = await createCompliantUSDCTransfer(
      'FsvS...SenderWalletAddress', // Sender's Solana wallet (must have a SAS KYC attestation)[citation:2]
      'RecipientWalletAddress123...', // Recipient's Solana wallet
      '25.75', // Amount of USDC to send
      'your-circle-wallet-set-id-123', // Your Circle Wallet Set ID[citation:1]
      'gitdigital' // The issuer whose KYC attestation you trust
    );
    
    console.log('\n🎉 Example completed successfully!');
    console.log(`Final Transfer Status: ${result.status}`);
    
  } catch (error) {
    console.error('\n💥 Example failed with error:');
    console.error(error instanceof Error ? error.message : error);
  }
}

// Execute the example if this file is run directly.
if (require.main === module) {
  // Load environment variables
  require('dotenv').config();
  
  if (!process.env.CIRCLE_API_KEY) {
    console.error('❌ Please set the CIRCLE_API_KEY environment variable.');
    process.exit(1);
  }
  
  runExample();
}

export { createCompliantUSDCTransfer, getSenderCircleWalletId };