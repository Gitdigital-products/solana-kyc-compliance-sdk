import { Connection, Keypair } from "@solana/web3.js";
import { issueAttestationIx } from "../sdk/js/registry";
 
(async () => {
  const conn = new Connection("https://api.devnet.solana.com");
  const authority = Keypair.generate();
  const user = Keypair.generate();

  const ix = issueAttestationIx(user.publicKey, authority.publicKey);

  console.log("Instruction:", ix);