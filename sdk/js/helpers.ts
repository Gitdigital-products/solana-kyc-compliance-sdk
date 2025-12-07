import { PublicKey, TransactionInstruction } from "@solana/web3.js";
 
export async function extraAccountsForTransferHook(
  wallet: PublicKey
): Promise<TransactionInstruction[]> {

  const attestationPda = PublicKey.findProgramAddressSync(
    [Buffer.from("attestation"), wallet.toBuffer()],
    new PublicKey("REG1stry11111111111111111111111111111111111")
  )[0];

  return [
    {
      programId: new PublicKey("REG1stry11111111111111111111111111111111111"),
      keys: [
        { pubkey: wallet, isSigner: false, isWritable: false },
        { pubkey: attestationPda, isSigner: false, isWritable: false },
      ],
      data: Buffer.from([]),
    }
  ];