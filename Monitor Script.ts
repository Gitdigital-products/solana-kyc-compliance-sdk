import { Program, AnchorProvider } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";

export const startSanctionsMonitor = async (program: Program) => {
  console.log("🛡️ Sanctions Monitor Started...");

  // 1. Listen for the 'ComplianceUpdate' event from your Rust program
  program.addEventListener("ComplianceUpdated", (event, slot, signature) => {
    console.log(`[EVENT] Compliance Changed for: ${event.user.toString()}`);
    console.log(`New Bitmask: ${event.bitmask.toString()}`);
    
    // Auto-alert if a user is flagged with the SANCTIONED bit
    if (event.bitmask.hasBit(63)) { // Logic for bit 63
        sendAlertToComplianceTeam(event.user, signature);
    }
  });

  // 2. Monitoring Transfer Activity (The 'Pro' Feature)
  // We subscribe to logs mentioning our Transfer Hook Program ID
  program.provider.connection.onLogs(program.programId, (logs) => {
    if (logs.err) return;
    
    // Scan logs for "Transfer Denied" or specific compliance errors
    if (logs.logs.some(l => l.includes("SourceIneligible"))) {
        const signature = logs.signature;
        console.warn(`🚨 Blocked Transfer Attempt: https://solscan.io/tx/${signature}`);
        // You can use this to track "Attempted Compliance Violations" 
        // and sell this data as a risk report.
    }
  }, "confirmed");
};

function sendAlertToComplianceTeam(user: PublicKey, tx: string) {
    // Integration point for Slack/Telegram or Internal CRM
    console.log(`ALERT: User ${user.toBase58()} has been sanctioned in TX ${tx}`);
}
