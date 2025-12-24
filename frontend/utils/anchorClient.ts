import { PublicKey } from "@solana/web3.js";
 
export const REGISTRY_PROGRAM_ID = new PublicKey("Reg1stry11111111111111111111111111111111111");
 
export function attestationPda(wallet: PublicKey) {
  return PublicKey.findProgramAddressSync([Buffer.from("attestation"), wallet.toBuffer()], REGISTRY_PROGRAM_ID)[0];