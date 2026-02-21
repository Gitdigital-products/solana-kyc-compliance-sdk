import { 
  Connection, 
  Keypair, 
  SystemProgram, 
  Transaction, 
  sendAndConfirmTransaction 
} from "@solana/web3.js";
import { 
  ExtensionType, 
  TOKEN_2022_PROGRAM_ID, 
  getMintLen, 
  createInitializeMintInstruction, 
  createInitializeTransferHookInstruction 
} from "@solana/spl-token";

export async function createCompliantMint(
  connection: Connection,
  payer: Keypair,
  transferHookProgramId: PublicKey,
  decimals: number = 9
) {
  const mint = Keypair.generate();
  
  // 1. Calculate space for the Mint + Transfer Hook Extension
  const extensions = [ExtensionType.TransferHook];
  const mintLen = getMintLen(extensions);
  const lamports = await connection.getMinimumBalanceForRentExemption(mintLen);

  const transaction = new Transaction().add(
    // 2. Create the account
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: mint.publicKey,
      space: mintLen,
      lamports,
      programId: TOKEN_2022_PROGRAM_ID,
    }),
    // 3. Initialize the Transfer Hook Extension BEFORE the Mint
    // This points the token to your KYC Program
    createInitializeTransferHookInstruction(
      mint.publicKey,
      payer.publicKey, // Authority who can change the hook later
      transferHookProgramId,
      TOKEN_2022_PROGRAM_ID
    ),
    // 4. Initialize the Mint itself
    createInitializeMintInstruction(
      mint.publicKey,
      decimals,
      payer.publicKey, // Mint Authority
      payer.publicKey, // Freeze Authority (Crucial for RWAs)
      TOKEN_2022_PROGRAM_ID
    )
  );

  await sendAndConfirmTransaction(connection, transaction, [payer, mint]);
  console.log(`Compliant Mint Created: ${mint.publicKey.toBase58()}`);
  return mint.publicKey;
}
