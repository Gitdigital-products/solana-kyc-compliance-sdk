// npm deps: @solana/web3.js, @project-serum/anchor, bs58
import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Keypair,
  SystemProgram,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
 
export type IssueParams = {
  issuer: Keypair;
  wallet: PublicKey;
  expiresAt: number; // unix timestamp
  jurisdiction: string;
  dataHash: Uint8Array; // 32 bytes
  programId: PublicKey; // registry program id
};
 
export async function buildIssueAttestationIx(
  conn: Connection,
  provider: anchor.AnchorProvider,
  params: IssueParams
): Promise<TransactionInstruction> {
  const { issuer, wallet, expiresAt, jurisdiction, dataHash, programId } = params;
  const [attestationPda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("attestation"), wallet.toBuffer()],
    programId
  );

  // build instruction data using Anchor IDL or manual serialization
  const ixData = new anchor.BorshInstructionCoder({
    // for quick prototyping use anchor's program client / IDL
  } as any);

  // For brevity: example using anchor Program (you should instantiate Program with IDL)
  throw new Error("Use Anchor program client to build this instruction. Example template below.");

  // Real usage: instantiate anchor.Program<IDL> then call program.rpc.issueAttestation(...)
}
 