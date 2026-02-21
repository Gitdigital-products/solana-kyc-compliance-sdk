import * as anchor from "@coral-xyz/anchor";
import { PublicKey } from "@solana/web3.js";

// Standard Bitmask Flags
export enum ComplianceFlags {
  US_ACCREDITED = 1 << 0,  // 1
  EU_MICA        = 1 << 1,  // 2
  INSTITUTIONAL  = 1 << 2,  // 4
  SANCTIONED     = 1 << 63, // High bit for immediate blocking
}

export class IdentityManager {
  constructor(
    private program: anchor.Program<any>,
    private adminWallet: anchor.Wallet
  ) {}

  /**
   * Derives the Identity PDA for a specific user
   */
  getUserIdentityAddress(userWallet: PublicKey): PublicKey {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("kyc"), userWallet.toBuffer()],
      this.program.programId
    );
    return pda;
  }

  /**
   * Updates a user's compliance bitmask.
   * This is the "Money Maker" instruction for admins.
   */
  async updateComplianceBits(
    userWallet: PublicKey, 
    flags: number[], 
    expiry: number
  ) {
    // Combine flags into a single bitmask
    const bitmask = flags.reduce((acc, flag) => acc | flag, 0);
    const identityPda = this.getUserIdentityAddress(userWallet);

    return await this.program.methods
      .updateUserCompliance(new anchor.BN(bitmask), new anchor.BN(expiry))
      .accounts({
        admin: this.adminWallet.publicKey,
        userIdentity: identityPda,
        userWallet: userWallet,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();
  }

  /**
   * Helper to quickly sanction a wallet
   */
  async sanctionWallet(userWallet: PublicKey) {
    return await this.updateComplianceBits(
      userWallet, 
      [ComplianceFlags.SANCTIONED], 
      0 // No expiry for sanctions
    );
  }
}
