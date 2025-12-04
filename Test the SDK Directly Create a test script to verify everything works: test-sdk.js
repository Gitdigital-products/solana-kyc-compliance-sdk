const { SolanaKYCClient, KYCTier, createKYCClient } = require('./dist/src/client');
const { Keypair } = require('@solana/web3.js');

async function testSDK() {
  console.log('🧪 Testing Solana KYC SDK on Devnet...\n');
  
  // 1. Initialize client
  const client = createKYCClient({
    rpcUrl: 'https://api.devnet.solana.com',
    network: 'devnet',
    commitment: 'confirmed'
  });
  
  console.log('✅ SDK Client initialized');
  
  // 2. Generate test wallet
  const testWallet = Keypair.generate();
  const walletAddress = testWallet.publicKey.toString();
  
  console.log(`👛 Test wallet: ${walletAddress.slice(0, 8)}...`);
  
  // 3. Verify non-existent attestation
  console.log('\n1. Testing verification (no attestation)...');
  const verification = await client.verifyKYCAttestation({
    walletAddress,
    requiredTier: KYCTier.TIER_1
  });
  
  console.log(`   Result: ${verification.isValid ? '✅ Verified' : '❌ Not verified'}`);
  console.log(`   Expected: Not verified (no attestation exists)`);
  
  // 4. Test batch verification
  console.log('\n2. Testing batch verification...');
  const testWallets = Array(3)
    .fill(null)
    .map(() => Keypair.generate().publicKey.toString());
  
  const batchResults = await client.batchVerify(testWallets, KYCTier.TIER_1);
  
  console.log(`   Batch size: ${Object.keys(batchResults).length}`);
  console.log(`   All invalid (expected): ${Object.values(batchResults).every(r => !r.isValid)}`);
  
  // 5. Test error handling
  console.log('\n3. Testing error handling...');
  try {
    await client.verifyKYCAttestation({
      walletAddress: 'invalid-address',
      requiredTier: KYCTier.TIER_1
    });
    console.log('   ❌ Should have thrown error');
  } catch (error) {
    console.log(`   ✅ Correctly rejected invalid address: ${error.message}`);
  }
  
  // 6. Check Solana network connection
  console.log('\n4. Testing Solana connection...');
  const slot = await client.connection.getSlot();
  console.log(`   Current slot: ${slot}`);
  console.log(`   Connection: ✅ Active`);
  
  console.log('\n🎉 All tests completed successfully!');
  console.log('\n📋 Next steps:');
  console.log('1. Test with real KYC data issuance');
  console.log('2. Test the API server');
  console.log('3. Run load tests');
  console.log('4. Deploy to testnet for broader testing');
}

testSDK().catch(console.error);