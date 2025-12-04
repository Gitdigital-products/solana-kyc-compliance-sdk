import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Search, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Flag, 
  ShieldAlert,
  RefreshCw,
  Download
} from 'lucide-react';
 
const RiskDashboard = () => {
  const [walletSearch, setWalletSearch] = useState('');
  const [riskData, setRiskData] = useState(null);
  const [recentAlerts, setRecentAlerts] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalWallets: 0,
    highRisk: 0,
    mediumRisk: 0,
    lowRisk: 0,
    actionsToday: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
    fetchRecentAlerts();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/risk/dashboard/stats');
      const data = await response.json();
      setDashboardStats(data);
    } catch (error) {
      console.error('Failed to fetch dashboard stats:', error);
    }
  };

  const fetchRecentAlerts = async () => {
    try {
      const response = await fetch('/api/risk/alerts/recent');
      const data = await response.json();
      setRecentAlerts(data);
    } catch (error) {
      console.error('Failed to fetch recent alerts:', error);
    }
  };

  const searchWallet = async () => {
    if (!walletSearch.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/risk/wallet/${walletSearch}`);
      const data = await response.json();
      setRiskData(data);
    } catch (error) {
      console.error('Failed to fetch wallet risk:', error);
    } finally {
      setLoading(false);
    }
  };

  const forceRiskCheck = async (walletAddress) => {
    try {
      const response = await fetch(`/api/risk/wallet/${walletAddress}/force-check`, {
        method: 'POST'
      });
      const data = await response.json();
      setRiskData(data);
    } catch (error) {
      console.error('Failed to force risk check:', error);
    }
  };

  const RiskLevelBadge = ({ level }) => {
    const config = {
      critical: { color: 'bg-red-100 text-red-800', icon: <ShieldAlert className="w-4 h-4" /> },
      high: { color: 'bg-orange-100 text-orange-800', icon: <AlertTriangle className="w-4 h-4" /> },
      medium: { color: 'bg-yellow-100 text-yellow-800', icon: <Flag className="w-4 h-4" /> },
      low: { color: 'bg-blue-100 text-blue-800', icon: <CheckCircle className="w-4 h-4" /> },
      safe: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" /> }
    };

    const { color, icon } = config[level.toLowerCase()] || config.safe;

    return (
      <Badge className={`${color} flex items-center gap-1`}>
        {icon}
        <span className="font-semibold">{level.toUpperCase()}</span>
      </Badge>
    );
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Risk Monitoring Dashboard</h1>
          <p className="text-gray-600">Real-time wallet risk assessment and compliance management</p>
        </div>
        <Button onClick={fetchDashboardStats}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Total Wallets</CardTitle>
            <ShieldAlert className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.totalWallets.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="w-4 h-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{dashboardStats.highRisk}</div>
            <Progress value={(dashboardStats.highRisk / dashboardStats.totalWallets) * 100 || 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Medium Risk</CardTitle>
            <Flag className="w-4 h-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{dashboardStats.mediumRisk}</div>
            <Progress value={(dashboardStats.mediumRisk / dashboardStats.totalWallets) * 100 || 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Low Risk</CardTitle>
            <CheckCircle className="w-4 h-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{dashboardStats.lowRisk}</div>
            <Progress value={(dashboardStats.lowRisk / dashboardStats.totalWallets) * 100 || 0} className="mt-2" />
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Actions Today</CardTitle>
            <XCircle className="w-4 h-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.actionsToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Wallet Search */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Wallet Risk Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Input
              placeholder="Enter wallet address..."
              value={walletSearch}
              onChange={(e) => setWalletSearch(e.target.value)}
              className="flex-1"
            />
            <Button onClick={searchWallet} disabled={loading}>
              <Search className="w-4 h-4 mr-2" />
              {loading ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {riskData && (
            <div className="mt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold">Wallet Risk Profile</h3>
                  <p className="text-sm text-gray-600">{riskData.wallet_address}</p>
                </div>
                <div className="flex items-center gap-4">
                  <RiskLevelBadge level={riskData.risk_level} />
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => forceRiskCheck(riskData.wallet_address)}
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-check
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Risk Score</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">
                      {riskData.overall_risk_score.toFixed(1)}
                    </div>
                    <Progress value={riskData.overall_risk_score} className="mt-2" />
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Data Sources</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {riskData.data_sources.map((source, idx) => (
                        <Badge key={idx} variant="outline" className="mr-2">
                          {source}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm">Last Updated</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-lg">
                      {new Date(riskData.last_updated).toLocaleString()}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Risk Indicators */}
              <Card>
                <CardHeader>
                  <CardTitle>Risk Indicators</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Score</TableHead>
                        <TableHead>First Seen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {riskData.risk_indicators.map((indicator, idx) => (
                        <TableRow key={idx}>
                          <TableCell>
                            <Badge variant="outline">{indicator.category}</Badge>
                          </TableCell>
                          <TableCell>{indicator.description}</TableCell>
                          <TableCell>
                            <Badge className={
                              indicator.score > 80 ? 'bg-red-100 text-red-800' :
                              indicator.score > 60 ? 'bg-orange-100 text-orange-800' :
                              indicator.score > 40 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }>
                              {indicator.score.toFixed(1)}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {new Date(indicator.first_seen).toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>

              {/* Recommendations */}
              {riskData.recommendations.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle>Recommended Actions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {riskData.recommendations.map((rec, idx) => (
                        <Alert key={idx} className={
                          rec.priority === 'Critical' ? 'border-red-200 bg-red-50' :
                          rec.priority === 'High' ? 'border-orange-200 bg-orange-50' :
                          rec.priority === 'Medium' ? 'border-yellow-200 bg-yellow-50' :
                          'border-blue-200 bg-blue-50'
                        }>
                          <AlertDescription>
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="font-semibold">{rec.action}</p>
                                <p className="text-sm mt-1">{rec.reason}</p>
                                {rec.deadline_hours && (
                                  <p className="text-xs mt-2">
                                    Deadline: {rec.deadline_hours} hours
                                  </p>
                                )}
                              </div>
                              <Badge className={
                                rec.priority === 'Critical' ? 'bg-red-100 text-red-800' :
                                rec.priority === 'High' ? 'bg-orange-100 text-orange-800' :
                                rec.priority === 'Medium' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-blue-100 text-blue-800'
                              }>
                                {rec.priority}
                              </Badge>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Alerts */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Recent Risk Alerts</CardTitle>
          <Button variant="outline" size="sm">
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Time</TableHead>
                <TableHead>Wallet</TableHead>
                <TableHead>Risk Level</TableHead>
                <TableHead>Indicator</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentAlerts.map((alert, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    {new Date(alert.timestamp).toLocaleTimeString()}
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {alert.wallet_address.slice(0, 8)}...{alert.wallet_address.slice(-6)}
                  </TableCell>
                  <TableCell>
                    <RiskLevelBadge level={alert.risk_level} />
                  </TableCell>
                  <TableCell>{alert.indicator}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{alert.action}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={
                      alert.status === 'completed' ? 'bg-green-100 text-green-800' :
                      alert.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-gray-100 text-gray-800'
                    }>
                      {alert.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
 
export default RiskDashboard;