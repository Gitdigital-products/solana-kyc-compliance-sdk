import {
  Connection,
  PublicKey,
  TransactionInstruction,
  Keypair,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import { MerkleTree } from "merkletreejs";
import keccak256 from "keccak256";
 
/**
 * Helper: create merkle proof for an address (server-side), then pass leaf + proof + index
 */
export function buildAmlProof(blacklist: string[], address: string) {
  const leaves = blacklist.map((a) => keccak256(a));
  const tree = new MerkleTree(leaves, keccak256, { sortPairs: true });
  const leaf = keccak256(address);
  const proof = tree.getProof(leaf).map((p) => p.data);
  const index = tree.getLeafIndex(leaf);
  return {
    root: tree.getRoot(),
    leaf,
    proof,
    index,
  };
}
 
/**
 * Prepare accounts and extra account metas for a transfer instruction that uses the Transfer Hook
 */
export async function prepareTransferWithHook(
  programId: PublicKey,
  sender: PublicKey,
  receiver: PublicKey,
  payer: PublicKey
) {
  const [senderAttPda] = await PublicKey.findProgramAddress(
    [Buffer.from("attestation"), sender.toBuffer()],
    programId
  );

  const [receiverAttPda] = await PublicKey.findProgramAddress(
    [Buffer.from("attestation"), receiver.toBuffer()],
    programId
  );

  const [amlRootPda] = await PublicKey.findProgramAddress(
    [Buffer.from("aml_root")],
    programId
  );

  const [velocityPda] = await PublicKey.findProgramAddress(
    [Buffer.from("velocity"), sender.toBuffer()],
    programId
  );

  const accounts = {
    sender_attestation: senderAttPda,
    receiver_attestation: receiverAttPda,
    aml_root: amlRootPda,
    velocity_account: velocityPda,
    sender,
    payer,
    system_program: SystemProgram.programId,
  };

  return accounts;
}
 
/**
 * Build instruction for the on-chain verify_transfer call (Anchor client preferred)
 */
export async function buildVerifyTransferIx(
  program: anchor.Program,
  payer: Keypair,
  accounts: any,
  args: {
    aml_proof: Buffer[]; // array of 32-byte buffers
    aml_leaf: Buffer;
    aml_index: number;
    max_tx_amount: number;
    window_seconds: number;
    jurisdiction_restriction?: string;
  }
) {
  // If you have the Anchor Program instance, call:
  return await program.methods
    .verifyTransfer(
      args.aml_proof.map((b) => Array.from(new Uint8Array(b))),
      Array.from(new Uint8Array(args.aml_leaf)),
      args.aml_index,
      new anchor.BN(args.max_tx_amount),
      args.window_seconds,
      args.jurisdiction_restriction ?? null
    )
    .accounts({
      authority: payer.publicKey,
      payer: payer.publicKey,
      sender_attestation: accounts.sender_attestation,
      receiver_attestation: accounts.receiver_attestation,
      aml_root: accounts.aml_root,
      velocity_account: accounts.velocity_account,
      transfer_info: accounts.transfer_info, // you'll create a temporary account to hold amount
      sender: accounts.sender,
      system_program: anchor.web3.SystemProgram.programId,
    })
    .instruction();