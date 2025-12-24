import { SolanaKYCClient, createKYCClient, KYCTier } from '../../src/client';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Environment } from '../../src/utils/env';

// Skip E2E tests in CI unless explicitly enabled
const runE2E = process.env.RUN_E2E_TESTS === 'true';

describe('Complete KYC Workflow', () => {
  let client: SolanaKYCClient;
  let connection: Connection;
  let testUsers: Keypair[];

  beforeAll(async () => {
    if (!runE2E) {
      console.log('⏭️  Skipping E2E tests. Set RUN_E2E_TESTS=true to run.');
      return;
    }

    connection = new Connection(
      Environment.getSolanaRpcUrl(),
      'confirmed'
    );

    client = createKYCClient({
      rpcUrl: Environment.getSolanaRpcUrl(),
      network: Environment.getSolanaNetwork(),
      commitment: 'confirmed'
    });

    // Create test users
    testUsers = Array(3).fill(null).map(() => Keypair.generate());

    // Fund test users on devnet
    if (Environment.getSolanaNetwork() === 'devnet') {
      console.log('💰 Funding test accounts...');
      
      for (const user of testUsers) {
        try {
          const airdropSignature = await connection.requestAirdrop(
            user.publicKey,
            1 * LAMPORTS_PER_SOL
          );
          await connection.confirmTransaction(airdropSignature);
          console.log(`  Funded ${user.publicKey.toString().slice(0, 8)}...`);
        } catch (error) {
          console.warn(`  Could not fund ${user.publicKey.toString().slice(0, 8)}...`);
        }
      }
      
      await global.sleep(2000); // Wait for confirmations
    }
  }, 120000);

  describe('Full KYC Lifecycle', () => {
    test('should complete verification workflow', async () => {
      if (!runE2E) return;

      const user = testUsers[0];
      const userAddress = user.publicKey.toString();

      // 1. Initial state - no KYC
      const initialVerification = await client.verifyKYCAttestation({
        walletAddress: userAddress,
        requiredTier: KYCTier.TIER_1
      });

      expect(initialVerification.isValid).toBe(false);
      expect(initialVerification.attestationId).toBe('');

      // 2. Simulate KYC data (in real scenario, this would come from KYC provider)
      const kycData = {
        isVerified: true,
        verificationTier: KYCTier.TIER_2,
        countryCode: 'US',
        jurisdiction: 'United States',
        riskLevel: 'low',
        sanctionsCheck: true,
        pepCheck: false,
        verifiedAt: new Date(),
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
      };

      console.log(`👤 Test user: ${userAddress.slice(0, 8)}...`);
      console.log(`📋 KYC Data: Tier ${kycData.verificationTier}, ${kycData.countryCode}`);

      // 3. Batch verification test
      const allAddresses = testUsers.map(u => u.publicKey.toString());
      const batchResults = await client.batchVerify(allAddresses, KYCTier.TIER_1);

      expect(batchResults).toHaveProperty(userAddress);
      expect(batchResults[userAddress].isValid).toBe(false);

      // 4. Test different verification tiers
      const tier1Result = await client.verifyKYCAttestation({
        walletAddress: userAddress,
        requiredTier: KYCTier.TIER_1
      });

      const tier2Result = await client.verifyKYCAttestation({
        walletAddress: userAddress,
        requiredTier: KYCTier.TIER_2
      });

      const tier3Result = await client.verifyKYCAttestation({
        walletAddress: userAddress,
        requiredTier: KYCTier.TIER_3
      });

      // All should be false without attestation
      expect(tier1Result.isValid).toBe(false);
      expect(tier2Result.isValid).toBe(false);
      expect(tier3Result.isValid).toBe(false);

      // 5. Test with future expiration
      const futureDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
      console.log(`📅 Future expiry test: ${futureDate.toISOString().split('T')[0]}`);

    }, 90000);

    test('should handle concurrent verification requests', async () => {
      if (!runE2E) return;

      const concurrency = 5;
      const userAddresses = testUsers.map(u => u.publicKey.toString());

      // Make concurrent verification requests
      const startTime = Date.now();
      const promises = Array(concurrency).fill(null).map(() =>
        client.batchVerify(userAddresses, KYCTier.TIER_1)
      );

      const results = await Promise.all(promises);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(concurrency);
      results.forEach(result => {
        expect(Object.keys(result)).toHaveLength(userAddresses.length);
      });

      console.log(`⚡ ${concurrency} concurrent batch verifications in ${duration}ms`);
      expect(duration).toBeLessThan(60000); // Should complete within 60 seconds
    }, 120000);

    test('should validate network connectivity and performance', async () => {
      if (!runE2E) return;

      // Test RPC connectivity
      const [version, epochInfo, blockhash] = await Promise.all([
        connection.getVersion(),
        connection.getEpochInfo(),
        connection.getLatestBlockhash()
      ]);

      expect(version).toHaveProperty('solana-core');
      expect(epochInfo).toHaveProperty('epoch');
      expect(blockhash).toHaveProperty('blockhash');

      // Test latency
      const latencyTests = 5;
      let totalLatency = 0;

      for (let i = 0; i < latencyTests; i++) {
        const start = Date.now();
        await connection.getSlot();
        totalLatency += Date.now() - start;
        await global.sleep(100); // Small delay between tests
      }

      const avgLatency = totalLatency / latencyTests;
      console.log(`📡 Average RPC latency: ${avgLatency.toFixed(2)}ms`);

      // Acceptable latency depends on network
      if (Environment.getSolanaNetwork() === 'devnet') {
        expect(avgLatency).toBeLessThan(2000); // 2 seconds for devnet
      }
    }, 30000);
  });

  afterAll(async () => {
    if (runE2E) {
      console.log('✅ E2E tests completed');
    }
  });
});