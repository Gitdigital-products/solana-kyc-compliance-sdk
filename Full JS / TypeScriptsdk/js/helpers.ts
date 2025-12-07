import {
  PublicKey,
  TransactionInstruction,
} from "@solana/web3.js";
import { attestationPda, REGISTRY_PROGRAM_ID } from "./kyc";
 
export function getExtraKycAccounts(wallet: PublicKey) {
  const pda = attestationPda(wallet);

  return [
    {
      pubkey: wallet,
      isSigner: false,
      isWritable: false,
    },
    {
      pubkey: pda,
      isSigner: false,
      isWritable: false,
    },
  ];