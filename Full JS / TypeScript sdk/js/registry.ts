import { PublicKey, TransactionInstruction } from "@solana/web3.js";
 
export function issueAttestationIx(
  wallet: PublicKey,
  authority: PublicKey
): TransactionInstruction {
  return new TransactionInstruction({
    programId: new PublicKey("REG1stry11111111111111111111111111111111111"),
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: wallet, isSigner: false, isWritable: false },
    ],
    data: Buffer.from([1]), // mock data, replace with Anchor IDL call
  });