import { SolanaKYCClient, KYCTier } from '../../src/client';
import { Connection, Keypair, LAMPORTS_PER_SOL } from '@solana/web3.js';
import { Environment } from '../../src/utils/env';

describe('KYC Flow Integration', () => {
  let client: SolanaKYCClient;
  let connection: Connection;
  let testUser: Keypair;
  let testIssuer: Keypair;

  beforeAll(async () => {
    connection = new Connection(
      Environment.getSolanaRpcUrl(),
      Environment.getCommitment()
    );

    client = new SolanaKYCClient({
      rpcUrl: Environment.getSolanaRpcUrl(),
      network: Environment.getSolanaNetwork(),
      commitment: Environment.getCommitment()
    });

    // Generate test accounts
    testUser = Keypair.generate();
    testIssuer = Keypair.generate();

    // Fund test accounts (devnet only)
    if (Environment.getSolanaNetwork() === 'devnet') {
      try {
        const airdropSignature = await connection.requestAirdrop(
          testUser.publicKey,
          2 * LAMPORTS_PER_SOL
        );
        await connection.confirmTransaction(airdropSignature);
        
        console.log(`💰 Funded test user: ${testUser.publicKey.toString()}`);
      } catch (error) {
        console.warn('⚠️ Could not fund test accounts. Tests may fail.');
      }
    }
  }, 60000);

  describe('End-to-End KYC Flow', () => {
    test('should verify non-existent attestation', async () => {
      const result = await client.verifyKYCAttestation({
        walletAddress: testUser.publicKey.toString(),
        requiredTier: KYCTier.TIER_1
      });

      expect(result.isValid).toBe(false);
      expect(result.attestationId).toBe('');
    });

    test('should handle issuer operations with private key', async () => {
      // This test requires issuer private key
      const issuerClient = new SolanaKYCClient({
        rpcUrl: Environment.getSolanaRpcUrl(),
        network: Environment.getSolanaNetwork(),
        issuerPrivateKey: Buffer.from(testIssuer.secretKey).toString('base64')
      });

      // Try to issue attestation (will fail without proper setup, but tests error handling)
      await expect(
        issuerClient.issueKYCAttestation({
          walletAddress: testUser.publicKey.toString(),
          issuerId: 'test-issuer',
          schemaId: 'gitdigital_kyc_v1',
          kycData: {
            isVerified: true,
            verificationTier: KYCTier.TIER_2,
            countryCode: 'US'
          }
        })
      ).rejects.toThrow(); // Should throw because issuer isn't registered
    }, 30000);

    test('should batch verify multiple wallets efficiently', async () => {
      const wallets = Array(5)
        .fill(null)
        .map(() => Keypair.generate().publicKey.toString());

      const startTime = Date.now();
      const results = await client.batchVerify(wallets, KYCTier.TIER_1);
      const duration = Date.now() - startTime;

      expect(Object.keys(results)).toHaveLength(wallets.length);
      expect(duration).toBeLessThan(30000); // Should complete within 30 seconds
      
      // All should be invalid since no attestations exist
      Object.values(results).forEach(result => {
        expect(result.isValid).toBe(false);
      });
    }, 45000);
  });

  describe('Network Operations', () => {
    test('should connect to Solana RPC', async () => {
      const version = await connection.getVersion();
      expect(version).toHaveProperty('solana-core');
      expect(typeof version['solana-core']).toBe('string');
    });

    test('should get recent blockhash', async () => {
      const blockhash = await connection.getLatestBlockhash();
      expect(blockhash).toHaveProperty('blockhash');
      expect(blockhash).toHaveProperty('lastValidBlockHeight');
      expect(typeof blockhash.blockhash).toBe('string');
      expect(blockhash.blockhash.length).toBeGreaterThan(0);
    });

    test('should handle network latency gracefully', async () => {
      const startTime = Date.now();
      
      // Multiple parallel requests to test concurrency
      const requests = Array(3).fill(null).map(() => 
        connection.getEpochInfo()
      );

      const results = await Promise.all(requests);
      const duration = Date.now() - startTime;

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result).toHaveProperty('epoch');
        expect(result).toHaveProperty('slotIndex');
      });

      console.log(`⏱️  Parallel RPC requests completed in ${duration}ms`);
    }, 15000);
  });

  describe('Error Recovery', () => {
    test('should recover from RPC timeout', async () => {
      // Create a connection with very short timeout
      const fastConnection = new Connection(
        Environment.getSolanaRpcUrl(),
        {
          commitment: 'processed',
          confirmTransactionInitialTimeout: 1000 // 1 second timeout
        }
      );

      const fastClient = new SolanaKYCClient({
        rpcUrl: Environment.getSolanaRpcUrl(),
        network: Environment.getSolanaNetwork(),
        commitment: 'processed'
      });

      // This should either succeed quickly or timeout gracefully
      try {
        const result = await fastClient.verifyKYCAttestation({
          walletAddress: testUser.publicKey.toString(),
          requiredTier: KYCTier.TIER_1
        });
        expect(result).toHaveProperty('isValid');
      } catch (error) {
        // Timeout is acceptable
        expect(error.message).toMatch(/(timeout|Timeout)/i);
      }
    }, 10000);

    test('should handle rate limiting', async () => {
      // Make multiple rapid requests
      const promises = Array(10).fill(null).map((_, i) => 
        client.verifyKYCAttestation({
          walletAddress: Keypair.generate().publicKey.toString(),
          requiredTier: KYCTier.TIER_1
        }).catch(error => error)
      );

      const results = await Promise.all(promises);
      
      // Count successes vs failures
      const successes = results.filter(r => !(r instanceof Error));
      const failures = results.filter(r => r instanceof Error);

      console.log(`📊 Rate limit test: ${successes.length} successes, ${failures.length} failures`);
      
      // Should have at least some successes
      expect(successes.length).toBeGreaterThan(0);
    }, 30000);
  });

  afterAll(async () => {
    // Cleanup
    if (connection) {
      // Close any open subscriptions
    }
  });
});