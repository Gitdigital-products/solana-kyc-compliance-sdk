/**
 * @file Public API entry point for the Solana KYC Compliance SDK.
 * @version 1.0.0
 */

export { ComplianceSDK } from './compliance-sdk';
export { TransferHookService } from './services/transfer-hook-service';
export type {
  InitializeCompliantMintParams,
  TransferCheckedWithHookParams,
  TransferStatus,
  KycStatus,
  SdkConfig,
  KycConfig,
  KycProof,
  HookValidationResult
} from './types';
export {
  WalletNotConnectedError,
  HookValidationError,
  InsufficientBalanceError,
  TransferDeniedByHookError,
  ComplianceSdkError
} from './errors';
export {
  createInitializeCompliantMintInstructions,
  createTransferCheckedWithHookInstruction,
  createRegisterKycInstruction
} from './instructions';
export {
  findExtraAccountsMetaPda,
  validateKycProof,
  formatAmount,
  sleep,
  retry
} from './utils';