import { ComplianceSDK } from '@gitdigital/compliance-sdk';

// Initialize the AI Monitor
const monitor = new ComplianceSDK.RiskMonitor({
  autoSanction: true,
  riskThreshold: 85
});

monitor.start();
