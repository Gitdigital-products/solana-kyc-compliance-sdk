/**
 * Error Definitions
 * 
 * Standardized error definitions for both on-chain and off-chain SDK interactions.
 */

import { TransactionInstruction, TransactionError, SimulatedTransactionError } from '@solana/web3.js';

/**
 * Error Code Enum
 * Corresponds to error codes defined in the Rust programs
 */
export enum ErrorCode {
  // General Errors (0x1000)
  UNKNOWN_ERROR = 0x1000,
  INVALID_PARAMETERS = 0x1001,
  UNAUTHORIZED = 0x1002,
  ACCOUNT_NOT_FOUND = 0x1003,
  INSUFFICIENT_FUNDS = 0x1004,
  
  // KYC Errors (0x1700)
  WALLET_NOT_REGISTERED = 0x1700,
  KYC_EXPIRED = 0x1701,
  WALLET_FROZEN = 0x1702,
  SANCTIONED = 0x1703,
  AMOUNT_EXCEEDS_MAXIMUM = 0x1704,
  VELOCITY_LIMIT_EXCEEDED = 0x1705,
  INVALID_EXTRA_ACCOUNT_META = 0x1706,
  CIRCUIT_BREAKER_ACTIVE = 0x1707,
  INVALID_AUTHORITY = 0x1708,
  ZKP_VERIFICATION_FAILED = 0x1709,
  RECEIVER_NOT_VERIFIED = 0x1710,
  SENDER_NOT_VERIFIED = 0x1711,
  
  // Registry Errors (0x1800)
  REGISTRY_FULL = 0x1800,
  DUPLICATE_REGISTRATION = 0x1801,
  INVALID_COUNTRY_CODE = 0x1802,
  
  // Transfer Hook Errors (0x1900)
  TRANSFER_HOOK_NOT_INITIALIZED = 0x1900,
  INVALID_MINT = 0x1901,
  HOOK_PROGRAM_MISMATCH = 0x1902,
  
  // SDK Errors (0x2000)
  REGISTRATION_FAILED = 0x2000,
  STATUS_CHECK_FAILED = 0x2001,
  TRANSFER_APPROVAL_FAILED = 0x2002,
  MINT_CREATION_FAILED = 0x2003,
  HOOK_UPDATE_FAILED = 0x2004,
  HOOK_FETCH_FAILED = 0x2005,
  REGISTRY_FETCH_FAILED = 0x2006,
  FREEZE_FAILED = 0x2007,
  UNFREEZE_FAILED = 0x2008,
  CIRCUIT_BREAKER_FAILED = 0x2009,
  NETWORK_ERROR = 0x200A,
  TIMEOUT_ERROR = 0x200B,
  
  // Arithmetic Errors (0x3000)
  OVERFLOW = 0x3000,
  UNDERFLOW = 0x3001,
  DIVISION_BY_ZERO = 0x3002,
}

/**
 * Custom Error class for Compliance SDK
 */
export class ComplianceError extends Error {
  public readonly code: ErrorCode;
  public readonly originalError?: Error;
  public readonly transaction?: TransactionInstruction;
  
  constructor(code: ErrorCode, message: string, originalError?: Error) {
    super(message);
    this.name = 'ComplianceError';
    this.code = code;
    this.originalError = originalError;
    
    // Set prototype for proper instanceof checks
    Object.setPrototypeOf(this, ComplianceError.prototype);
  }
  
  /**
   * Get a human-readable description of the error
   */
  getDescription(): string {
    const errorInfo = ERROR_MESSAGES[this.code];
    return errorInfo 
      ? `${errorInfo.description}: ${this.message}`
      : `Unknown error (0x${this.code.toString(16)}): ${this.message}`;
  }
  
  /**
   * Get the error category
   */
  getCategory(): string {
    const errorInfo = ERROR_MESSAGES[this.code];
    return errorInfo?.category || 'Unknown';
  }
  
  /**
   * Check if this is a retryable error
   */
  isRetryable(): boolean {
    return [
      ErrorCode.NETWORK_ERROR,
      ErrorCode.TIMEOUT_ERROR,
      ErrorCode.INSUFFICIENT_FUNDS,
    ].includes(this.code);
  }
  
  /**
   * Convert to JSON for logging
   */
  toJSON(): object {
    return {
      name: this.name,
      code: `0x${this.code.toString(16)}`,
      message: this.message,
      category: this.getCategory(),
      retryable: this.isRetryable };
  }
}

/(),
   **
 * Error message mappings
 */
