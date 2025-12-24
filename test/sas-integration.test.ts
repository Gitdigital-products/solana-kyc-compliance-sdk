/**
 * Solana Attestation Service (SAS) Specific Integration Tests
 * 
 * Tests the lower-level SAS SDK wrapper functions for creating,
 * fetching, and verifying attestations.
 */

import { describe, test, expect, beforeAll } from '@jest/globals';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { SolanaKYCClient, SASAttestation } from '../src/sas-integration';

const DEVNET_RPC = 'https://api.devnet.solana.com';
let connection: Connection;
let sasClient: SolanaKYCClient;
let issuerWallet: Keypair; // Simulates the trusted KYC issuer
let userWallet: Keypair;   // The user receiving the attestation

// SAS Schema for KYC[citation:2][citation:10]
const KYC_SCHEMA_ID = 'kyc_basic_v1.0.0'; // Your defined schema ID
const KYC_SCHEMA_DEFINITION = {
  schema: KYC_SCHEMA_ID,
  fields: [
    { name: 'wallet', type: 'publicKey' },
    { name: 'kycLevel', type: 'string' }, // e.g., 'BASIC', 'ENHANCED'
    { name: 'countryCode', type: 'string' },
    { name: 'timestamp', type: 'u64' },
  ]
};

describe('Solana Attestation Service (SAS) Integration', () => {
  
  beforeAll(() => {
    connection = new Connection(DEVNET_RPC, 'confirmed');
    sasClient = new SolanaKYCClient(connection, 'devnet');
    issuerWallet = Keypair.generate();
    userWallet = Keypair.generate();
    console.log(`🧾 Test Setup Complete. Issuer: ${issuerWallet.publicKey.toBase58()}, User: ${userWallet.publicKey.toBase58()}`);
  });

  describe('Schema Registration and Management', () => {
    test('should register a new KYC schema on SAS devnet', async () => {
      // Note: This is a potentially state-changing transaction and might require signature.
      // In a real test, you might mock this or run it once in a setup script.
      const schemaId = await sasClient.registerSchema(KYC_SCHEMA_DEFINITION, issuerWallet);
      
      expect(schemaId).toBeDefined();
      expect(schemaId).toBe(KYC_SCHEMA_ID); // Should return the ID you defined
      console.log(`✅ Schema registered with ID: ${schemaId}`);
    });

    test('should fetch a registered schema by its ID', async () => {
      const fetchedSchema = await sasClient.getSchema(KYC_SCHEMA_ID);
      
      expect(fetchedSchema).toBeDefined();
      expect(fetchedSchema.schema).toBe(KYC_SCHEMA_ID);
      expect(fetchedSchema.fields).toEqual(KYC_SCHEMA_DEFINITION.fields);
    });
  });

  describe('Attestation Lifecycle', () => {
    let createdAttestationId: string;

    test('should create a KYC attestation for a user wallet', async () => {
      const attestationData = {
        wallet: userWallet.publicKey.toBase58(),
        kycLevel: 'ENHANCED',
        countryCode: 'US',
        timestamp: Date.now(),
      };

      const attestation = await sasClient.createAttestation({
        schemaId: KYC_SCHEMA_ID,
        recipient: userWallet.publicKey,
        data: attestationData,
        issuer: issuerWallet, // The trusted KYC provider signs this[citation:5]
        expiration: null, // No expiration, or set a future date
      });

      expect(attestation.id).toBeDefined();
      expect(attestation.schema).toBe(KYC_SCHEMA_ID);
      expect(attestation.issuer).toBe(issuerWallet.publicKey.toBase58());
      expect(attestation.recipient).toBe(userWallet.publicKey.toBase58());
      expect(attestation.revoked).toBe(false);

      createdAttestationId = attestation.id;
      console.log(`✅ Attestation created with ID: ${createdAttestationId}`);
    });

    test('should retrieve a created attestation by its ID', async () => {
      const fetchedAttestation = await sasClient.getAttestation(createdAttestationId);
      
      expect(fetchedAttestation).toBeDefined();
      expect(fetchedAttestation.id).toBe(createdAttestationId);
      expect(fetchedAttestation.recipient).toBe(userWallet.publicKey.toBase58());
    });

    test('should find attestations for a specific recipient wallet', async () => {
      const userAttestations = await sasClient.getAttestationsForRecipient(userWallet.publicKey);
      
      expect(userAttestations).toBeInstanceOf(Array);
      expect(userAttestations.length).toBeGreaterThan(0);
      
      const kycAttestation = userAttestations.find(a => a.schema === KYC_SCHEMA_ID);
      expect(kycAttestation).toBeDefined();
      expect(kycAttestation?.id).toBe(createdAttestationId);
    });

    test('should revoke an existing attestation', async () => {
      const revokeResult = await sasClient.revokeAttestation(createdAttestationId, issuerWallet);
      
      expect(revokeResult).toBe(true);
      
      // Verify it is now revoked
      const fetchedAttestation = await sasClient.getAttestation(createdAttestationId);
      expect(fetchedAttestation.revoked).toBe(true);
      console.log(`✅ Attestation ${createdAttestationId} successfully revoked.`);
    });
  });

  describe('Attestation Verification Logic', () => {
    test('should verify a valid, non-revoked attestation', async () => {
      // Create a fresh, non-revoked attestation for this test
      const testAttestation = await sasClient.createAttestation({
        schemaId: KYC_SCHEMA_ID,
        recipient: userWallet.publicKey,
        data: { wallet: 
        userWallet.publicKey.toBase58(), kycLevel: 'BASIC', countryCode: 'UK', timestamp: Date.now() },
        issuer: issuerWallet,
      });

      const verification = await sasClient.verifySASAttestation(
        userWallet.publicKey,
        KYC_SCHEMA_ID,
        issuerWallet.publicKey.toBase58()
      );

      expect(verification.isVerified).toBe(true);
      expect(verification.attestationId).toBe(testAttestation.id);
      expect(verification.issuer).toBe(issuerWallet.publicKey.toBase58());
    });

    test('should fail verification for a revoked attestation', async () => {
      // Use the attestation revoked in the previous test suite
      const verification = await sasClient.verifySASAttestation(
        userWallet.publicKey,
        KYC_SCHEMA_ID,
        issuerWallet.publicKey.toBase58()
      );

      expect(verification.isVerified).toBe(false);
      expect(verification.reason).toMatch(/revoked/);
    });

    test('should fail verification for an unknown issuer', async () => {
      const unknownIssuer = Keypair.generate().publicKey.toBase58();
      
      const verification = await sasClient.verifySASAttestation(
        userWallet.publicKey,
        KYC_SCHEMA_ID,
        unknownIssuer
      );

      expect(verification.isVerified).toBe(false);
      expect(verification.reason).toMatch(/issuer|not found/);
    });
  });
});