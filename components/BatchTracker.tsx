'use client';

import { useState, useEffect } from 'react';
import { 
  Clock, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  ExternalLink,
  Play,
  Eye,
  RefreshCw
} from 'lucide-react';

interface BatchTransaction {
  id?: number;
  batchId: string;
  userAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress?: string;
  gasEstimate?: string;
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed';
  scheduledFor?: string;
  createdAt?: string;
  executedAt?: string;
  txHash?: string;
  errorMessage?: string;
}

interface BatchTrackerProps {
  userAddress?: string;
  onExecute?: (batchId: string) => void;
}

export default function BatchTracker({ userAddress, onExecute }: BatchTrackerProps) {
  const [batches, setBatches] = useState<BatchTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  useEffect(() => {
    if (userAddress) {
      fetchUserBatches();
    }
  }, [userAddress]);

  const fetchUserBatches = async () => {
    if (!userAddress) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/batch?userAddress=${userAddress}`);
      const data = await response.json();

      if (response.ok) {
        setBatches(data.batches || []);
      } else {
        setError(data.error || 'Failed to fetch batches');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error fetching batches:', err);
    } finally {
      setLoading(false);
    }
  };

  const executeTransaction = async (batchId: string) => {
    setExecuting(batchId);
    setError(null);

    try {
      const response = await fetch('/api/batch/execute', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ batchId }),
      });

      const data = await response.json();

      if (response.ok) {
        // Update the batch status locally
        setBatches(prev => prev.map(batch => 
          batch.batchId === batchId 
            ? { ...batch, status: 'executing' as const }
            : batch
        ));

        // Refresh batches after a delay to get updated status
        setTimeout(() => {
          fetchUserBatches();
        }, 3000);

        onExecute?.(batchId);
      } else {
        setError(data.error || 'Failed to execute transaction');
      }
    } catch (err) {
      setError('Network error occurred');
      console.error('Error executing transaction:', err);
    } finally {
      setExecuting(null);
    }
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

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleString();
  };

  const openExplorer = (txHash: string) => {
    window.open(`https://explorer-testnet.shardeum.org/transaction/${txHash}`, '_blank');
  };

  if (!userAddress) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center py-8">
          <p className="text-gray-500">Connect your wallet to view batch transactions</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Your Batch Transactions</h3>
          <button
            onClick={fetchUserBatches}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {loading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
            <span className="ml-2 text-gray-600">Loading batches...</span>
          </div>
        )}

        {!loading && batches.length === 0 && (
          <div className="text-center py-8">
            <p className="text-gray-500">No batch transactions found</p>
            <p className="text-sm text-gray-400 mt-1">Create your first batch transaction to get started</p>
          </div>
        )}

        {!loading && batches.length > 0 && (
          <div className="space-y-4">
            {batches.map((batch) => (
              <div key={batch.batchId} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      {getStatusIcon(batch.status)}
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(batch.status)}`}>
                        {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                      </span>
                      <span className="text-sm text-gray-500">
                        {batch.createdAt && formatDate(batch.createdAt)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">To Address</p>
                        <p className="font-medium text-gray-900">{formatAddress(batch.toAddress)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Amount</p>
                        <p className="font-medium text-gray-900">{formatAmount(batch.amount)}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Gas Estimate</p>
                        <p className="font-medium text-gray-900">
                          {batch.gasEstimate ? `${parseInt(batch.gasEstimate).toLocaleString()}` : 'N/A'}
                        </p>
                      </div>
                    </div>

                    {batch.txHash && (
                      <div className="mt-3 flex items-center space-x-2">
                        <span className="text-sm text-gray-600">Transaction Hash:</span>
                        <button
                          onClick={() => openExplorer(batch.txHash!)}
                          className="flex items-center space-x-1 text-sm text-indigo-600 hover:text-indigo-800 transition-colors"
                        >
                          <span className="font-mono">{formatAddress(batch.txHash!)}</span>
                          <ExternalLink className="h-3 w-3" />
                        </button>
                      </div>
                    )}

                    {batch.executedAt && (
                      <div className="mt-2 text-sm text-gray-600">
                        Executed: {formatDate(batch.executedAt)}
                      </div>
                    )}

                    {batch.errorMessage && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                        {batch.errorMessage}
                      </div>
                    )}
                  </div>

                  <div className="flex space-x-2 ml-4">
                    {batch.status === 'pending' && (
                      <button
                        onClick={() => executeTransaction(batch.batchId)}
                        disabled={executing === batch.batchId}
                        className="flex items-center space-x-1 px-3 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {executing === batch.batchId ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Play className="h-4 w-4" />
                        )}
                        <span className="text-sm">Execute</span>
                      </button>
                    )}

                    <button
                      onClick={fetchUserBatches}
                      className="flex items-center space-x-1 px-3 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-sm">Refresh</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 