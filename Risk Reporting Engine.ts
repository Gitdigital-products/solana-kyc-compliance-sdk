import { Program } from "@coral-xyz/anchor";
import fs from "fs";

export class RiskReportingEngine {
  constructor(private program: Program) {}

  async generateMonthlyReport(month: number, year: number) {
    console.log(`Extracting Compliance Logs for ${month}/${year}...`);
    
    // Fetch all 'ComplianceUpdated' events from the ledger
    const events = await this.program.account.userCompliance.all();
    
    const reportData = events.map(e => ({
      wallet: e.account.owner.toBase58(),
      status: e.account.bitmask.toString(),
      expiry: new Date(e.account.expires_at.toNumber() * 1000).toISOString(),
    }));

    // Save as JSON/CSV (could be sent to a PDF generator)
    fs.writeFileSync(`./reports/compliance_${month}_${year}.json`, JSON.stringify(reportData));
    console.log("✅ Report Generated: audit_ready_compliance.json");
  }
}
