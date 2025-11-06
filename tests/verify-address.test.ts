import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { SolanaKycCompliance } from "../target/types/solana_kyc_compliance";
import { PublicKey, SystemProgram } from "@solana/web3.js";
import { assert } from "chai";

describe("solana-kyc-compliance-sdk", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace
    .SolanaKycCompliance as Program<SolanaKycCompliance>;

  let registryAuthority = anchor.web3.Keypair.generate();
  let user = anchor.web3.Keypair.generate();
  let registryPda: PublicKey;
  let verifiedPda: PublicKey;

  before(async () => {
    const [pda] = PublicKey.findProgramAddressSync(
      [Buffer.from("registry"), registryAuthority.publicKey.toBuffer()],
      program.programId
    );
    registryPda = pda;

    const tx = await program.methods
      .initializeRegistry()
      .accounts({
        registry: registryPda,
        registryAuthority: registryAuthority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([registryAuthority])
      .rpc();

    console.log("Initialized registry:", tx);
  });

  it("Verifies a new user address", async () => {
    const [vpda] = PublicKey.findProgramAddressSync(
      [Buffer.from("verified"), user.publicKey.toBuffer(), registryPda.toBuffer()],
      program.programId
    );
    verifiedPda = vpda;

    const metadata = { name: "Boss Learner", jurisdiction: "US" };

    const tx = await program.methods
      .verifyAddress(JSON.stringify(metadata))
      .accounts({
        user: user.publicKey,
        registry: registryPda,
        verifiedAddress: verifiedPda,
        registryAuthority: registryAuthority.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([registryAuthority]) // authority signs, not user
      .rpc();

    console.log("Verify tx:", tx);

    const verifiedAccount = await program.account.verifiedAddress.fetch(verifiedPda);
    assert.equal(verifiedAccount.owner.toBase58(), user.publicKey.toBase58());
    assert.deepInclude(JSON.parse(verifiedAccount.metadata), metadata);
  });
});