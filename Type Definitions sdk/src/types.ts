import { Connection, PublicKey, Signer } from '@solana/web3.js';

/**
 * Configuration required to initialize the Compliance SDK.
 * @interface SdkConfig
 */
export interface SdkConfig {
  /** Connection to the Solana cluster (e.g., devnet, mainnet-beta) */
  connection: Connection;
  /** The program ID (address) of the deployed Transfer Hook program */
  programId: PublicKey;
  /** Optional: The Token Program ID (defaults to TOKEN_2022_PROGRAM_ID) */
  tokenProgramId?: PublicKey;
}

/**
 * Parameters for initializing a compliant mint.
 * @interface InitializeCompliantMintParams
 */
export interface InitializeCompliantMintParams {
  /** The wallet that pays for and signs the mint creation transaction */
  payer: Signer;
  /** The public key that will have authority over the new mint */
  mintAuthority: PublicKey;
  /** The freeze authority for the mint, if any */
  freezeAuthority?: PublicKey | null;
  /** The number of decimal places for the token */
  decimals: number;
  /** Initial KYC configuration data */
  initialKycData: KycConfig;
}

/**
 * Parameters for executing a compliant transfer.
 * @interface TransferCheckedWithHookParams
 */
export interface TransferCheckedWithHookParams {
  /** The source token account address */
  source: PublicKey;
  /** The mint address of the token */
  mint: PublicKey;
  /** The destination token account address */
  destination: PublicKey;
  /** The owner and signer of the source token account */
  owner: Signer;
  /** The amount of tokens to transfer */
  amount: number | bigint;
  /** KYC proofs required to pass the hook's compliance check */
  kycProof: KycProof[];
}

/**
 * Status of a transfer transaction.
 * @interface TransferStatus
 */
export interface TransferStatus {
  /** Transaction signature */
  signature: string;
  /** Current status: pending, confirmed, failed */
  status: 'pending' | 'confirmed' | 'failed';
  /** Block time when confirmed */
  blockTime?: number;
  /** Error message if failed */
  error?: string;
  /** Hook validation result */
  hookValidation?: HookValidationResult;
}

/**
 * KYC status for a wallet address.
 * @interface KycStatus
 */
export interface KycStatus {
  /** Wallet address */
  wallet: PublicKey;
  /** Verification level */
  level: 'unverified' | 'basic' | 'enhanced' | 'institutional';
  /** Expiration timestamp */
  expiresAt?: number;
  /** Provider who verified */
  provider?: string;
}

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

/**
 * Parameters for registering KYC verification.
 * @interface RegisterKycParams
 */
export interface RegisterKycParams {
  /** Payer for the transaction */
  payer: PublicKey;
  /** Wallet address of the user being verified */
  userWallet: PublicKey;
  /** Public key of the KYC provider */
  kycProvider: PublicKey;
  /** Signer authority from the KYC provider */
  providerSigner: PublicKey;
  /** Verification level (0-3) */
  verificationLevel: number;
  /** Expiration timestamp */
  expiration: bigint;
  /** Cryptographic signature from provider */
  signature: Uint8Array;
}