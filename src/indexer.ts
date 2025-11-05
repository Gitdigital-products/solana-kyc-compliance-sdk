// src/indexer.ts
import { Connection, PublicKey } from "@solana/web3.js";
import { EventParser, Program, AnchorProvider } from "@coral-xyz/anchor";
import idl from "../target/idl/compliance_registry.json";
import { Pool } from "pg"; // or use Supabase client

const connection = new Connection("https://api.devnet.solana.com", "confirmed");
const programId = new PublicKey("YOUR_PROGRAM_ID_HERE");

// --- optional: connect to your DB ---
const db = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// build a minimal provider (no wallet needed for read-only)
const provider = new AnchorProvider(connection, {} as any, {
  preflightCommitment: "processed",
});
const program = new Program(idl as any, programId, provider);

const parser = new EventParser(programId, program.coder);

async function startListener() {
  connection.onLogs(programId, async (logInfo) => {
    for (const event of parser.parseLogs(logInfo.logs)) {
      console.log("📡", event.name, event.data);

      // simple Postgres insert
      await db.query(
        `INSERT INTO registry_events(name, data, slot, timestamp)
         VALUES ($1, $2, $3, NOW())`,
        [event.name, JSON.stringify(event.data), logInfo.slot]
      );
    }
  });

  console.log("👂 Listening for compliance_registry events...");
}

startListener().catch(console.error);
