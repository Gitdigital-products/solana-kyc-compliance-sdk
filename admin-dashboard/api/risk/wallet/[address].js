import { RiskMonitoringService } from '@/lib/risk-engine';
 
export default async function handler(req, res) {
  const { address } = req.query;
 
  if (req.method === 'GET') {
    try {
      const service = await RiskMonitoringService.getInstance();
      const riskProfile = await service.getWalletRisk(address);
      
      if (!riskProfile) {
        return res.status(404).json({ error: 'Wallet not found or not monitored' });
      }
      
      res.status(200).json(riskProfile);
    } catch (error) {
      console.error('Failed to fetch wallet risk:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  } else if (req.method === 'POST') {
    try {
      const service = await RiskMonitoringService.getInstance();
      const riskProfile = await service.forceRiskCheck(address);
      
      res.status(200).json(riskProfile);
    } catch (error) {
      console.error('Failed to force risk check:', error);
      res.status(500).json({ error: error.message });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed' });
  }
}