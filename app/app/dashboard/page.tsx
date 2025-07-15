'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Zap, 
  Activity, 
  Clock, 
  BarChart3, 
  TrendingUp, 
  AlertCircle,
  CheckCircle,
  Loader2,
  Plus,
  ArrowRight
} from 'lucide-react';
import WalletConnection from '../../components/WalletConnection';

interface NetworkHealth {
  nodeCount: number;
  isHealthy: boolean;
  cycleInfo: {
    cycleCounter: number;
    nodes: {
      active: number;
      standby: number;
      syncing: number;
      desired: number;
    };
  };
}

interface GasOptimization {
  current: string;
  recommended: string;
  savings: number;
}

interface Analytics {
  totalGasSaved: string;
  totalBatches: number;
  totalTransactions: number;
  averageBatchSize: number;
}

export default function Dashboard() {
  const [networkHealth, setNetworkHealth] = useState<NetworkHealth | null>(null);
  const [gasOptimization, setGasOptimization] = useState<GasOptimization | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [networkResponse, gasResponse, analyticsResponse] = await Promise.all([
        fetch('/api/shardeum?action=network-health'),
        fetch('/api/shardeum?action=gas-price'),
        fetch('/api/analytics')
      ]);

      if (networkResponse.ok) {
        const networkData = await networkResponse.json();
        setNetworkHealth(networkData.data);
      }

      if (gasResponse.ok) {
        const gasData = await gasResponse.json();
        setGasOptimization(gasData.data);
      }

      if (analyticsResponse.ok) {
        const analyticsData = await analyticsResponse.json();
        setAnalytics(analyticsData.analytics);
      }

    } catch (err) {
      setError('Failed to fetch dashboard data');
      console.error('Dashboard error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatGasPrice = (hexPrice: string): string => {
    const wei = parseInt(hexPrice, 16);
    const gwei = wei / 1000000000;
    return `${gwei.toFixed(2)} Gwei`;
  };

  const formatGasSaved = (savedWei: string): string => {
    const wei = BigInt(savedWei);
    const eth = Number(wei) / 1e18;
    return `${eth.toFixed(6)} SHM`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-indigo-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

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
              <Link href="/dashboard" className="text-indigo-600 font-medium">
                Dashboard
              </Link>
              <Link href="/batch" className="text-gray-600 hover:text-indigo-600 font-medium">
                Batch Transactions
              </Link>
              <Link href="/analytics" className="text-gray-600 hover:text-indigo-600 font-medium">
                Analytics
              </Link>
              <WalletConnection showBalance={false} />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Dashboard</h2>
          <p className="text-gray-600">Monitor your gas optimization and transaction batching performance</p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <span className="text-red-700">{error}</span>
            <button 
              onClick={fetchDashboardData}
              className="ml-auto text-red-600 hover:text-red-700 font-medium"
            >
              Retry
            </button>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Gas Saved</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? formatGasSaved(analytics.totalGasSaved) : '0 SHM'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Activity className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Total Batches</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? analytics.totalBatches.toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Transactions</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? analytics.totalTransactions.toLocaleString() : '0'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <Clock className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Avg Batch Size</p>
                <p className="text-2xl font-semibold text-gray-900">
                  {analytics ? analytics.averageBatchSize.toFixed(1) : '0'}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Network Health */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Shardeum Network Health</h3>
              <div className="flex items-center">
                {networkHealth?.isHealthy ? (
                  <CheckCircle className="h-5 w-5 text-green-500" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                )}
                <span className={`ml-2 text-sm font-medium ${
                  networkHealth?.isHealthy ? 'text-green-700' : 'text-red-700'
                }`}>
                  {networkHealth?.isHealthy ? 'Healthy' : 'Degraded'}
                </span>
              </div>
            </div>

            {networkHealth && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Nodes</span>
                  <span className="font-medium">{networkHealth.nodeCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Active Nodes</span>
                  <span className="font-medium">{networkHealth.cycleInfo.nodes.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Cycle</span>
                  <span className="font-medium">#{networkHealth.cycleInfo.cycleCounter}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Standby Nodes</span>
                  <span className="font-medium">{networkHealth.cycleInfo.nodes.standby}</span>
                </div>
              </div>
            )}
          </div>

          {/* Gas Optimization */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Gas Price Optimization</h3>
            
            {gasOptimization && (
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Current Gas Price</span>
                  <span className="font-medium">{formatGasPrice(gasOptimization.current)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Recommended (Batch)</span>
                  <span className="font-medium text-green-600">{formatGasPrice(gasOptimization.recommended)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Potential Savings</span>
                  <span className="font-medium text-green-600">{gasOptimization.savings.toFixed(1)}%</span>
                </div>
                <div className="mt-4 p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-green-700">
                    💡 Batch your transactions to save up to {gasOptimization.savings.toFixed(1)}% on gas costs!
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white p-6 rounded-lg shadow mb-8">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link 
              href="/batch"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="p-2 bg-indigo-100 rounded-lg mr-4">
                <Plus className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Create Batch</h4>
                <p className="text-sm text-gray-600">Add transactions to batch queue</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
            </Link>

            <Link 
              href="/analytics"
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="p-2 bg-purple-100 rounded-lg mr-4">
                <BarChart3 className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">View Analytics</h4>
                <p className="text-sm text-gray-600">Detailed performance metrics</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
            </Link>

            <button 
              onClick={fetchDashboardData}
              className="flex items-center p-4 border border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors"
            >
              <div className="p-2 bg-green-100 rounded-lg mr-4">
                <Activity className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <h4 className="font-medium text-gray-900">Refresh Data</h4>
                <p className="text-sm text-gray-600">Update network status</p>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400 ml-auto" />
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Getting Started</h3>
          <div className="space-y-4">
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">1</span>
              </div>
              <div className="ml-4">
                <h4 className="font-medium text-gray-900">Create your first batch</h4>
                <p className="text-sm text-gray-600">Start by adding transactions to the batch queue to optimize gas usage.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">2</span>
              </div>
              <div className="ml-4">
                <h4 className="font-medium text-gray-900">Monitor your savings</h4>
                <p className="text-sm text-gray-600">Track gas savings and performance metrics in the analytics dashboard.</p>
              </div>
            </div>
            <div className="flex items-start">
              <div className="flex-shrink-0 w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-indigo-600">3</span>
              </div>
              <div className="ml-4">
                <h4 className="font-medium text-gray-900">Integrate the SDK</h4>
                <p className="text-sm text-gray-600">Use our developer SDK to automatically batch transactions in your dApp.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 