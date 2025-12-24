import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import assert from "assert";
import fs from "fs";
import path from "path";
 
const IDL_PATH = path.resolve(__dirname, "../../target/idl/attestation_registry.json");
const REGISTRY_PROGRAM_ID = new PublicKey("Reg1stry1111111111111111111111111111111111111");
 
describe("attestation_registry", () => {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899", { preflightCommitment: "confirmed" });
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  const program = new anchor.Program(idl, REGISTRY_PROGRAM_ID, provider);

  it("issues and revokes attestation", async () => {
    const issuer = Keypair.generate();
    // fund issuer
    const airdropSig = await provider.connection.requestAirdrop(issuer.publicKey, 2e9);
    await provider.connection.confirmTransaction(airdropSig);

    // target wallet
    const user = Keypair.generate();

    const [attPda] = await PublicKey.findProgramAddress(
      [Buffer.from("attestation"), user.publicKey.toBuffer()],
      program.programId
    );

    const expiresAt = Math.floor(Date.now() / 1000) + 3600;
    const jurisdiction = "US";
    const dataHash = new Array(32).fill(0);

    // issue
    await program.methods
      .issueAttestation(new anchor.BN(expiresAt), jurisdiction, dataHash)
      .accounts({
        issuer: issuer.publicKey,
        wallet: user.publicKey,
        attestation: attPda,
        systemProgram: SystemProgram.programId
      })
      .signers([issuer])
      .rpc();

    const att = await program.account.attestation.fetch(attPda);
    assert.ok(att.issuer.equals(issuer.publicKey));
    assert.equal(att.jurisdiction, jurisdiction);

    // revoke
    await program.methods
      .revokeAttestation()
      .accounts({
        issuer: issuer.publicKey,
        attestation: attPda
      })
      .signers([issuer])
      .rpc();

    const att2 = await program.account.attestation.fetch(attPda);
    assert.equal(att2.revoked, true);
  });