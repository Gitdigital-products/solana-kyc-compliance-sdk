import { Connection, Keypair, PublicKey, Transaction, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, Token } from "@solana/spl-token";
 
/**
 * Deploy a new SPL Token-2022 mint with metadata to set Transfer Hook and Permanent Delegate.
 * This is a helper wrapper; production code should use spl-token CLI or proper programs.
 */
export async function deployToken2022WithHook(
  connection: Connection,
  payer: Keypair,
  decimals: number,
  transferHookProgramId: PublicKey,
  permanentDelegateProgramId: PublicKey
) {
  // Use spl-token to create mint, set authority, and call token-2022 extension instructions
  // This is a high level pseudo-template. Use the Token 2022 SDK / CLI for the actual flow.
  throw new Error("This helper is a template. Use spl-token-2022 client or call the Token 2022 program instructions directly.");
}
 
/**
 * Example of adding the required extra-account metas for the token's transfer hook in dApps:
 * - the attestation accounts for sender/receiver
 * - AML root
 * - velocity PDAs
 */
export function buildExtraAccountMetaList(programId: PublicKey, sender: PublicKey, receiver?: PublicKey) {
  // returns list of PublicKey objects to be appended to a transaction's account metas
  const metas = [];
  // add sender attestation
  metas.push(
    PublicKey.findProgramAddressSync([Buffer.from("attestation"), sender.toBuffer()], programId)[0]
  );
  if (receiver) {
    metas.push(
      PublicKey.findProgramAddressSync([Buffer.from("attestation"), receiver.toBuffer()], programId)[0]
    );
  }
  metas.push(PublicKey.findProgramAddressSync([Buffer.from("aml_root")], programId)[0]);
  metas.push(PublicKey.findProgramAddressSync([Buffer.from("velocity"), sender.toBuffer()], programId)[0]);
  return metas;
}