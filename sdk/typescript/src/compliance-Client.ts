import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Connection, PublicKey, SystemProgram } from "@solana/web3.js";
// NOTE: You must generate and place your program's IDL (Interface Definition Language)
// in a file like './idl/compliance_registry.json' after compiling your Rust program.
import { ComplianceRegistry, IDL } from "./idl/compliance_registry"; 

// --- CONSTANTS & TYPES ---

// Must match the seed used in the Rust program's `ComplianceStatus` PDA.
const COMPLIANCE_STATUS_SEED = "compliance_status";

/** Represents the possible KYC statuses on-chain. */
export type KycStatus = "Approved" | "Revoked" | "Pending";

/** Deserialized data structure for a Compliance Status account. */
export interface ComplianceStatusData {
    wallet: PublicKey;
    status: KycStatus;
    validUntil: Date;
}

// --- SDK CLIENT CLASS ---

export class ComplianceClient {
  readonly program: Program<ComplianceRegistry>;

  /**
   * Initializes the client to interact with the Compliance Registry program.
   * @param connection Solana connection object.
   * @param wallet The authority wallet (typically the Compliance Issuer or Admin).
   * @param programId The deployed Compliance Registry Program ID.
   */
  constructor(
    readonly connection: Connection,
    readonly wallet: anchor.Wallet,
    readonly programId: PublicKey
  ) {
    const provider = new anchor.AnchorProvider(connection, wallet, {
      preflightCommitment: "processed",
    });
    // This connects the IDL to the deployed program.
    this.program = new Program<ComplianceRegistry>(IDL, programId, provider);
  }

  /**
   * Finds the Program Derived Address (PDA) for a user's Compliance Status account.
   * @param userWallet The PublicKey of the wallet being checked.
   * @returns The PDA PublicKey and its bump seed.
   */
  getComplianceStatusPda(userWallet: PublicKey): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
      [Buffer.from(COMPLIANCE_STATUS_SEED), userWallet.toBuffer()],
      this.program.programId
    );
  }

  /**
   * Initializes a new Compliance Status account for a wallet.
   * This is typically the first time a wallet passes KYC.
   * @param targetWallet The wallet address to set the status for.
   * @param validUntil Unix timestamp for when the status expires.
   * @returns The transaction signature.
   */
  async initializeKycStatus(
    targetWallet: PublicKey,
    validUntil: number
  ): Promise<string> {
    const [complianceStatusPda] = this.getComplianceStatusPda(targetWallet);

    // Initial status is usually 'Approved' upon initialization by the Issuer.
    const initialStatus = { approved: {} }; 

    return this.program.methods
      .initializeComplianceStatus(initialStatus as any, new anchor.BN(validUntil))
      .accounts({
        complianceStatus: complianceStatusPda,
        targetWallet: targetWallet,
        authority: this.wallet.publicKey, // Payer and authority
        systemProgram: SystemProgram.programId, // Required to create a new account
      })
      .rpc();
  }

  /**
   * Updates an existing Compliance Status account (e.g., for renewal or revocation).
   * @param targetWallet The wallet address to update.
   * @param newStatus The new KycStatus (Approved, Revoked, etc.).
   * @param validUntil Unix timestamp for the new expiration date.
   * @returns The transaction signature.
   */
  async updateKycStatus(
    targetWallet: PublicKey,
    newStatus: KycStatus,
    validUntil: number
  ): Promise<string> {
    const [complianceStatusPda] = this.getComplianceStatusPda(targetWallet);

    // Convert string status to Anchor's expected enum object format
    const statusEnum = { [newStatus.toLowerCase()]: {} };

    return this.program.methods
      .updateComplianceStatus(statusEnum as any, new anchor.BN(validUntil))
      .accounts({
        complianceStatus: complianceStatusPda,
        authority: this.wallet.publicKey,
      })
      .rpc();
  }

  /**
   * Fetches the current compliance status for a wallet from the blockchain.
   * @param wallet The wallet to fetch the status for.
   * @returns The deserialized ComplianceStatusData object or null if no account exists.
   */
  async getComplianceStatus(wallet: PublicKey): Promise<ComplianceStatusData | null> {
    const [complianceStatusPda] = this.getComplianceStatusPda(wallet);

    try {
        const accountData = await this.program.account.complianceStatus.fetch(complianceStatusPda);
        
        // Convert the on-chain Anchor enum/BN types to friendly TypeScript types
        let status: KycStatus;
        if (accountData.status.approved) status = "Approved";
        else if (accountData.status.revoked) status = "Revoked";
        else status = "Pending";

        return {
            wallet: accountData.wallet,
            status: status,
            // Convert Anchor's BN (Big Number) Unix timestamp to a JavaScript Date object (times 1000 for milliseconds)
            validUntil: new Date(accountData.validUntil.toNumber() * 1000), 
        };
    } catch (e) {
        // This usually means the account was never initialized.
        return null;
    }
  }
}
