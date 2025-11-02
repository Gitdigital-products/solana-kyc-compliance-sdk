hereimport {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
  MINT_SIZE,
} from "@solana/web3.js";

import {
  createInitializeMintInstruction,
  createInitializePermanentDelegateInstruction,
  createInitializeTransferHookInstruction,
  getMintLen,
  ExtensionType,
  TOKEN_2022_PROGRAM_ID, // Use the Token-2022 program for extensions
  createAssociatedTokenAccountInstruction,
  createMintToCheckedInstruction,
} from "@solana/spl-token";

/**
 * Manages the creation and configuration of an RWA token with KYC/AML compliance features.
 */
export class TokenManager {
  constructor(
    readonly connection: Connection,
    readonly payer: Keypair,
    readonly complianceProgramId: PublicKey
  ) {}

  /**
   * 1. Creates a new Token-2022 Mint with Permanent Delegate and Transfer Hook extensions enabled.
   * 2. Initializes the Transfer Hook to point to your deployed compliance program.
   *
   * @param mintAuthority The wallet that can mint new tokens (can be null for a fixed supply).
   * @param permanentDelegate The wallet that retains ultimate control (for compliance/emergency).
   * @param decimals The number of decimal places for the token (e.g., 6 or 9).
   * @returns The PublicKey of the newly created mint account.
   */
  async createCompliantMint(
    mintAuthority: PublicKey | null,
    permanentDelegate: PublicKey,
    decimals: number
  ): Promise<PublicKey> {
    const mint = Keypair.generate();
    
    // 1. Calculate the required space for the mint account with both extensions
    const extensions = [
      ExtensionType.PermanentDelegate,
      ExtensionType.TransferHook,
    ];
    const mintLen = getMintLen(extensions);

    // 2. Determine the rent required for the account
    const lamports = await this.connection.getMinimumBalanceForRentExemption(
      mintLen
    );

    const transaction = new Transaction().add(
      // 3. Create the new mint account
      SystemProgram.createAccount({
        fromPubkey: this.payer.publicKey,
        newAccountPubkey: mint.publicKey,
        space: mintLen,
        lamports,
        programId: TOKEN_2022_PROGRAM_ID,
      }),
      // 4. Initialize the Permanent Delegate Extension
      createInitializePermanentDelegateInstruction(
        mint.publicKey,
        permanentDelegate, // This wallet gets the permanent control
        TOKEN_2022_PROGRAM_ID
      ),
      // 5. Initialize the Transfer Hook Extension
      createInitializeTransferHookInstruction(
        mint.publicKey,
        this.payer.publicKey, // Mint authority for signing (can be the Permanent Delegate later)
        this.complianceProgramId, // The ID of your Rust program!
        TOKEN_2022_PROGRAM_ID
      ),
      // 6. Initialize the basic Mint data
      createInitializeMintInstruction(
        mint.publicKey,
        decimals,
        mintAuthority,
        null, // Freeze authority (can be null or the permanent delegate)
        TOKEN_2022_PROGRAM_ID
      )
    );

    await sendAndConfirmTransaction(this.connection, transaction, [
      this.payer,
      mint,
    ]);

    console.log(`✅ Compliant Mint Created: ${mint.publicKey.toBase58()}`);
    return mint.publicKey;
  }

  /**
   * Mints a specified amount of the new token to a target wallet.
   * @param mintPubKey The PublicKey of the compliant mint.
   * @param targetWallet The recipient's wallet address.
   * @param amount The amount of tokens to mint (in base units, e.g., 100 * 10^decimals).
   * @param mintAuthority The Keypair of the current minting authority.
   * @param decimals The number of decimals for the token.
   * @returns The transaction signature.
   */
  async mintToWallet(
    mintPubKey: PublicKey,
    targetWallet: PublicKey,
    amount: bigint,
    mintAuthority: Keypair,
    decimals: number
  ): Promise<string> {
    // Get or create the Associated Token Account (ATA) for the recipient
    const recipientAta = await this.connection.getAssociatedTokenAddress(
      mintPubKey,
      targetWallet,
      false,
      TOKEN_2022_PROGRAM_ID
    );

    const instructions = [];

    // Check if ATA exists and create it if it doesn't
    const accountInfo = await this.connection.getAccountInfo(recipientAta);
    if (!accountInfo) {
      instructions.push(
        createAssociatedTokenAccountInstruction(
          this.payer.publicKey,
          recipientAta,
          targetWallet,
          mintPubKey,
          TOKEN_2022_PROGRAM_ID
        )
      );
    }

    // Add the instruction to mint the tokens
    instructions.push(
      createMintToCheckedInstruction(
        mintPubKey,
        recipientAta,
        mintAuthority.publicKey,
        amount,
        decimals,
        [], // No extra signers needed for a standard mint-to
        TOKEN_2022_PROGRAM_ID
      )
    );

    const transaction = new Transaction().add(...instructions);
    
    // Sign with the Payer and the Mint Authority
    return sendAndConfirmTransaction(this.connection, transaction, [
      this.payer,
      mintAuthority,
    ]);
  }
}
