'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Zap, 
  TrendingUp, 
  BarChart3, 
  PieChart, 
  Activity,
  Clock,
  DollarSign,
  Users,
  Loader2,
  RefreshCw
} from 'lucide-react';
import WalletConnection from '../../components/WalletConnection';

interface Analytics {
  totalGasSaved: string;
  totalBatches: number;
  totalTransactions: number;
  averageBatchSize: number;
}

interface NetworkData {
  chainId: string;
  blockNumber: string;
  gasPrice: string;
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [networkData, setNetworkData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      const [analyticsResponse, networkResponse] = await Promise.all([
        fetch('/api/analytics'),
        fetch('/api/shardeum?action=chain-info')
      ]);

      if (analyticsResponse.ok) {
        const data = await analyticsResponse.json();
        setAnalytics(data.analytics);
      }

      if (networkResponse.ok) {
        const data = await networkResponse.json();
        setNetworkData(data.data);
      }

      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to fetch analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatGasSaved = (savedWei: string): { amount: string; currency: string } => {
    const wei = BigInt(savedWei);
    const shm = Number(wei) / 1e18;
    
    if (shm >= 1) {
      return { amount: shm.toFixed(6), currency: 'SHM' };
    } else {
      return { amount: (shm * 1e18).toLocaleString(), currency: 'wei' };
    }
  };

  const formatGasPrice = (hexPrice: string): string => {
    const wei = parseInt(hexPrice, 16);
    const gwei = wei / 1000000000;
    return `${gwei.toFixed(2)} Gwei`;
  };

  const calculateSavingsPercentage = (): number => {
    if (!analytics || analytics.totalTransactions === 0) return 0;
    const totalGasWei = BigInt(analytics.totalGasSaved);
    const estimatedOriginalGas = BigInt(analytics.totalTransactions * 21000); // Rough estimate
    return Number((totalGasWei * BigInt(100)) / estimatedOriginalGas);
  };

  const getEfficiencyRating = (): string => {
    const avgBatchSize = analytics?.averageBatchSize || 0;
    if (avgBatchSize >= 10) return 'Excellent';
    if (avgBatchSize >= 7) return 'Good';
    if (avgBatchSize >= 5) return 'Fair';
    return 'Needs Improvement';
  };

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'Excellent': return 'text-green-600';
      case 'Good': return 'text-blue-600';
      case 'Fair': return 'text-yellow-600';
      default: return 'text-red-600';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  const gasSaved = analytics ? formatGasSaved(analytics.totalGasSaved) : { amount: '0', currency: 'SHM' };
  const savingsPercentage = calculateSavingsPercentage();
  const efficiencyRating = getEfficiencyRating();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Link href="/" className="flex items-center space-x-2">
                <Zap className="h-8 w-8 text-indigo-600" />
                <h1 className="text-2xl font-bold text-gray-900">GasGuru</h1>
              </Link>
            </div>
            <nav className="flex items-center space-x-6">
              <Link href="/dashboard" className="text-gray-600 hover:text-indigo-600 font-medium">
                Dashboard
              </Link>
              <Link href="/batch" className="text-gray-600 hover:text-indigo-600 font-medium">
                Batch Transactions
              </Link>
              <Link href="/analytics" className="text-indigo-600 font-medium">
                Analytics
              </Link>
              <WalletConnection showBalance={false} />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">Analytics Dashboard</h2>
            <p className="text-gray-600">Detailed insights into your gas optimization performance</p>
          </div>
          <div className="flex items-center space-x-4">
            {lastUpdated && (
              <p className="text-sm text-gray-500">
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={fetchAnalyticsData}
              className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Gas Saved</p>
                <p className="text-2xl font-bold text-gray-900">
                  {gasSaved.amount} {gasSaved.currency}
                </p>
                <p className="text-sm text-green-600 font-medium">
                  {savingsPercentage.toFixed(1)}% savings
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Batches</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics ? analytics.totalBatches.toLocaleString() : '0'}
                </p>
                <p className="text-sm text-blue-600 font-medium">
                  Processed successfully
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Transactions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics ? analytics.totalTransactions.toLocaleString() : '0'}
                </p>
                <p className="text-sm text-purple-600 font-medium">
                  Optimized
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Avg Batch Size</p>
                <p className="text-2xl font-bold text-gray-900">
                  {analytics ? analytics.averageBatchSize.toFixed(1) : '0'}
                </p>
                <p className={`text-sm font-medium ${getRatingColor(efficiencyRating)}`}>
                  {efficiencyRating}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Performance Overview */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-6">
              <TrendingUp className="h-6 w-6 text-indigo-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Performance Overview</h3>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Gas Efficiency</span>
                  <span className="font-medium">{savingsPercentage.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(savingsPercentage, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Batch Utilization</span>
                  <span className="font-medium">
                    {analytics ? ((analytics.averageBatchSize / 20) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${analytics ? Math.min((analytics.averageBatchSize / 20) * 100, 100) : 0}%` 
                    }}
                  ></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-gray-600">Processing Rate</span>
                  <span className="font-medium">
                    {analytics && analytics.totalBatches > 0 
                      ? (analytics.totalTransactions / analytics.totalBatches).toFixed(1) 
                      : '0'} tx/batch
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${analytics && analytics.totalBatches > 0 
                        ? Math.min((analytics.totalTransactions / analytics.totalBatches / 15) * 100, 100) 
                        : 0}%` 
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Network Status */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-6">
              <Activity className="h-6 w-6 text-green-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Shardeum Network</h3>
            </div>

            {networkData ? (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Chain ID</span>
                  <span className="font-medium">{parseInt(networkData.chainId, 16)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Latest Block</span>
                  <span className="font-medium">#{parseInt(networkData.blockNumber, 16).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Gas Price</span>
                  <span className="font-medium">{formatGasPrice(networkData.gasPrice)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Network Status</span>
                  <span className="font-medium text-green-600 flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Healthy
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500">
                Network data unavailable
              </div>
            )}
          </div>
        </div>

        {/* Optimization Recommendations */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <div className="flex items-center mb-6">
            <PieChart className="h-6 w-6 text-purple-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Optimization Recommendations</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-3">
                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                <h4 className="font-medium text-blue-900">Timing Optimization</h4>
              </div>
              <p className="text-sm text-blue-700">
                Schedule batches during off-peak hours to maximize gas savings.
              </p>
            </div>

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center mb-3">
                <Users className="h-5 w-5 text-green-600 mr-2" />
                <h4 className="font-medium text-green-900">Batch Size</h4>
              </div>
              <p className="text-sm text-green-700">
                {analytics && analytics.averageBatchSize < 10 
                  ? 'Increase batch size to 10-15 transactions for better efficiency.'
                  : 'Your batch size is optimal for current network conditions.'
                }
              </p>
            </div>

            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="flex items-center mb-3">
                <TrendingUp className="h-5 w-5 text-purple-600 mr-2" />
                <h4 className="font-medium text-purple-900">Growth Potential</h4>
              </div>
              <p className="text-sm text-purple-700">
                {analytics && analytics.totalTransactions < 1000
                  ? 'Scale up transaction volume to unlock greater savings.'
                  : 'Consider implementing auto-batching for consistent optimization.'
                }
              </p>
            </div>
          </div>
        </div>

        {/* Historical Data Placeholder */}
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center mb-6">
            <BarChart3 className="h-6 w-6 text-indigo-600 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900">Historical Trends</h3>
          </div>
          
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h4>
            <p className="text-gray-600 max-w-md mx-auto">
              Historical charts and trends will be available as you accumulate more batching data. 
              Start creating batches to see detailed analytics here.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
} 