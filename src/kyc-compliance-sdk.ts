import { Connection, PublicKey, clusterApiUrl } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';

// =======================================================================
// === ACTION REQUIRED: REPLACE THESE PLACEHOLDERS WITH ACTUAL VALUES ===
// =======================================================================

/** The Public Key of the deployed Compliance Requirement Program (CRP) */
const COMPLIANCE_PROGRAM_ID = new PublicKey("GCRP111111111111111111111111111111111111111"); 

/** The Public Key of the Token Mint Address using the Transfer Hook */
const TARGET_MINT_ADDRESS = new PublicKey("MINT111111111111111111111111111111111111111"); 

/** * CRITICAL: The exact seed string used in the SPE's Rust program to derive the 
 * Whitelist PDA. Must be an exact match (e.g., "whitelist_status" or "kyc_state"). 
 */
const PDA_SEED_LITERAL = "kyc_status"; 
// =======================================================================

/**
 * Checks the on-chain Compliance Registry to determine if a wallet address
 * is whitelisted to hold or transact with the target compliant token.
 * * @param walletAddress The PublicKey of the wallet to check.
 * @returns A promise that resolves to true if whitelisted, false otherwise.
 */
export async function getWhitelistStatus(walletAddress: PublicKey): Promise<boolean> {
    const connection = new Connection(clusterApiUrl('devnet'), 'confirmed'); 

    // 1. Derive the unique PDA for the user's KYC status
    // The seeds must match the Rust program: [SEED_LITERAL, TARGET_MINT_ADDRESS, walletAddress]
    const [whitelistAccountPDA, _bump] = PublicKey.findProgramAddressSync(
        [
            Buffer.from(PDA_SEED_LITERAL), 
            TARGET_MINT_ADDRESS.toBuffer(),
            walletAddress.toBuffer(),
        ],
        COMPLIANCE_PROGRAM_ID
    );

    try {
        // 2. Fetch the account info for the derived PDA
        const accountInfo = await connection.getAccountInfo(whitelistAccountPDA);

        // 3. Whitelist Check: The presence of the PDA indicates approval.
        if (accountInfo && accountInfo.owner.equals(COMPLIANCE_PROGRAM_ID)) {
            console.log(`[SIE-SDK]: Wallet ${walletAddress.toBase58()} is WHITESLISTED.`);
            return true;
        }

        console.log(`[SIE-SDK]: Wallet ${walletAddress.toBase58()} is NOT whitelisted.`);
        return false;
    } catch (error) {
        console.error("Error fetching whitelist status (defaulting to NOT whitelisted):", error);
        // Safety First: If there's any network or program error, default to non-compliant.
        return false; 
    }
}