const ERROR_MESSAGES: Record<ErrorCode, { description: string; category: string }> = {
  // General Errors
  [ErrorCode.UNKNOWN_ERROR]: {
    description: 'Unknown error occurred',
    category: 'General',
  },
  [ErrorCode.INVALID_PARAMETERS]: {
    description: 'Invalid parameters provided',
    category: 'General',
  },
  [ErrorCode.UNAUTHORIZED]: {
    description: 'Unauthorized access',
    category: 'General',
  },
  [ErrorCode.ACCOUNT_NOT_FOUND]: {
    description: 'Account not found',
    category: 'General',
  },
  [ErrorCode.INSUFFICIENT_FUNDS]: {
    description: 'Insufficient funds',
    category: 'General',
  },
  
  // KYC Errors
  [ErrorCode.WALLET_NOT_REGISTERED]: {
    description: 'Wallet is not registered in the compliance registry',
    category: 'KYC',
  },
  [ErrorCode.KYC_EXPIRED]: {
    description: 'Wallet KYC status is expired',
    category: 'KYC',
  },
  [ErrorCode.WALLET_FROZEN]: {
    description: 'Wallet is blocked or frozen',
    category: 'KYC',
  },
  [ErrorCode.SANCTIONED]: {
    description: 'Wallet is on the sanctions list',
    category: 'KYC',
  },
  [ErrorCode.AMOUNT_EXCEEDS_MAXIMUM]: {
    description: 'Transfer amount exceeds maximum allowed',
    category: 'KYC',
  },
  [ErrorCode.VELOCITY_LIMIT_EXCEEDED]: {
    description: 'Velocity limit exceeded',
    category: 'KYC',
  },
  [ErrorCode.INVALID_EXTRA_ACCOUNT_META]: {
    description: 'Invalid extra account metas',
    category: 'KYC',
  },
  [ErrorCode.CIRCUIT_BREAKER_ACTIVE]: {
    description: 'Circuit breaker is active',
    category: 'KYC',
  },
  [ErrorCode.INVALID_AUTHORITY]: {
    description: 'Invalid authority',
    category: 'KYC',
  },
  [ErrorCode.ZKP_VERIFICATION_FAILED]: {
    description: 'ZKP verification failed',
    category: 'KYC',
  },
  [ErrorCode.RECEIVER_NOT_VERIFIED]: {
    description: 'Destination wallet not verified',
    category: 'KYC',
  },
  [ErrorCode.SENDER_NOT_VERIFIED]: {
    description: 'Source wallet not verified',
    category: 'KYC',
  },
  
  // Registry Errors
  [ErrorCode.REGISTRY_FULL]: {
    description: 'Registry is full',
    category: 'Registry',
  },
  [ErrorCode.DUPLICATE_REGISTRATION]: {
    description: 'Wallet already registered',
    category: 'Registry',
  },
  [ErrorCode.INVALID_COUNTRY_CODE]: {
    description: 'Invalid country code',
    category: 'Registry',
  },
  
  // Transfer Hook Errors
  [ErrorCode.TRANSFER_HOOK_NOT_INITIALIZED]: {
    description: 'Transfer hook not initialized',
    category: 'Transfer Hook',
  },
  [ErrorCode.INVALID_MINT]: {
    description: 'Invalid mint account',
    category: 'Transfer Hook',
  },
  [ErrorCode.HOOK_PROGRAM_MISMATCH]: {
    description: 'Hook program ID mismatch',
    category: 'Transfer Hook',
  },
  
  // SDK Errors
  [ErrorCode.REGISTRATION_FAILED]: {
    description: 'Failed to register user',
    category: 'SDK',
  },
  [ErrorCode.STATUS_CHECK_FAILED]: {
    description: 'Failed to check compliance status',
    category: 'SDK',
  },
  [ErrorCode.TRANSFER_APPROVAL_FAILED]: {
    description: 'Failed to approve transfer',
    category: 'SDK',
  },
  [ErrorCode.MINT_CREATION_FAILED]: {
    description: 'Failed to create compliant mint',
    category: 'SDK',
  },
  [ErrorCode.HOOK_UPDATE_FAILED]: {
    description: 'Failed to update transfer hook',
    category: 'SDK',
  },
  [ErrorCode.HOOK_FETCH_FAILED]: {
    description: 'Failed to fetch transfer hook info',
    category: 'SDK',
  },
  [ErrorCode.REGISTRY_FETCH_FAILED]: {
    description: 'Failed to fetch registry info',
    category: 'SDK',
  },
  [ErrorCode.FREEZE_FAILED]: {
    description: 'Failed to freeze wallet',
    category: 'SDK',
  },
  [ErrorCode.UNFREEZE_FAILED]: {
    description: 'Failed to unfreeze wallet',
    category: 'SDK',
  },
  [ErrorCode.CIRCUIT_BREAKER_FAILED]: {
    description: 'Circuit breaker operation failed',
    category: 'SDK',
  },
  [ErrorCode.NETWORK_ERROR]: {
    description: 'Network error occurred',
    category: 'SDK',
  },
  [ErrorCode.TIMEOUT_ERROR]: {
    description: 'Request timed out',
    category: 'SDK',
  },
  
  // Arithmetic Errors
  [ErrorCode.OVERFLOW]: {
    description: 'Integer overflow occurred',
    category: 'Arithmetic',
  },
  [ErrorCode.UNDERFLOW]: {
    description: 'Integer underflow occurred',
    category: 'Arithmetic',
  },
  [ErrorCode.DIVISION_BY_ZERO]: {
    description: 'Division by zero',
    category: 'Arithmetic',
  },
};

