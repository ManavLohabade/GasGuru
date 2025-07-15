// GasGuru SDK for dApp Integration
// Provides easy-to-use hooks and utilities for transaction batching

export interface GasGuruConfig {
  apiUrl?: string;
  dappId: string;
  autoBackoff?: boolean;
  maxRetries?: number;
  batchSize?: number;
  minBatchWait?: number; // minutes
}

export interface TransactionRequest {
  from: string;
  to: string;
  amount: string;
  tokenAddress?: string;
  scheduledFor?: Date;
  metadata?: Record<string, any>;
}

export interface BatchResponse {
  success: boolean;
  batchId?: string;
  error?: string;
  gasEstimate?: string;
}

export interface BatchStatus {
  batchId: string;
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed';
  txHash?: string;
  gasUsed?: string;
  executedAt?: Date;
  errorMessage?: string;
}

export interface GasOptimizationSuggestion {
  currentGasPrice: string;
  recommendedGasPrice: string;
  potentialSavings: number;
  shouldBatch: boolean;
  estimatedWaitTime?: number;
}

export interface AnalyticsData {
  totalGasSaved: string;
  totalBatches: number;
  totalTransactions: number;
  averageBatchSize: number;
  savingsPercentage: number;
}

class GasGuruSDK {
  private config: Required<GasGuruConfig>;
  private pendingTransactions: Map<string, TransactionRequest> = new Map();
  private batchTimeouts: Map<string, NodeJS.Timeout> = new Map();

  constructor(config: GasGuruConfig) {
    this.config = {
      apiUrl: config.apiUrl || '/api',
      dappId: config.dappId,
      autoBackoff: config.autoBackoff ?? true,
      maxRetries: config.maxRetries ?? 3,
      batchSize: config.batchSize ?? 10,
      minBatchWait: config.minBatchWait ?? 5,
    };
  }

