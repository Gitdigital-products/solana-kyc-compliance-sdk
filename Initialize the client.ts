import { ComplianceClient } from "@gitdigital/solana-kyc-compliance-sdk";

const client = new ComplianceClient({
  cluster: "mainnet-beta",
  apiKey: process.env.KYC_API_KEY,
});
