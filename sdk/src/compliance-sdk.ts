import { Connection, PublicKey, Signer, TransactionSignature } from '@solana/web3.js';
import { TransferHookService } from './services/transfer-hook-service';
import {
  InitializeCompliantMintParams,
  TransferCheckedWithHookParams,
  SdkConfig
} from './types';
import {
  WalletNotConnectedError,
  HookValidationError
} from './errors';

/**
 * Main SDK class for KYC compliance operations on Solana.
 * Provides methods to initialize compliant mints and execute verified transfers.
 * @class ComplianceSDK
 */
export class ComplianceSDK {
  private transferHookService: TransferHookService;
  
  /**
   * Creates a new instance of the ComplianceSDK.
   * @param {SdkConfig} config - Configuration object for the SDK
   * @throws {Error} If connection or programId is invalid
   */
  constructor(private config: SdkConfig) {
    this.transferHookService = new TransferHookService(
      config.connection,
      config.programId
    );
  }

  /**
   * Creates a new token mint with the Transfer Hook extension enabled for compliance.
   * This mint will invoke the hook program on every transfer.
   * @param {InitializeCompliantMintParams} params - Parameters for mint creation
   * @returns {Promise<TransactionSignature>} The transaction signature of the mint creation
   * @throws {WalletNotConnectedError} If no payer is connected
   * @throws {HookValidationError} If hook configuration fails
   */
  async initializeCompliantMint(
    params: InitializeCompliantMintParams
  ): Promise<TransactionSignature> {
    if (!params.payer) {
      throw new WalletNotConnectedError('Payer wallet is required');
    }
    
    // Implementation would create mint with Transfer Hook extension
    // and set up the ExtraAccountMetaList PDA
    try {
      const txSignature = await this.transferHookService.createCompliantMint(params);
      return txSignature;
    } catch (error) {
      throw new HookValidationError(`Failed to initialize mint: ${error.message}`);
    }
  }

  /**
   * Executes a token transfer that will be validated by the compliance hook.
   * This is the primary method for moving compliant tokens between wallets.
   * @param {TransferCheckedWithHookParams} params - Transfer parameters
   * @returns {Promise<TransactionSignature>} The transaction signature of the transfer
   * @throws {TransferDeniedByHookError} If the hook program rejects the transfer
   * @throws {InsufficientBalanceError} If source has insufficient tokens
   */
  async transferCheckedWithHook(
    params: TransferCheckedWithHookParams
  ): Promise<TransactionSignature> {
    // Implementation would construct and send the transfer instruction
    // with the Transfer Hook extension
    return await this.transferHookService.executeCompliantTransfer(params);
  }

  /**
   * Checks the status of a transfer transaction.
   * @param {string} transactionSignature - The signature of the transaction to check
   * @returns {Promise<TransferStatus>} Detailed status of the transfer
   */
  async checkTransferStatus(transactionSignature: string): Promise<TransferStatus> {
    return await this.transferHookService.getTransferStatus(transactionSignature);
  }
}