/**
 * Parse error from various sources
 */
export function parseError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  
  if (typeof error === 'string') {
    return error;
  }
  
  // Try to extract message from transaction error
  if (error && typeof error === 'object') {
    const err = error as any;
    if (err.message) {
      return err.message;
    }
    if (err.logs) {
      return err.logs.join('\n');
    }
  }
  
  return 'Unknown error';
}

/**
 * Parse Anchor program error
 */
export function parseAnchorError(error: any): ComplianceError {
  // Try to extract error code from Anchor error
  if (error.error) {
    const errorCode = error.error.errorCode?.code || error.error.code;
    const errorMessage = error.error.errorMessage || error.message;
    
    if (errorCode) {
      const code = ERROR_CODE_MAP[errorCode];
      if (code !== undefined) {
        return new ComplianceError(code, errorMessage, error);
      }
    }
  }
  
  // Fallback to generic error
  return new ComplianceError(
    ErrorCode.UNKNOWN_ERROR,
    parseError(error),
    error instanceof Error ? error : undefined
  );
}

/**
 * Map Anchor error codes to SDK error codes
 */
const ERROR_CODE_MAP: Record<string, ErrorCode> = {
  'WalletNotRegistered': ErrorCode.WALLET_NOT_REGISTERED,
  'KycExpired': ErrorCode.KYC_EXPIRED,
  'WalletFrozen': ErrorCode.WALLET_FROZEN,
  'Sanctioned': ErrorCode.SANCTIONED,
  'AmountExceedsMaximum': ErrorCode.AMOUNT_EXCEEDS_MAXIMUM,
  'VelocityLimitExceeded': ErrorCode.VELOCITY_LIMIT_EXCEEDED,
  'InvalidExtraAccountMeta': ErrorCode.INVALID_EXTRA_ACCOUNT_META,
  'CircuitBreakerActive': ErrorCode.CIRCUIT_BREAKER_ACTIVE,
  'InvalidAuthority': ErrorCode.INVALID_AUTHORITY,
  'ZkpVerificationFailed': ErrorCode.ZKP_VERIFICATION_FAILED,
  'ReceiverNotVerified': ErrorCode.RECEIVER_NOT_VERIFIED,
  'SenderNotVerified': ErrorCode.SENDER_NOT_VERIFIED,
  'Overflow': ErrorCode.OVERFLOW,
  'Underflow': ErrorCode.UNDERFLOW,
  'DivisionByZero': ErrorCode.DIVISION_BY_ZERO,
};

/**
 * Create a compliance error from transaction failure
 */
export function createErrorFromTransactionFailure(
  logs: string[]
): ComplianceError {
  // Parse logs to find error
  for (const log of logs) {
    // Look for custom program error logs
    const match = log.match(/Program log: AnchorError.*code=(\w+)/);
    if (match) {
      const code = ERROR_CODE_MAP[match[1]];
      if (code !== undefined) {
        return new ComplianceError(code, log);
      }
    }
    
    // Look for program error
    const programError = log.match(/Program (\w+) failed/);
    if (programError) {
      return new ComplianceError(
        ErrorCode.UNKNOWN_ERROR,
        `Program ${programError[1]} failed: ${log}`
      );
    }
  }
  
  return new ComplianceError(
    ErrorCode.UNKNOWN_ERROR,
    logs.join('\n')
  );
}

export default ComplianceError;