  // Add a transaction to the batch queue
  async addToBatch(transaction: TransactionRequest): Promise<BatchResponse> {
    try {
      const response = await this.apiCall('/batch', 'POST', {
        userAddress: transaction.from,
        toAddress: transaction.to,
        amount: transaction.amount,
        tokenAddress: transaction.tokenAddress,
        scheduledFor: transaction.scheduledFor?.toISOString(),
      });

      if (response.success) {
        return {
          success: true,
          batchId: response.batchId,
          gasEstimate: response.gasEstimate,
        };
      } else {
        return {
          success: false,
          error: response.error,
        };
      }
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Check the status of a batched transaction
  async getBatchStatus(batchId: string): Promise<BatchStatus | null> {
    try {
      const response = await this.apiCall(`/batch?batchId=${batchId}`, 'GET');
      
      if (response.success && response.transaction) {
        const tx = response.transaction;
        return {
          batchId: tx.batchId,
          status: tx.status,
          txHash: tx.txHash,
          gasUsed: tx.gasUsed,
          executedAt: tx.executedAt ? new Date(tx.executedAt) : undefined,
          errorMessage: tx.errorMessage,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get batch status:', error);
      return null;
    }
  }

  // Get gas optimization suggestions
  async getGasOptimization(): Promise<GasOptimizationSuggestion | null> {
    try {
      const response = await this.apiCall('/shardeum?action=gas-price', 'GET');
      
      if (response.success && response.data) {
        const data = response.data;
        return {
          currentGasPrice: data.current,
          recommendedGasPrice: data.recommended,
          potentialSavings: data.savings,
          shouldBatch: data.savings > 5, // Recommend batching if savings > 5%
          estimatedWaitTime: this.config.minBatchWait,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get gas optimization:', error);
      return null;
    }
  }

  // Get analytics for the dApp
  async getAnalytics(): Promise<AnalyticsData | null> {
    try {
      const response = await this.apiCall(`/analytics?dappId=${this.config.dappId}`, 'GET');
      
      if (response.success && response.analytics) {
        const analytics = response.analytics;
        return {
          totalGasSaved: analytics.totalGasSaved,
          totalBatches: analytics.totalBatches,
          totalTransactions: analytics.totalTransactions,
          averageBatchSize: analytics.averageBatchSize,
          savingsPercentage: analytics.totalBatches > 0 
            ? (analytics.totalGasSaved / (analytics.totalTransactions * 21000)) * 100 
            : 0,
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get analytics:', error);
      return null;
    }
  }

  // Estimate gas savings for multiple transactions
  async estimateBatchSavings(transactions: TransactionRequest[]): Promise<{
    individualGasCost: number;
    batchGasCost: number;
    savings: number;
    savingsPercentage: number;
  } | null> {
    try {
      const transactionObjects = transactions.map(tx => ({
        from: tx.from,
        to: tx.to,
        value: tx.amount,
      }));

      const response = await this.apiCall('/shardeum', 'POST', {
        transactions: transactionObjects,
      });

      if (response.success && response.data) {
        const data = response.data;
        return {
          individualGasCost: parseInt(data.individualGas.reduce((sum: number, gas: string) => 
            sum + parseInt(gas, 16), 0)),
          batchGasCost: parseInt(data.batchGas, 16),
          savings: parseInt(data.totalSavings, 16),
          savingsPercentage: data.savingsPercentage,
        };
      }

      return null;
    } catch (error) {
      console.error('Failed to estimate batch savings:', error);
      return null;
    }
  }

  // Auto-batch transactions with intelligent timing
  async autoBatch(transactions: TransactionRequest[]): Promise<BatchResponse[]> {
    const results: BatchResponse[] = [];
    
    // Group transactions by recipient and token
    const groups = this.groupTransactions(transactions);
    
    for (const group of groups) {
      if (group.length >= 2) {
        // Batch if we have multiple transactions to the same recipient
        for (const tx of group) {
          const result = await this.addToBatch(tx);
          results.push(result);
        }
      } else {
        // Single transaction - check if we should wait for more
        const optimization = await this.getGasOptimization();
        if (optimization?.shouldBatch) {
          // Wait for more transactions or batch after timeout
          this.scheduleDelayedBatch(group[0]);
        }
        
        const result = await this.addToBatch(group[0]);
        results.push(result);
      }
    }
    
    return results;
  }

  // Create scheduled batch for recurring transactions
  async createScheduledBatch(
    frequency: 'daily' | 'weekly' | 'monthly',
    executionTime?: Date
  ): Promise<{ success: boolean; batchId?: string; error?: string }> {
    try {
      // This would integrate with the scheduled batches API
      // For now, we'll simulate the response
      const batchId = `scheduled_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      return {
        success: true,
        batchId,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  // Monitor network health for optimal batching times
  async getNetworkHealth(): Promise<{
    isHealthy: boolean;
    nodeCount: number;
    cycleInfo: any;
    isOptimalBatchTime: boolean;
  } | null> {
    try {
      const response = await this.apiCall('/shardeum?action=network-health', 'GET');
      
      if (response.success && response.data) {
        const data = response.data;
        return {
          isHealthy: data.isHealthy,
          nodeCount: data.nodeCount,
          cycleInfo: data.cycleInfo,
          isOptimalBatchTime: data.isHealthy && data.nodeCount > 10, // Simple heuristic
        };
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get network health:', error);
      return null;
    }
  }

  // Utility methods
  private groupTransactions(transactions: TransactionRequest[]): TransactionRequest[][] {
    const groups = new Map<string, TransactionRequest[]>();
    
    for (const tx of transactions) {
      const key = `${tx.to}_${tx.tokenAddress || 'native'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }
    
    return Array.from(groups.values());
  }

  private scheduleDelayedBatch(transaction: TransactionRequest): void {
    const key = `${transaction.to}_${transaction.tokenAddress || 'native'}`;
    
    if (!this.pendingTransactions.has(key)) {
      this.pendingTransactions.set(key, transaction);
      
      const timeout = setTimeout(async () => {
        const pendingTx = this.pendingTransactions.get(key);
        if (pendingTx) {
          await this.addToBatch(pendingTx);
          this.pendingTransactions.delete(key);
          this.batchTimeouts.delete(key);
        }
      }, this.config.minBatchWait * 60 * 1000);
      
      this.batchTimeouts.set(key, timeout);
    }
  }

  private async apiCall(endpoint: string, method: 'GET' | 'POST', body?: any): Promise<any> {
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const url = `${this.config.apiUrl}${endpoint}`;
        const options: RequestInit = {
          method,
          headers: {
            'Content-Type': 'application/json',
          },
        };
        
        if (body && method === 'POST') {
          options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await response.json();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        if (attempt < this.config.maxRetries && this.config.autoBackoff) {
          // Exponential backoff
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }
    
    throw lastError;
  }

  // Cleanup method
  destroy(): void {
    for (const timeout of this.batchTimeouts.values()) {
      clearTimeout(timeout);
    }
    this.batchTimeouts.clear();
    this.pendingTransactions.clear();
  }
}

// React hooks for easy integration
export function useGasGuru(config: GasGuruConfig) {
  const sdk = new GasGuruSDK(config);
  
  return {
    addToBatch: sdk.addToBatch.bind(sdk),
    getBatchStatus: sdk.getBatchStatus.bind(sdk),
    getGasOptimization: sdk.getGasOptimization.bind(sdk),
    getAnalytics: sdk.getAnalytics.bind(sdk),
    estimateBatchSavings: sdk.estimateBatchSavings.bind(sdk),
    autoBatch: sdk.autoBatch.bind(sdk),
    createScheduledBatch: sdk.createScheduledBatch.bind(sdk),
    getNetworkHealth: sdk.getNetworkHealth.bind(sdk),
    destroy: sdk.destroy.bind(sdk),
  };
}

// Utility functions for common use cases
export const GasGuruUtils = {
  // Convert ETH to Wei
  ethToWei: (eth: string): string => {
    const ethValue = parseFloat(eth);
    return (ethValue * 1e18).toString();
  },
  
  // Convert Wei to ETH
  weiToEth: (wei: string): string => {
    const weiValue = BigInt(wei);
    return (Number(weiValue) / 1e18).toString();
  },
  
  // Format address for display
  formatAddress: (address: string): string => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  },
  
  // Calculate gas savings percentage
  calculateSavingsPercentage: (originalGas: number, optimizedGas: number): number => {
    return ((originalGas - optimizedGas) / originalGas) * 100;
  },
  
  // Estimate optimal batch size based on gas prices
  estimateOptimalBatchSize: (gasPrice: number, targetSavings: number = 30): number => {
    // Simple heuristic - higher gas prices benefit from larger batches
    if (gasPrice > 50) return 20;
    if (gasPrice > 20) return 15;
    if (gasPrice > 10) return 10;
    return 5;
  },
};

export default GasGuruSDK; 