'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  Zap, 
  Plus, 
  Send, 
  Clock, 
  CheckCircle,
  AlertCircle,
  Loader2,
  Calendar,
  Users,
  DollarSign
} from 'lucide-react';
import WalletConnection from '../../components/WalletConnection';
import BatchTracker from '../../components/BatchTracker';
import walletService, { WalletState } from '../../lib/wallet-service';

interface BatchTransaction {
  batchId: string;
  userAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress?: string;
  gasEstimate?: string;
  status: string;
  scheduledFor?: string;
  createdAt?: string;
  txHash?: string;
}

export default function BatchPage() {
  const [formData, setFormData] = useState({
    userAddress: '',
    toAddress: '',
    amount: '',
    tokenAddress: '',
    scheduledFor: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recentBatch, setRecentBatch] = useState<BatchTransaction | null>(null);
  const [wallet, setWallet] = useState<WalletState | null>(null);

  const handleWalletConnect = (walletState: WalletState) => {
    setWallet(walletState);
    setFormData(prev => ({
      ...prev,
      userAddress: walletState.address
    }));
  };

  const handleWalletDisconnect = () => {
    setWallet(null);
    setFormData(prev => ({
      ...prev,
      userAddress: ''
    }));
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await fetch('/api/batch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userAddress: formData.userAddress,
          toAddress: formData.toAddress,
          amount: formData.amount,
          tokenAddress: formData.tokenAddress || undefined,
          scheduledFor: formData.scheduledFor || undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(`Transaction added to batch successfully! Batch ID: ${data.batchId}`);
        
        // Fetch the created transaction details
        const statusResponse = await fetch(`/api/batch?batchId=${data.batchId}`);
        if (statusResponse.ok) {
          const statusData = await statusResponse.json();
          setRecentBatch(statusData.transaction);
        }

        // Reset form
        setFormData({
          userAddress: '',
          toAddress: '',
          amount: '',
          tokenAddress: '',
          scheduledFor: ''
        });
      } else {
        setError(data.error || 'Failed to add transaction to batch');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Batch creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatAddress = (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatAmount = (amount: string): string => {
    const num = parseFloat(amount);
    if (num >= 1e18) {
      return `${(num / 1e18).toFixed(6)} SHM`;
    }
    return `${num.toLocaleString()} wei`;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      case 'executing':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'executing':
        return 'bg-blue-100 text-blue-800';
      case 'failed':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

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
              <Link href="/batch" className="text-indigo-600 font-medium">
                Batch Transactions
              </Link>
              <Link href="/analytics" className="text-gray-600 hover:text-indigo-600 font-medium">
                Analytics
              </Link>
              <WalletConnection 
                onConnect={handleWalletConnect}
                onDisconnect={handleWalletDisconnect}
                showBalance={false}
              />
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Batch Transactions</h2>
          <p className="text-gray-600">Create and manage batched transactions to optimize gas usage on Shardeum</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Create Batch Form */}
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center mb-6">
              <Plus className="h-6 w-6 text-indigo-600 mr-2" />
              <h3 className="text-xl font-semibold text-gray-900">Add Transaction to Batch</h3>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="userAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  From Address *
                </label>
                <input
                  type="text"
                  id="userAddress"
                  name="userAddress"
                  value={formData.userAddress}
                  onChange={handleInputChange}
                  placeholder="0x... (Connect wallet to auto-fill)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  required
                  disabled={!wallet}
                />
              </div>

              <div>
                <label htmlFor="toAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  To Address *
                </label>
                <input
                  type="text"
                  id="toAddress"
                  name="toAddress"
                  value={formData.toAddress}
                  onChange={handleInputChange}
                  placeholder="0x..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  required
                />
              </div>

              <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-2">
                  Amount (in wei) *
                </label>
                <input
                  type="number"
                  id="amount"
                  name="amount"
                  value={formData.amount}
                  onChange={handleInputChange}
                  placeholder="1000000000000000000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">1 SHM = 1,000,000,000,000,000,000 wei</p>
              </div>

              <div>
                <label htmlFor="tokenAddress" className="block text-sm font-medium text-gray-700 mb-2">
                  Token Address (optional)
                </label>
                <input
                  type="text"
                  id="tokenAddress"
                  name="tokenAddress"
                  value={formData.tokenAddress}
                  onChange={handleInputChange}
                  placeholder="0x... (leave empty for native SHM)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                />
              </div>

              <div>
                <label htmlFor="scheduledFor" className="block text-sm font-medium text-gray-700 mb-2">
                  Schedule For (optional)
                </label>
                <input
                  type="datetime-local"
                  id="scheduledFor"
                  name="scheduledFor"
                  value={formData.scheduledFor}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-gray-900 bg-white"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty for immediate batching</p>
              </div>

              {error && (
                <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              )}

              {success && (
                <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-green-700">{success}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                ) : (
                  <Send className="h-5 w-5 mr-2" />
                )}
                {loading ? 'Adding to Batch...' : 'Add to Batch'}
              </button>
            </form>
          </div>

          {/* Batch Information & Benefits */}
          <div className="space-y-6">
            {/* Benefits */}
            <div className="bg-white p-6 rounded-lg shadow">
              <h3 className="text-xl font-semibold text-gray-900 mb-4">Batching Benefits</h3>
              <div className="space-y-4">
                <div className="flex items-start">
                  <DollarSign className="h-5 w-5 text-green-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Gas Savings</h4>
                    <p className="text-sm text-gray-600">Save up to 70% on gas costs by combining multiple transactions</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Users className="h-5 w-5 text-blue-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Efficient Processing</h4>
                    <p className="text-sm text-gray-600">Process multiple transfers in a single transaction</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <Calendar className="h-5 w-5 text-purple-600 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-gray-900">Scheduled Execution</h4>
                    <p className="text-sm text-gray-600">Set future execution times for optimal gas prices</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Recent Batch */}
            {recentBatch && (
              <div className="bg-white p-6 rounded-lg shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Recently Added</h3>
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-900">
                      Batch ID: {recentBatch.batchId.slice(0, 16)}...
                    </span>
                    <div className="flex items-center">
                      {getStatusIcon(recentBatch.status)}
                      <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(recentBatch.status)}`}>
                        {recentBatch.status}
                      </span>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">From:</span>
                      <span className="font-mono">{formatAddress(recentBatch.userAddress)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">To:</span>
                      <span className="font-mono">{formatAddress(recentBatch.toAddress)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Amount:</span>
                      <span className="font-medium">{formatAmount(recentBatch.amount)}</span>
                    </div>
                    {recentBatch.gasEstimate && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Est. Gas:</span>
                        <span className="font-medium">{parseInt(recentBatch.gasEstimate).toLocaleString()}</span>
                      </div>
                    )}
                    {recentBatch.txHash && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Tx Hash:</span>
                        <span className="font-mono text-blue-600">{formatAddress(recentBatch.txHash)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* How It Works */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 rounded-lg text-white">
              <h3 className="text-xl font-semibold mb-4">How Batching Works</h3>
              <div className="space-y-3">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    1
                  </div>
                  <p className="text-sm">Add your transaction to the batch queue</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    2
                  </div>
                  <p className="text-sm">GasGuru groups similar transactions together</p>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-6 h-6 bg-white bg-opacity-20 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                    3
                  </div>
                  <p className="text-sm">Batch executes at optimal time with reduced gas costs</p>
                </div>
              </div>
            </div>
          </div>

          {/* Batch Tracker */}
          <div className="mt-8">
            <BatchTracker 
              userAddress={wallet?.address}
              onExecute={(batchId) => {
                console.log('Executing batch:', batchId);
                setSuccess(`Executing batch transaction: ${batchId}`);
              }}
            />
          </div>
        </div>
      </main>
    </div>
  );
} 