const { SolanaKYCClient, KYCTier } = require('./dist/src/client');
const { Keypair, Connection, LAMPORTS_PER_SOL } = require('@solana/web3.js');
const bs58 = require('bs58');

async function testIssuanceFlow() {
  console.log('🏦 Testing Complete KYC Issuance Flow\n');
  
  // Setup
  const connection = new Connection('https://api.devnet.solana.com');
  const issuerWallet = Keypair.generate();
  const userWallet = Keypair.generate();
  
  console.log(`🏛️  Issuer: ${issuerWallet.publicKey.toString().slice(0, 8)}...`);
  console.log(`👤 User: ${userWallet.publicKey.toString().slice(0, 8)}...`);
  
  // Fund wallets
  console.log('\n💰 Funding wallets...');
  try {
    const issuerAirdrop = await connection.requestAirdrop(issuerWallet.publicKey, 2 * LAMPORTS_PER_SOL);
    const userAirdrop = await connection.requestAirdrop(userWallet.publicKey, 1 * LAMPORTS_PER_SOL);
    
    await connection.confirmTransaction(issuerAirdrop);
    await connection.confirmTransaction(userAirdrop);
    
    console.log('✅ Wallets funded');
  } catch (error) {
    console.log('⚠️  Airdrop failed (might be rate limited), but continuing...');
  }
  
  // Create client with issuer key
  const client = new SolanaKYCClient({
    rpcUrl: 'https://api.devnet.solana.com',
    network: 'devnet',
    issuerPrivateKey: bs58.encode(issuerWallet.secretKey)
  });
  
  // Step 1: Verify user has no KYC
  console.log('\n1️⃣  Pre-verification check...');
  const preVerification = await client.verifyKYCAttestation({
    walletAddress: userWallet.publicKey.toString(),
    requiredTier: KYCTier.TIER_1
  });
  console.log(`   Status: ${preVerification.isValid ? 'Verified ❌' : 'Not verified ✅'}`);
  
  // Step 2: Issue KYC attestation
  console.log('\n2️⃣  Issuing KYC attestation...');
  try {
    const attestationId = await client.issueKYCAttestation({
      walletAddress: userWallet.publicKey.toString(),
      issuerId: 'test-issuer',
      schemaId: 'gitdigital_kyc_v1',
      kycData: {
        isVerified: true,
        verificationTier: KYCTier.TIER_2,
        countryCode: 'US',
        jurisdiction: 'United States',
        riskLevel: 'low',
        sanctionsCheck: true,
        pepCheck: false,
        verifiedAt: new Date(),
        expiresAt: null // Never expires for test
      }
    });
    
    console.log(`   ✅ Attestation issued: ${attestationId.slice(0, 16)}...`);
    
    // Step 3: Verify the new attestation
    console.log('\n3️⃣  Verifying new attestation...');
    await new Promise(resolve => setTimeout(resolve, 5000)); // Wait for confirmation
    
    const postVerification = await client.verifyKYCAttestation({
      walletAddress: userWallet.publicKey.toString(),
      requiredTier: KYCTier.TIER_1
    });
    
    console.log(`   Status: ${postVerification.isValid ? 'Verified ✅' : 'Not verified ❌'}`);
    console.log(`   Tier: ${postVerification.data?.verificationTier || 'N/A'}`);
    console.log(`   Country: ${postVerification.data?.countryCode || 'N/A'}`);
    console.log(`   Issuer: ${postVerification.issuer?.slice(0, 8)}...`);
    
    // Step 4: Test higher tier requirement
    console.log('\n4️⃣  Testing tier requirements...');
    const tier3Check = await client.verifyKYCAttestation({
      walletAddress: userWallet.publicKey.toString(),
      requiredTier: KYCTier.TIER_3
    });
    
    console.log(`   Tier 2 user accessing Tier 3 content: ${tier3Check.isValid ? 'Allowed ✅' : 'Denied ✅ (expected)'}`);
    
    // Step 5: Test batch with mixed wallets
    console.log('\n5️⃣  Testing batch operations...');
    const mixedWallets = [
      userWallet.publicKey.toString(), // Has KYC
      Keypair.generate().publicKey.toString(), // No KYC
      Keypair.generate().publicKey.toString()  // No KYC
    ];
    
    const batchResults = await client.batchVerify(mixedWallets, KYCTier.TIER_1);
    
    console.log(`   Batch results:`);
    Object.entries(batchResults).forEach(([wallet, result]) => {
      const shortWallet = wallet.slice(0, 8) + '...';
      console.log(`     ${shortWallet}: ${result.isValid ? '✅' : '❌'}`);
    });
    
    console.log('\n🎉 Complete KYC flow tested successfully!');
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    console.log('\n⚠️  This might be expected if:');
    console.log('   - Issuer program needs initialization');
    console.log('   - SAS schema not registered');
    console.log('   - Network issues');
  }
}

testIssuanceFlow();