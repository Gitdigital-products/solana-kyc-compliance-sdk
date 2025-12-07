import { Keypair } from "@solana/web3.js";
import { createCompliantMintIx } from "../sdk/js/mint";
 
const payer = Keypair.generate();
const mint = Keypair.generate();
 