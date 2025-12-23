import { ComplianceSDK } from '@gitdigital/solana-kyc-compliance-sdk';
import { Connection, clusterApiUrl, Keypair } from '@solana/web3.js';
import { WalletNotConnectedError, TransferDeniedByHookError } from '@gitdigital/solana-kyc-compliance-sdk';

async function completeKycWorkflow() {
  const connection = new Connection(clusterApiUrl('devnet'));
  const programId = new PublicKey('YOUR_PROGRAM_ID');
  const sdk = new ComplianceSDK({ connection, programId });
  
  try {
    // 1. Create compliant mint
    console.log('Creating compliant mint...');
    const mintTx = await sdk.initializeCompliantMint({
      payer: wallet,
      mintAuthority: wallet.publicKey,
      decimals: 6,
      initialKycData: {
        kycProvider: 'veriff',
        requiredLevel: 'basic'
      }
    });
    console.log(`Mint created: ${mintTx}`);
    
    // 2. Check transaction status
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for confirmation
    const status = await sdk.checkTransferStatus(mintTx);
    console.log('Mint status:', status);
    
    // 3. Execute compliant transfer
    console.log('Executing compliant transfer...');
    const transferTx = await sdk.transferCheckedWithHook({
      source: sourceTokenAccount,
      mint: compliantMint,
      destination: destTokenAccount,
      owner: wallet,
      amount: 100,
      kycProof: [{
        provider: 'veriff',
        sessionId: 'session_123',
        timestamp: Date.now(),
        signature: '0x...',
        data: { level: 'basic', expiresAt: Date.now() + 90 * 24 * 60 * 60 * 1000 }
      }]
    });
    console.log(`Transfer executed: ${transferTx}`);
    
  } catch (error) {
    if (error instanceof WalletNotConnectedError) {
      console.error('Please connect your wallet');
    } else if (error instanceof TransferDeniedByHookError) {
      console.error('Transfer denied:', error.hookReason);
      // Handle KYC re-verification flow
    } else {
      console.error('Unexpected error:', error);
    }
  }
}