import { SolanaKYCClient } from '../../src/client';
import { Connection, Keypair } from '@solana/web3.js';
import { Environment } from '../../src/utils/env';

describe('SolanaKYCClient', () => {
  let client: SolanaKYCClient;
  let testWallet: Keypair;

  beforeAll(() => {
    testWallet = Keypair.generate();
    
    client = new SolanaKYCClient({
      rpcUrl: Environment.getSolanaRpcUrl(),
      network: Environment.getSolanaNetwork(),
      commitment: Environment.getCommitment()
    });
  });

  describe('Initialization', () => {
    test('should create client with valid configuration', () => {
      expect(client).toBeInstanceOf(SolanaKYCClient);
      expect(client.connection).toBeDefined();
    });

    test('should throw error with invalid RPC URL', () => {
      expect(() => new SolanaKYCClient({
        rpcUrl: 'invalid-url',
        network: 'devnet'
      })).toThrow();
    });
  });

  describe('Configuration', () => {
    test('should use default commitment if not specified', () => {
      const client = new SolanaKYCClient({
        rpcUrl: Environment.getSolanaRpcUrl(),
        network: 'devnet'
      });
      expect(client.connection.commitment).toBe('confirmed');
    });

    test('should accept custom commitment', () => {
      const client = new SolanaKYCClient({
        rpcUrl: Environment.getSolanaRpcUrl(),
        network: 'devnet',
        commitment: 'finalized'
      });
      expect(client.connection.commitment).toBe('finalized');
    });
  });

  describe('Error Handling', () => {
    test('should handle invalid wallet addresses', async () => {
      await expect(
        client.verifyKYCAttestation({
          walletAddress: 'invalid-address',
          requiredTier: 1
        })
      ).rejects.toThrow();
    });

    test('should handle RPC connection errors', async () => {
      const invalidClient = new SolanaKYCClient({
        rpcUrl: 'https://invalid.rpc.url',
        network: 'devnet'
      });

      await expect(
        invalidClient.verifyKYCAttestation({
          walletAddress: testWallet.publicKey.toString(),
          requiredTier: 1
        })
      ).rejects.toThrow();
    });
  });

  describe('Batch Operations', () => {
    test('should handle empty wallet array', async () => {
      const results = await client.batchVerify([], 1);
      expect(results).toEqual({});
    });

    test('should process multiple wallets', async () => {
      const wallets = [
        testWallet.publicKey.toString(),
        Keypair.generate().publicKey.toString(),
        Keypair.generate().publicKey.toString()
      ];

      const results = await client.batchVerify(wallets, 1);
      
      expect(Object.keys(results)).toHaveLength(wallets.length);
      wallets.forEach(wallet => {
        expect(results[wallet]).toBeDefined();
        expect(results[wallet]).toHaveProperty('isValid');
        expect(typeof results[wallet].isValid).toBe('boolean');
      });
    }, 30000);
  });

  describe('Schema Validation', () => {
    test('should validate KYC schema structure', () => {
      const { KYC_SCHEMA_ID, KYCAttestationSchema } = require('../../src/types/schema');
      
      expect(KYC_SCHEMA_ID).toBe('gitdigital_kyc_v1');
      expect(KYCAttestationSchema).toHaveProperty('name');
      expect(KYCAttestationSchema).toHaveProperty('version');
      expect(KYCAttestationSchema).toHaveProperty('schema');
      expect(KYCAttestationSchema).toHaveProperty('required');
    });

    test('should have required KYC fields', () => {
      const { KYCAttestationSchema } = require('../../src/types/schema');
      
      expect(KYCAttestationSchema.required).toContain('isVerified');
      expect(KYCAttestationSchema.required).toContain('verificationTier');
      expect(KYCAttestationSchema.required).toContain('countryCode');
      expect(KYCAttestationSchema.required).toContain('verifiedAt');
    });
  });
});