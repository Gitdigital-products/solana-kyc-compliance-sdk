/**
 * transferHookClient.ts
 * - uses Anchor and generated IDL (target/idl/transfer_hook.json)
 * - functions: setAmlRoot, verifyTransfer (build instruction)
 */
 
import * as anchor from "@project-serum/anchor";
import { PublicKey, Keypair, SystemProgram, TransactionInstruction, Transaction } from "@solana/web3.js";
import fs from "fs";
import path from "path";
 
const IDL_PATH = path.resolve(__dirname, "../../target/idl/transfer_hook.json");
 
/** load anchor Program for transfer_hook */
export async function loadTransferHookProgram(provider: anchor.AnchorProvider, programId: PublicKey) {
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  return new anchor.Program(idl, programId, provider);
}
 
/** set AML root (admin only) */
export async function setAmlRoot(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  admin: Keypair,
  newRoot: Buffer // 32 bytes
) {
  const program = await loadTransferHookProgram(provider, programId);
  const [amlRootPda] = await PublicKey.findProgramAddress([Buffer.from("aml_root")], program.programId);

  const tx = await program.methods
    .setAmlRoot(Array.from(newRoot))
    .accounts({
      admin: admin.publicKey,
      amlRoot: amlRootPda,
    })
    .signers([admin])
    .rpc();

  return { tx, amlRoot: amlRootPda };
}
 
/**
 * buildVerifyTransferInstruction
 * - constructs the Anchor instruction to call verify_transfer
 * - takes AML proof details prepared off-chain (leaf, proof[], index)
 * - transferInfoAccount: a temporary small account the client creates that includes `amount` in its data,
 *   or you can pass an account that the Transfer Hook expects to read.
 */
export async function buildVerifyTransferInstruction(
  provider: anchor.AnchorProvider,
  programId: PublicKey,
  payer: Keypair,
  sender: PublicKey,
  receiver: PublicKey | null,
  transferInfoAccount: PublicKey,
  amlLeaf: Buffer,
  amlProof: Buffer[], // array of 32-byte buffers
  amlIndex: number,
  maxTxAmount: number,
  windowSeconds: number,
  jurisdictionRestriction: string | null
) {
  const program = await loadTransferHookProgram(provider, programId);

  const [senderAttPda] = await PublicKey.findProgramAddress(
    [Buffer.from("attestation"), sender.toBuffer()],
    program.programId
  );

  const receiverAttPda = receiver
    ? (await PublicKey.findProgramAddress([Buffer.from("attestation"), receiver.toBuffer()], program.programId))[0]
    : null;

  const [amlRootPda] = await PublicKey.findProgramAddress([Buffer.from("aml_root")], program.programId);
  const [velocityPda] = await PublicKey.findProgramAddress([Buffer.from("velocity"), sender.toBuffer()], program.programId);

  // Note: Anchor expects array-of-u8; convert proof buffers accordingly
  const proofAsArrays = amlProof.map((b) => Array.from(new Uint8Array(b)));
  const leafAsArray = Array.from(new Uint8Array(amlLeaf));

  const ix = await program.methods
    .verifyTransfer(proofAsArrays, leafAsArray, amlIndex, new anchor.BN(maxTxAmount), windowSeconds, jurisdictionRestriction ?? null)
    .accounts({
      authority: payer.publicKey,
      payer: payer.publicKey,
      senderAttestation: senderAttPda,
      receiverAttestation: receiverAttPda ?? PublicKey.default,
      amlRoot: amlRootPda,
      velocityAccount: velocityPda,
      transferInfo: transferInfoAccount,
      sender,
      systemProgram: SystemProgram.programId,
    })
    .instruction();

  return ix;