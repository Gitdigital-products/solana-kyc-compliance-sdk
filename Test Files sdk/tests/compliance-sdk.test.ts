import { ComplianceSDK } from '../src/compliance-sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { WalletNotConnectedError, TransferDeniedByHookError } from '../src/errors';

// Mock web3.js and spl-token
jest.mock('@solana/web3.js');

describe('ComplianceSDK', () => {
  let sdk: ComplianceSDK;
  let mockConnection: any;
  let mockWallet: Keypair;
  
  beforeEach(() => {
    mockConnection = {
      getAccountInfo: jest.fn(),
      sendAndConfirmTransaction: jest.fn(),
      getSignatureStatus: jest.fn(),
      getTransaction: jest.fn(),
    };
    
    mockWallet = Keypair.generate();
    
    sdk = new ComplianceSDK({
      connection: mockConnection as any,
      programId: new PublicKey('TestProgram1111111111111111111111111111111111'),
    });
  });
  
  describe('initializeCompliantMint', () => {
    it('should throw WalletNotConnectedError when payer is missing', async () => {
      await expect(
        sdk.initializeCompliantMint({
          payer: null as any,
          mintAuthority: mockWallet.publicKey,
          decimals: 6,
          initialKycData: {
            kycProvider: 'veriff',
            requiredLevel: 'basic',
          },
        })
      ).rejects.toThrow(WalletNotConnectedError);
    });
    
    it('should successfully create a compliant mint', async () => {
      mockConnection.sendAndConfirmTransaction.mockResolvedValue('test_signature');
      
      const result = await sdk.initializeCompliantMint({
        payer: mockWallet,
        mintAuthority: mockWallet.publicKey,
        decimals: 6,
        initialKycData: {
          kycProvider: 'veriff',
          requiredLevel: 'basic',
        },
      });
      
      expect(result).toBe('test_signature');
      expect(mockConnection.sendAndConfirmTransaction).toHaveBeenCalled();
    });
  });
  
  describe('transferCheckedWithHook', () => {
    it('should throw TransferDeniedByHookError when hook rejects transfer', async () => {
      mockConnection.sendAndConfirmTransaction.mockRejectedValue({
        message: 'TransferHookError: KYC verification failed',
        logs: ['Program log: KYC verification failed for user'],
      });
      
      await expect(
        sdk.transferCheckedWithHook({
          source: new PublicKey('Source1111111111111111111111111111111111111'),
          mint: new PublicKey('Mint11111111111111111111111111111111111111111'),
          destination: new PublicKey('Dest111111111111111111111111111111111111111'),
          owner: mockWallet,
          amount: 100,
          kycProof: [],
        })
      ).rejects.toThrow(TransferDeniedByHookError);
    });
  });
  
  describe('checkTransferStatus', () => {
    it('should return pending status for unconfirmed transaction', async () => {
      mockConnection.getSignatureStatus.mockResolvedValue({
        value: null,
      });
      
      const status = await sdk.checkTransferStatus('test_signature');
      
      expect(status.status).toBe('pending');
      expect(status.signature).toBe('test_signature');
    });
  });
});