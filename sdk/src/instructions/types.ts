import { PublicKey } from '@solana/web3.js';

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

/**
 * Configuration for the ExtraAccountMetaList.
 * @interface ExtraAccountsConfig
 */
export interface ExtraAccountsConfig {
  /** Accounts required for the hook */
  accounts: Array<{
    pubkey: PublicKey;
    isSigner: boolean;
    isWritable: boolean;
    addressConfig: Uint8Array;
  }>;
  /** Seeds for PDA derivation */
  seeds: Uint8Array[];
}