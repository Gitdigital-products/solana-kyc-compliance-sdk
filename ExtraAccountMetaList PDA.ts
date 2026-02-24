import * as anchor from "@coral-xyz/anchor";

export async function initializeExtraAccounts<T extends anchor.Idl>(
  program: anchor.Program<T>,
  mint: anchor.web3.PublicKey,
  payer: anchor.web3.Keypair
) {
  // 1. Derive the PDA where the meta-list is stored
  const [extraAccountMetaListPDA] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("extra-account-metas"), mint.toBuffer()],
    program.programId
  );

  // 2. Define which accounts the hook needs to "see"
  // We need the KYC account for the Sender and the Receiver
  // These are derived as PDAs based on the owner's wallet address
  try {
    const tx = await program.methods
      .initializeExtraAccountMetaList()
      .accounts({
        payer: payer.publicKey,
        extraAccountMetaList: extraAccountMetaListPDA,
        mint: mint,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("ExtraAccountMetaList Initialized:", tx);
  } catch (error) {
    console.error(
      "Failed to initialize ExtraAccountMetaList for mint",
      mint.toBase58(),
      "and payer",
      payer.publicKey.toBase58(),
      "Error:",
      error
    );
    throw error;
  }
}
