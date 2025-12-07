import { PublicKey, TransactionInstruction } from "@solana/web3.js";
 
export const MINT_MANAGER_PROGRAM_ID = new PublicKey(
  "MintManag3r111111111111111111111111111111111"
);
 
export function createCompliantMintIx(
  payer: PublicKey,
  mint: PublicKey
) {
  return new TransactionInstruction({
    programId: MINT_MANAGER_PROGRAM_ID,
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: true },
    ],
    data: Buffer.from([0]),
  });