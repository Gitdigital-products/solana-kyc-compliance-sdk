import { ComplianceSDK } from '../src/compliance-sdk';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { WalletNotConnectedError, TransferDeniedByHookError } from '../src/errors';

// Mock web3.js and spl-token
jest.mock('@solana/web3.js');
jest.mock('@solana/spl-token');

describe('ComplianceSDK', () => {
  let sdk: ComplianceSDK;
  let mockConnection: jest.Mocked<Connection>;
  let mockWallet: Keypair;
  
  beforeEach(() => {
    mockConnection = {
      getAccountInfo: jest.fn(),
      sendAndConfirmTransaction: jest.fn(),
      getSignatureStatus: jest.fn(),
      getTransaction: jest.fn(),
    } as any;
    
    mockWallet = Keypair.generate();
    
    sdk = new ComplianceSDK({
      connection: mockConnection,
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
    
    it('should handle transaction failures', async () => {
      mockConnection.sendAndConfirmTransaction.mockRejectedValue(
        new Error('Transaction failed')
      );
      
      await expect(
        sdk.initializeCompliantMint({
          payer: mockWallet,
          mintAuthority: mockWallet.publicKey,
          decimals: 6,
          initialKycData: {
            kycProvider: 'veriff',
            requiredLevel: 'basic',
          },
        })
      ).rejects.toThrow('Failed to initialize mint');
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
    
    it('should throw InsufficientBalanceError when balance is insufficient', async () => {
      // Mock balance check to return insufficient funds
      mockConnection.getAccountInfo.mockResolvedValue({
        data: Buffer.alloc(0),
        owner: new PublicKey('TokenProgram'),
      } as any);
      
      await expect(
        sdk.transferCheckedWithHook({
          source: new PublicKey('Source1111111111111111111111111111111111111'),
          mint: new PublicKey('Mint11111111111111111111111111111111111111111'),
          destination: new PublicKey('Dest111111111111111111111111111111111111111'),
          owner: mockWallet,
          amount: 1000,
          kycProof: [],
        })
      ).rejects.toThrow('Insufficient balance');
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
    
    it('should parse hook validation from transaction logs', async () => {
      mockConnection.getSignatureStatus.mockResolvedValue({
        value: {
          confirmationStatus: 'confirmed',
          blockTime: 1234567890,
          err: null,
        },
      });
      
      mockConnection.getTransaction.mockResolvedValue({
        meta: {
          logMessages: [
            'Program log: KYC verified for user: xyz',
            'Program log: Balance check passed',
          ],
        },
      } as any);
      
      const status = await sdk.checkTransferStatus('test_signature');
      
      expect(status.status).toBe('confirmed');
      expect(status.hookValidation?.passed).toBe(true);
      expect(status.hookValidation?.checks).toHaveLength(2);
    });
  });
});