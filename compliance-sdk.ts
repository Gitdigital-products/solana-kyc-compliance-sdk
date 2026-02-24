/**
 * Compliance SDK - Primary Interface
 * 
 * This is the main entry point for developers to interact with the KYC system
 * from their frontend or backend applications.
 * 
 * @packageDocumentation
 */

import { 
  Connection, 
  PublicKey, 
  Transaction, 
  TransactionInstruction,
  SystemProgram,
  Keypair 
} from '@solana/web3.js';
import { 
  AnchorProvider, 
  Program, 
  Wallet, 
  BN 
} from '@coral-xyz/anchor';
import { 
  KycComplianceIDL, 
  KycComplianceProgram 
} from './types';
import { TransferHookService } from './services/transfer-hook-service';
import { 
  ComplianceError, 
  ErrorCode, 
  parseError 
} from './errors';
import { 
  KycStatus, 
  KycLevel, 
  ComplianceConfig, 
  TransferResult,
  RegisterUserParams,
  ComplianceStatus 
} from './types';

/**
 * Compliance SDK Client
 * 
 * Main interface for interacting with the KYC Compliance Protocol
 */
export class ComplianceSDK {
  private connection: Connection;
  private provider: AnchorProvider;
  private program: Program<KycComplianceProgram>;
  private transferHookService: TransferHookService;
  private config: ComplianceConfig;
  
  /**
   * Initialize the Compliance SDK
   * 
   * @param config - SDK configuration
   */
  constructor(config: ComplianceConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, config.commitment);
    
    // Create wallet adapter
    const wallet = config.wallet || new Wallet(Keypair.generate());
    this.provider = new AnchorProvider(this.connection, wallet, {
      commitment: config.commitment,
      skipPreflight: config.skipPreflight || false,
    });
    
    // Initialize program
    this.program = new Program<KycComplianceProgram>(
      KycComplianceIDL,
      config.programId,
      this.provider
    );
    
