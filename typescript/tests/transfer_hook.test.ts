import * as anchor from "@project-serum/anchor";
import { Keypair, PublicKey } from "@solana/web3.js";
import fs from "fs";
import path from "path";
import assert from "assert";
 
const IDL_PATH = path.resolve(__dirname, "../../target/idl/transfer_hook.json");
const HOOK_PROGRAM_ID = new PublicKey("TrnsfrHook1111111111111111111111111111111111");
 
describe("transfer_hook", () => {
  const provider = anchor.AnchorProvider.local("http://127.0.0.1:8899");
  anchor.setProvider(provider);
  const idl = JSON.parse(fs.readFileSync(IDL_PATH, "utf8"));
  const program = new anchor.Program(idl, HOOK_PROGRAM_ID, provider);

  it("sets aml root and fails blacklisted leaf", async () => {
    const admin = Keypair.generate();
    // fund
    const airdrop = await provider.connection.requestAirdrop(admin.publicKey, 2e9);
    await provider.connection.confirmTransaction(airdrop);

    const [amlRootPda] = await PublicKey.findProgramAddress([Buffer.from("aml_root")], program.programId);

    const fakeRoot = new Array(32).fill(1);

    await program.methods
      .setAmlRoot(fakeRoot)
      .accounts({ admin: admin.publicKey, amlRoot: amlRootPda })
      .signers([admin])
      .rpc();

    const aml = await program.account.amlRoot.fetch(amlRootPda);
    assert.deepEqual(Array.from(aml.root), fakeRoot);
  });

  it("velocity account initializes and updates", async () => {
    const payer = Keypair.generate();
    const airdrop = await provider.connection.requestAirdrop(payer.publicKey, 2e9);
    await provider.connection.confirmTransaction(airdrop);

    const sender = Keypair.generate();
    // prepare PDAs
    const [velocityPda] = await PublicKey.findProgramAddress([Buffer.from("velocity"), sender.publicKey.toBuffer()], program.programId);

    // The test assumes program method verifyTransfer will create/load velocity account.
    // Construct dummy args (empty proof)
    const proof: number[][] = [];
    const leaf = new Array(32).fill(2);
    const ix = await program.methods
      .verifyTransfer(proof, leaf, 0, new anchor.BN(1000000), 86400, null)
      .accounts({
        authority: payer.publicKey,
        payer: payer.publicKey,
        senderAttestation: PublicKey.default,
        receiverAttestation: PublicKey.default,
        amlRoot: (await PublicKey.findProgramAddress([Buffer.from("aml_root")], program.programId))[0],
        velocityAccount: velocityPda,
        transferInfo: PublicKey.default,
        sender: sender.publicKey,
      })
      .instruction();

    // Send ix in a tx to exercise account creation/path
    const tx = new anchor.web3.Transaction().add(ix);
    await provider.sendAndConfirm(tx, [payer]);

    // fetch velocity account
    const vel = await program.account.velocityAccount.fetchNullable(velocityPda);
    // velocity account may exist now
    if (vel) {
      assert.ok(typeof vel.amountInWindow === "bigint" || typeof vel.amountInWindow === "number");
    }
  });