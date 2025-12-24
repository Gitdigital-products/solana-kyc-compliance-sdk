/**
 * registryClient.ts
 * - uses Anchor and the generated IDL (target/idl/attestation_registry.json)
 * - functions: issueAttestation, revokeAttestation, checkStatus
 */
 
import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import fs from "fs";
import path from "path";
 
const IDL_PATH = path.resolve(__dirname, "../../target/idl/attestation_registry.json");
 
export async function loadRegistryProgram(
  provider: anchor.AnchorProvider,
  programId: PublicKey
): Promise<anchor.Program> {
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  return new anchor.Program(idl, programId, provider);
}
 
/**
 * Issue an attestation (SBT-like PDA)
 */
export async function issueAttestation(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  issuer: Keypair,
  wallet: PublicKey,
  expiresAt: number, // unix timestamp
  jurisdiction: string,
  dataHash: Uint8Array // 32 bytes
) {
  const program = await loadRegistryProgram(provider, programId);
  const [attPda, bump] = await PublicKey.findProgramAddress(
    [Buffer.from("attestation"), wallet.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .issueAttestation(new anchor.BN(expiresAt), jurisdiction, Array.from(dataHash))
    .accounts({
      issuer: issuer.publicKey,
      wallet,
      attestation: attPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([issuer])
    .rpc();

  return { tx, attestation: attPda };
}
 
/**
 * Revoke attestation - callable by issuer signer
 */
export async function revokeAttestation(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  issuer: Keypair,
  wallet: PublicKey
) {
  const program = await loadRegistryProgram(provider, programId);
  const [attPda] = await PublicKey.findProgramAddress(
    [Buffer.from("attestation"), wallet.toBuffer()],
    program.programId
  );

  const tx = await program.methods
    .revokeAttestation()
    .accounts({
      issuer: issuer.publicKey,
      attestation: attPda,
    })
    .signers([issuer])
    .rpc();

  return { tx, attestation: attPda };
}
 
/**
 * Check status (readonly)
 */
export async function checkStatus(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  wallet: PublicKey
) {
  const program = await loadRegistryProgram(provider, programId);
  const [attPda] = await PublicKey.findProgramAddress(
    [Buffer.from("attestation"), wallet.toBuffer()],
    program.programId
  );

  // anchor view via account fetch
  const att = await program.account.attestation.fetchNullable(attPda);
  return att;
}