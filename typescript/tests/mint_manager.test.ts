import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import assert from "assert";
 
const IDL_PATH = path.resolve(__dirname, "../../target/idl/mint_manager.json");
const MINT_PROGRAM_ID = new PublicKey("MintManag3r111111111111111111111111111111111");
 
describe("mint_manager", () => {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  const program = new anchor.Program(idl, MINT_PROGRAM_ID, provider);

  it("creates compliant mint config account", async () => {
    const payer = Keypair.generate();
    const airdrop = await provider.connection.requestAirdrop(payer.publicKey, 2e9);
    await provider.connection.confirmTransaction(airdrop);

    const mint = Keypair.generate();

    const [configPda] = await PublicKey.findProgramAddress([Buffer.from("mint_config"), mint.publicKey.toBuffer()], program.programId);

    // call createCompliantMint instruction
    await program.methods
      .createCompliantMint(9)
      .accounts({
        payer: payer.publicKey,
        config: configPda,
        mint: mint.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: PublicKey.default
      })
      .signers([payer])
      .rpc();

    const cfg = await program.account.mintConfig.fetchNullable(configPda);
    assert.ok(cfg !== null);
  });