    // Initialize transfer hook service
    this.transferHookService = new TransferHookService(
      this.connection,
      this.provider,
      config.programId
    );
  }
  
  /**
   * Get the program ID
   */
  get programId(): PublicKey {
    return this.config.programId;
  }
  
  /**
   * Get the connection instance
   */
  getConnection(): Connection {
    return this.connection;
  }
  
  /**
   * Register a new user with KYC verification
   * 
   * @param params - Registration parameters
   * @returns Transaction signature
   */
  async registerUser(params: RegisterUserParams): Promise<string> {
    try {
      const { wallet, kycLevel, countryCode, expiryTimestamp } = params;
      
      // Derive KYC status PDA
      const [kycPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('kyc_status'), wallet.toBuffer()],
        this.programId
      );
      
      // Build transaction
      const transaction = new Transaction();
      
      // Add registration instruction
      const registerInstruction = await this.program.methods
        .registerUser({
          kycLevel: kycLevel as any,
          countryCode,
          expiryTimestamp: new BN(expiryTimestamp),
        })
        .accounts({
          user: wallet,
          kycStatus: kycPda,
          authority: this.provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .instruction();
      
      transaction.add(registerInstruction);
      
      // Send transaction
      const signature = await this.provider.sendAndConfirm(transaction, [], {
        commitment: this.config.commitment,
      });
      
      return signature;
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.REGISTRATION_FAILED,
        `Failed to register user: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Check compliance status for a wallet
   * 
   * @param wallet - Wallet address to check
   * @returns Compliance status
   */
  async checkComplianceStatus(wallet: PublicKey): Promise<ComplianceStatus> {
    try {
      // Derive KYC status PDA
      const [kycPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('kyc_status'), wallet.toBuffer()],
        this.programId
      );
      
      // Fetch KYC status account
      try {
        const kycAccount = await this.program.account.kycStatus.fetch(kycPda);
        
        return {
          wallet: wallet.toString(),
          status: kycAccount.status as KycStatus,
          kycLevel: kycAccount.kycLevel as KycLevel,
          countryCode: kycAccount.countryCode,
          expiryTimestamp: kycAccount.expiryTimestamp.toNumber(),
          registered: true,
        };
      } catch {
        // Account doesn't exist
        return {
          wallet: wallet.toString(),
          status: KycStatus.Unverified,
          kycLevel: KycLevel.None,
          countryCode: '',
          expiryTimestamp: 0,
          registered: false,
        };
      }
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.STATUS_CHECK_FAILED,
        `Failed to check compliance status: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Approve a transfer between two wallets
   * 
   * @param source - Source wallet
   * @param destination - Destination wallet
   * @param amount - Transfer amount
   * @returns Transfer result
   */
  async approveTransfer(
    source: PublicKey,
    destination: PublicKey,
    amount: BN
  ): Promise<TransferResult> {
    try {
      // Check source compliance status
      const sourceStatus = await this.checkComplianceStatus(source);
      if (sourceStatus.status !== KycStatus.Verified) {
        return {
          approved: false,
          reason: `Source wallet not verified: ${sourceStatus.status}`,
        };
      }
      
      // Check destination compliance status
      const destStatus = await this.checkComplianceStatus(destination);
      if (destStatus.status !== KycStatus.Verified) {
        return {
          approved: false,
          reason: `Destination wallet not verified: ${destStatus.status}`,
        };
      }
      
      return {
        approved: true,
        sourceStatus,
        destinationStatus: destStatus,
      };
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.TRANSFER_APPROVAL_FAILED,
        `Failed to approve transfer: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Create a mint with KYC transfer hook enabled
   * 
   * @param authority - Mint authority
   * @param decimals - Token decimals
   * @returns Mint address and transaction signature
   */
  async createCompliantMint(
    authority: PublicKey,
    decimals: number = 9
  ): Promise<{ mint: PublicKey; signature: string }> {
    try {
      return await this.transferHookService.createMintWithTransferHook(
        authority,
        decimals
      );
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.MINT_CREATION_FAILED,
        `Failed to create compliant mint: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Update the transfer hook program for an existing mint
   * 
   * @param mint - Mint address
   * @returns Transaction signature
   */
  async updateTransferHook(mint: PublicKey): Promise<string> {
    try {
      return await this.transferHookService.updateTransferHookProgramId(mint);
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.HOOK_UPDATE_FAILED,
        `Failed to update transfer hook: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Get the compliance registry info
   * 
   * @returns Registry information
   */
  async getRegistryInfo(): Promise<{
    authority: string;
    totalRegistered: number;
    paused: boolean;
    circuitBreakerActive: boolean;
  }> {
    try {
      const [registryPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('compliance_registry')],
        this.programId
      );
      
      const registry = await this.program.account.complianceRegistry.fetch(registryPda);
      
      return {
        authority: registry.authority.toString(),
        totalRegistered: registry.totalRegistered.toNumber(),
        registry.paused,
        registry.circuitBreakerActive,
      };
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.REGISTRY_FETCH_FAILED,
        `Failed to fetch registry info: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Freeze a wallet (admin only)
   * 
   * @param wallet - Wallet to freeze
   * @returns Transaction signature
   */
  async freezeWallet(wallet: PublicKey): Promise<string> {
    try {
      const [kycPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('kyc_status'), wallet.toBuffer()],
        this.programId
      );
      
      const transaction = new Transaction();
      
      const freezeInstruction = await this.program.methods
        .freezeWallet()
        .accounts({
          kycStatus: kycPda,
          authority: this.provider.wallet.publicKey,
        })
        .instruction();
      
      transaction.add(freezeInstruction);
      
      return await this.provider.sendAndConfirm(transaction, [], {
        commitment: this.config.commitment,
      });
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.FREEZE_FAILED,
        `Failed to freeze wallet: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Unfreeze a wallet (admin only)
   * 
   * @param wallet - Wallet to unfreeze
   * @returns Transaction signature
   */
  async unfreezeWallet(wallet: PublicKey): Promise<string> {
    try {
      const [kycPda] = PublicKey.findProgramAddressSync(
        [Buffer.from('kyc_status'), wallet.toBuffer()],
        this.programId
      );
      
      const transaction = new Transaction();
      
      const unfreezeInstruction = await this.program.methods
        .unfreezeWallet()
        .accounts({
          kycStatus: kycPda,
          authority: this.provider.wallet.publicKey,
        })
        .instruction();
      
      transaction.add(unfreezeInstruction);
      
      return await this.provider.sendAndConfirm(transaction, [], {
        commitment: this.config.commitment,
      });
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.UNFREEZE_FAILED,
        `Failed to unfreeze wallet: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Activate circuit breaker (admin only)
   * 
   * @returns Transaction signature
   */
  async activateCircuitBreaker(): Promise<string> {
    try {
      const transaction = new Transaction();
      
      const activateInstruction = await this.program.methods
        .activateCircuitBreaker()
        .accounts({
          authority: this.provider.wallet.publicKey,
        })
        .instruction();
      
      transaction.add(activateInstruction);
      
      return await this.provider.sendAndConfirm(transaction, [], {
        commitment: this.config.commitment,
      });
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.CIRCUIT_BREAKER_FAILED,
        `Failed to activate circuit breaker: ${parseError(error)}`,
        error
      );
    }
  }
  
  /**
   * Deactivate circuit breaker (admin only)
   * 
   * @returns Transaction signature
   */
  async deactivateCircuitBreaker(): Promise<string> {
    try {
      const transaction = new Transaction();
      
      const deactivateInstruction = await this.program.methods
        .deactivateCircuitBreaker()
        .accounts({
          authority: this.provider.wallet.publicKey,
        })
        .instruction();
      
      transaction.add(deactivateInstruction);
      
      return await this.provider.sendAndConfirm(transaction, [], {
        commitment: this.config.commitment,
      });
    } catch (error) {
      throw new ComplianceError(
        ErrorCode.CIRCUIT_BREAKER_FAILED,
        `Failed to deactivate circuit breaker: ${parseError(error)}`,
        error
      );
    }
  }
}

/**
 * Create a new ComplianceSDK instance
 * 
 * @param config - SDK configuration
 * @returns ComplianceSDK instance
 */
export function createComplianceSDK(config: ComplianceConfig): ComplianceSDK {
  return new ComplianceSDK(config);
}

// Export all types and utilities
export * from './types';
export * from './errors';
