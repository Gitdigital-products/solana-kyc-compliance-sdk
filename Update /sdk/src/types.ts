// Add to existing types.ts

/**
 * Configuration for KYC requirements.
 * @interface KycConfig
 */
export interface KycConfig {
  /** KYC provider identifier */
  kycProvider: string;
  /** Required verification level */
  requiredLevel: 'basic' | 'enhanced' | 'institutional';
  /** KYC expiration in days */
  expirationDays?: number;
  /** Allowed jurisdictions */
  jurisdiction?: string[];
  /** Minimum account age in days */
  minAccountAgeDays?: number;
}

/**
 * KYC proof for transfer validation.
 * @interface KycProof
 */
export interface KycProof {
  /** Verification provider */
  provider: string;
  /** Session or verification ID */
  sessionId: string;
  /** Proof timestamp */
  timestamp: number;
  /** Cryptographic signature */
  signature: string;
  /** Additional verification data */
  data?: Record<string, any>;
}

/**
 * Result of hook validation.
 * @interface HookValidationResult
 */
export interface HookValidationResult {
  /** Overall validation result */
  passed: boolean;
  /** Individual check results */
  checks: HookCheck[];
  /** Failure reason if any */
  failureReason?: string;
}

/**
 * Individual hook check result.
 * @interface HookCheck
 */
export interface HookCheck {
  /** Type of check */
  type: 'kyc' | 'balance' | 'limit' | 'time' | 'jurisdiction';
  /** Whether check passed */
  passed: boolean;
  /** Check details */
  details?: string;
}