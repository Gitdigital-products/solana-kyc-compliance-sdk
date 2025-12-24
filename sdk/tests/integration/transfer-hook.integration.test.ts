import { ComplianceSDK } from '../../src/compliance-sdk';
import { Connection, Keypair, clusterApiUrl } from '@solana/web3.js';
import { sleep } from '../../src/utils';

describe('ComplianceSDK Integration Tests', () => {
  // These tests run against devnet
  const connection = new Connection(clusterApiUrl('devnet'), 'confirmed');
  const programId = new PublicKey('YOUR_DEVNET_PROGRAM_ID');
  let sdk: ComplianceSDK;
  let testWallet: Keypair;
  
  beforeAll(async () => {
    sdk = new ComplianceSDK({ connection, programId });
    
    // Generate test wallet (in real tests, fund this wallet with SOL)
    testWallet = Keypair.generate();
  });
  
  describe('End-to-End Compliance Flow', () => {
    it.skip('should complete full KYC mint and transfer flow', async () => {
      // This is a full integration test - skip in CI unless configured
      
      // 1. Create compliant mint
      const mintTx = await sdk.initializeCompliantMint({
        payer: testWallet,
        mintAuthority: testWallet.publicKey,
        decimals: 6,
        initialKycData: {
          kycProvider: 'test-provider',
          requiredLevel: 'basic',
        },
      });
      
      console.log('Mint transaction:', mintTx);
      
      // Wait for confirmation
      await sleep(5000);
      
      // 2. Check status
      const mintStatus = await sdk.checkTransferStatus(mintTx);
      expect(mintStatus.status).toBe('confirmed');
      
      // 3. Attempt transfer (should fail without KYC)
      try {
        await sdk.transferCheckedWithHook({
          source: testWallet.publicKey,
          mint: new PublicKey('TEST_MINT'),
          destination: Keypair.generate().publicKey,
          owner: testWallet,
          amount: 100,
          kycProof: [],
        });
        fail('Transfer should have failed without KYC');
      } catch (error) {
        expect(error).toBeInstanceOf(TransferDeniedByHookError);
      }
    }, 30000); // 30 second timeout
  });
  
  describe('Network Configuration', () => {
    it('should connect to devnet successfully', async () => {
      const version = await connection.getVersion();
      expect(version).toBeDefined();
      console.log('Connected to Solana devnet:', version);
    });
    
    it('should validate program ID exists on chain', async () => {
      const programAccount = await connection.getAccountInfo(programId);
      expect(programAccount).toBeDefined();
      expect(programAccount?.executable).toBe(true);
    });
  });
});