/**
 * Small example using the registryClient and transferHookClient
 * - Make sure you ran `anchor build` so target/idl/*.json exist
 */
 
import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import { issueAttestation, checkStatus } from "../clients/registryClient";
import { buildVerifyTransferInstruction } from "../clients/transferHookClient";
import { buildAmlTree, getProofFor } from "../helpers/amlMerkle";
 
async function main() {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);

  // program ids you set in Anchor.toml
  const registryProgramId = new PublicKey("Reg1stry1111111111111111111111111111111111111");
  const hookProgramId = new PublicKey("TrnsfrHook1111111111111111111111111111111111");

  const issuer = Keypair.generate();
  const alice = Keypair.generate();

  // 1) Issue attestation
  const expiresAt = Math.floor(Date.now() / 1000) + 3600 * 24 * 365;
  const dataHash = new Uint8Array(32); // replace with sha256 hash of PII offchain
  const issueRes = await issueAttestation(provider, registryProgramId, issuer, alice.publicKey, expiresAt, "US", dataHash);
  console.log("issued attestation:", issueRes);

  // 2) Build AML proof
  const blacklist = ["bad1", "bad2", "bad3"];
  const tree = buildAmlTree(blacklist);
  const proofData = getProofFor("notbad", tree); // for a not-blacklisted address
  console.log("proof data sizes:", proofData.proof.length);

  // 3) Build verify_transfer instruction (you must create transfer_info account that holds amount)
  // placeholder: use an existing small account as transferInfo
  const payer = issuer;
  // const ix = await buildVerifyTransferInstruction(provider, hookProgramId, payer, alice.publicKey, null, transferInfoPubkey, proofData.leaf, proofData.proof, proofData.index, 1000000, 86400, null);
  // send ix in transaction...
}
 