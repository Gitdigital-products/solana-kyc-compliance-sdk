import {
  Connection,
  PublicKey,
  Signer,
  Transaction,
  TransactionSignature,
  sendAndConfirmTransaction,
  Keypair
} from '@solana/web3.js';
import {
  InitializeCompliantMintParams,
  TransferCheckedWithHookParams,
  TransferStatus,
  HookValidationResult
} from '../types';
import {
  TransferDeniedByHookError,
  InsufficientBalanceError
} from '../errors';
import {
  createInitializeCompliantMintInstructions,
  createTransferCheckedWithHookInstruction
} from '../instructions';

/**
 * Service for handling Transfer Hook program interactions.
 * @class TransferHookService
 */
export class TransferHookService {
  constructor(
    private connection: Connection,
    private programId: PublicKey
  ) {}

  /**
   * Creates a compliant mint with Transfer Hook extension.
   * @private
   */
  async createCompliantMint(
    params: InitializeCompliantMintParams
  ): Promise<TransactionSignature> {
    const transaction = new Transaction();
    
    // Create mint keypair
    const mintKeypair = Keypair.generate();
    
    // Get instructions for mint creation
    const instructions = await createInitializeCompliantMintInstructions(
      {
        payer: params.payer.publicKey,
        mint: mintKeypair.publicKey,
        mintAuthority: params.mintAuthority,
        freezeAuthority: params.freezeAuthority || null,
        decimals: params.decimals,
        kycProvider: new PublicKey('8x7vGQyXJt5KzL8v8p7G6H5J4K3L2J1H0G9F8E7D6C5B4A3') // Replace with actual provider
      },
      this.programId
    );
    
    instructions.forEach(ix => transaction.add(ix));
    
    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [params.payer, mintKeypair]
      );
      
      return signature;
    } catch (error) {
      console.error('Failed to create compliant mint:', error);
      throw error;
    }
  }

  /**
   * Executes a compliant transfer with hook validation.
   * @private
   */
  async executeCompliantTransfer(
    params: TransferCheckedWithHookParams
  ): Promise<TransactionSignature> {
    // Check balance before attempting transfer
    await this.validateTransferPreconditions(params);
    
    const transaction = new Transaction();
    
    // Assuming first KYC proof is used for verification
    const kycProofPda = await this.getKycProofPda(
      params.owner.publicKey,
      params.kycProof[0]?.provider || 'default'
    );
    
    const transferIx = await createTransferCheckedWithHookInstruction(
      {
        source: params.source,
        mint: params.mint,
        destination: params.destination,
        owner: params.owner.publicKey,
        amount: BigInt(params.amount),
        decimals: 6, // Default - should come from mint data
        kycProof: kycProofPda
      },
      this.programId
    );
    
    transaction.add(transferIx);
    
    try {
      const signature = await sendAndConfirmTransaction(
        this.connection,
        transaction,
        [params.owner]
      );
      
      return signature;
    } catch (error: any) {
      if (error.message.includes('TransferHookError')) {
        throw new TransferDeniedByHookError(
          'Transfer denied by compliance hook',
          error.logs?.join('\n')
        );
      }
      throw error;
    }
  }

  /**
   * Validates transfer preconditions.
   * @private
   */
  private async validateTransferPreconditions(
    params: TransferCheckedWithHookParams
  ): Promise<void> {
    // Check token balance (simplified - in reality, use spl-token)
    const balance = await this.getTokenBalance(params.source);
    const amount = BigInt(params.amount);
    
    if (BigInt(balance) < amount) {
      throw new InsufficientBalanceError(
        `Insufficient balance. Required: ${amount}, Available: ${balance}`,
        amount,
        balance
      );
    }
  }

  /**
   * Gets token account balance.
   * @private
   */
  private async getTokenBalance(tokenAccount: PublicKey): Promise<bigint> {
    const accountInfo = await this.connection.getAccountInfo(tokenAccount);
    if (!accountInfo) {
      return 0n;
    }
    
    // Simplified - in reality, parse token account data
    // For now, return a mock balance
    return 1000n;
  }

  /**
   * Gets transfer status from transaction signature.
   * @private
   */
  async getTransferStatus(transactionSignature: string): Promise<TransferStatus> {
    const status = await this.connection.getSignatureStatus(transactionSignature);
    
    if (!status.value) {
      return {
        signature: transactionSignature,
        status: 'pending'
      };
    }
    
    const result: TransferStatus = {
      signature: transactionSignature,
      status: status.value.confirmationStatus === 'confirmed' ? 'confirmed' : 'pending',
      blockTime: status.value.blockTime,
      error: status.value.err ? status.value.err.toString() : undefined
    };
    
    if (result.status === 'confirmed') {
      const transaction = await this.connection.getTransaction(transactionSignature, {
        commitment: 'confirmed',
        maxSupportedTransactionVersion: 0
      });
      
      result.hookValidation = this.parseHookValidation(transaction?.meta?.logMessages);
    }
    
    return result;
  }

  /**
   * Parses hook validation results from transaction logs.
   * @private
   */
  private parseHookValidation(logs?: string[]): HookValidationResult | undefined {
    if (!logs) return undefined;
    
    const hookLogs = logs.filter(log => log.includes('Program log:'));
    const validationResult: HookValidationResult = {
      passed: true,
      checks: []
    };
    
    for (const log of hookLogs) {
      if (log.includes('KYC verified')) {
        validationResult.checks.push({ type: 'kyc', passed: true });
      } else if (log.includes('KYC failed')) {
        validationResult.checks.push({ type: 'kyc', passed: false });
        validationResult.passed = false;
      } else if (log.includes('Balance check')) {
        validationResult.checks.push({ type: 'balance', passed: !log.includes('failed') });
      }
    }
    
    return validationResult;
  }

  /**
   * Gets KYC proof PDA for a user and provider.
   * @private
   */
  private async getKycProofPda(userWallet: PublicKey, provider: string): Promise<PublicKey> {
    const [pda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from('kyc-proof'),
        userWallet.toBuffer(),
        Buffer.from(provider)
      ],
      this.programId
    );
    return pda;
  }
}