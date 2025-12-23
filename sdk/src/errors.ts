/**
 * Base error class for the SDK.
 * @class ComplianceSdkError
 * @extends Error
 */
export class ComplianceSdkError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ComplianceSdkError';
  }
}

/**
 * Thrown when an operation requires a wallet connection but none is provided.
 * @class WalletNotConnectedError
 * @extends ComplianceSdkError
 */
export class WalletNotConnectedError extends ComplianceSdkError {
  constructor(message = 'Wallet is not connected') {
    super(message);
    this.name = 'WalletNotConnectedError';
  }
}

/**
 * Thrown when the transfer hook program rejects a transfer.
 * @class TransferDeniedByHookError
 * @extends ComplianceSdkError
 */
export class TransferDeniedByHookError extends ComplianceSdkError {
  constructor(
    message = 'Transfer denied by compliance hook',
    public hookReason?: string
  ) {
    super(message);
    this.name = 'TransferDeniedByHookError';
  }
}

/**
 * Thrown when a wallet has insufficient balance for a transfer.
 * @class InsufficientBalanceError
 * @extends ComplianceSdkError
 */
export class InsufficientBalanceError extends ComplianceSdkError {
  constructor(
    message = 'Insufficient token balance',
    public requiredAmount?: number | bigint,
    public availableAmount?: number | bigint
  ) {
    super(message);
    this.name = 'InsufficientBalanceError';
  }
}

/**
 * Thrown when hook configuration or validation fails.
 * @class HookValidationError
 * @extends ComplianceSdkError
 */
export class HookValidationError extends ComplianceSdkError {
  constructor(message = 'Hook validation failed') {
    super(message);
    this.name = 'HookValidationError';
  }
}