import * as anchor from "@coral-xyz/anchor";
import { 
  getExtraAccountMetaAddress, 
  getTransferHookInstruction 
} from "@solana/spl-token";

async function initializeExtraAccounts(
  program: anchor.Program<any>,
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
}
