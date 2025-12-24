import { PublicKey } from '@solana/web3.js';

/**
 * Utility functions for the KYC Compliance SDK.
 * @namespace Utils
 */

/**
 * Derives the ExtraAccountMetaList PDA for a mint.
 * @param {PublicKey} mint - The mint public key
 * @param {PublicKey} programId - The Transfer Hook program ID
 * @returns {Promise<[PublicKey, number]>} PDA public key and bump seed
 */
export async function findExtraAccountsMetaPda(
  mint: PublicKey,
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('extra-account-metas'), mint.toBuffer()],
    programId
  );
}

/**
 * Validates a KYC proof structure.
 * @param {KycProof} proof - The KYC proof to validate
 * @returns {boolean} Whether the proof is valid
 */
export function validateKycProof(proof: KycProof): boolean {
  if (!proof.provider || !proof.sessionId || !proof.signature) {
    return false;
  }
  
  // Check timestamp (proof shouldn't be from the future)
  if (proof.timestamp > Date.now()) {
    return false;
  }
  
  // Check expiration (if provided in proof.data)
  if (proof.data?.expiresAt && proof.data.expiresAt < Date.now()) {
    return false;
  }
  
  return true;
}

/**
 * Formats amount based on decimals.
 * @param {number | bigint} amount - The amount
 * @param {number} decimals - Number of decimals
 * @returns {string} Formatted amount string
 */
export function formatAmount(amount: number | bigint, decimals: number): string {
  const amountBigInt = BigInt(amount);
  const divisor = BigInt(10) ** BigInt(decimals);
  const integerPart = amountBigInt / divisor;
  const fractionalPart = amountBigInt % divisor;
  
  return fractionalPart === 0n
    ? integerPart.toString()
    : `${integerPart}.${fractionalPart.toString().padStart(decimals, '0').replace(/0+$/, '')}`;
}

/**
 * Sleep utility for retries.
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>}
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for async operations.
 * @param {Function} fn - Async function to retry
 * @param {number} retries - Number of retries
 * @param {number} delay - Delay between retries in ms
 * @returns {Promise<any>} Function result
 */
export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  delay: number = 1000
): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    if (retries <= 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 1.5);
  }
}