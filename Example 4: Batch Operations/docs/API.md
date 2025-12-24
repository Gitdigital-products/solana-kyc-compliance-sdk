async function batchComplianceChecks(sdk: ComplianceSDK, transactions: string[]) {
  const statuses = await Promise.all(
    transactions.map(tx => sdk.checkTransferStatus(tx))
  );
  
  const failed = statuses.filter(s => s.status === 'failed');
  const pending = statuses.filter(s => s.status === 'pending');
  const confirmed = statuses.filter(s => s.status === 'confirmed');
  
  console.log(`Batch results: ${confirmed.length} confirmed, ${pending.length} pending, ${failed.length} failed`);
  
  // Analyze failed transactions
  failed.forEach(status => {
    if (status.hookValidation && !status.hookValidation.passed) {
      console.log(`Hook validation failed for ${status.signature}:`, 
        status.hookValidation.checks.filter(c => !c.passed));
    }
  });
  
  return { failed, pending, confirmed };
}