import { ComplianceClient } from "@gitdigital/solana-kyc-compliance-sdk";

new ComplianceClient({
  cluster: "mainnet-beta",
  apiKey: process.env.KYC_API_KEY,
});
