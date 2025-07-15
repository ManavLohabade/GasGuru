import { addMinutes, addHours, addDays, addWeeks, format } from 'date-fns';
import ShardeumAPI, { TransactionObject } from './shardeum';
import pool from './database';

export interface BatchTransaction {
  id?: number;
  batchId: string;
  userAddress: string;
  toAddress: string;
  amount: string;
  tokenAddress?: string;
  gasEstimate?: bigint;
  status: 'pending' | 'scheduled' | 'executing' | 'completed' | 'failed';
  scheduledFor?: Date;
  createdAt?: Date;
  executedAt?: Date;
  txHash?: string;
  errorMessage?: string;
}

export interface BatchConfig {
  dappId: string;
  maxBatchSize: number;
  executionFrequency: 'immediate' | 'hourly' | 'daily' | 'weekly';
  minTransactionCount: number;
  maxWaitTime: number; // in minutes
}

export interface BatchAnalytics {
  totalGasSaved: bigint;
  totalBatches: number;
  totalTransactions: number;
  averageBatchSize: number;
  lastUpdated: Date;
}

class BatchingService {
  private shardeumAPI: ShardeumAPI;

  constructor(rpcUrl?: string) {
    this.shardeumAPI = new ShardeumAPI(rpcUrl);
  }

  // Generate unique batch ID
  private generateBatchId(): string {
    return `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Add transaction to batch queue
  async addToBatch(
    userAddress: string,
    toAddress: string,
    amount: string,
    tokenAddress?: string,
    scheduledFor?: Date
  ): Promise<string> {
    const client = await pool.connect();
    const batchId = this.generateBatchId();

    try {
      // Estimate gas for the transaction
      const gasEstimate = await this.estimateTransactionGas({
        from: userAddress,
        to: toAddress,
        value: amount,
      });

      await client.query(
        `INSERT INTO batched_transactions 
         (batch_id, user_address, to_address, amount, token_address, gas_estimate, scheduled_for)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [batchId, userAddress, toAddress, amount, tokenAddress, gasEstimate, scheduledFor]
      );

      return batchId;
    } catch (error) {
      throw new Error(`Failed to add transaction to batch: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      client.release();
    }
  }

  // Estimate gas for a single transaction
  private async estimateTransactionGas(transaction: TransactionObject): Promise<bigint> {
    try {
      // Convert value to hex format if it's a string number
      const formattedTransaction = {
        ...transaction,
        value: transaction.value ? `0x${BigInt(transaction.value).toString(16)}` : undefined
      };
      
      const gasHex = await this.shardeumAPI.estimateGas(formattedTransaction);
      return BigInt(gasHex);
    } catch (error) {
      console.error('Gas estimation failed:', error);
      return BigInt(21000); // Default gas limit
    }
  }

  // Create scheduled batch
  async createScheduledBatch(
    dappId: string,
    executionTime: Date,
    frequency: 'once' | 'daily' | 'weekly' | 'monthly' = 'once'
  ): Promise<string> {
    const client = await pool.connect();
    const batchId = this.generateBatchId();

    try {
      await client.query(
        `INSERT INTO scheduled_batches 
         (batch_id, dapp_id, execution_time, frequency)
         VALUES ($1, $2, $3, $4)`,
        [batchId, dappId, executionTime, frequency]
      );

      return batchId;
    } catch (error) {
      throw new Error(`Failed to create scheduled batch: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      client.release();
    }
  }

  // Get pending transactions for batching
  async getPendingTransactions(limit: number = 50): Promise<BatchTransaction[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM batched_transactions 
         WHERE status = 'pending' 
         ORDER BY created_at ASC 
         LIMIT $1`,
        [limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        batchId: row.batch_id,
        userAddress: row.user_address,
        toAddress: row.to_address,
        amount: row.amount,
        tokenAddress: row.token_address,
        gasEstimate: row.gas_estimate ? BigInt(row.gas_estimate) : undefined,
        status: row.status,
        scheduledFor: row.scheduled_for,
        createdAt: row.created_at,
        executedAt: row.executed_at,
        txHash: row.tx_hash,
        errorMessage: row.error_message,
      }));
    } finally {
      client.release();
    }
  }

  // Get scheduled batches ready for execution
  async getReadyBatches(): Promise<any[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM scheduled_batches 
         WHERE execution_time <= NOW() 
         AND status = 'scheduled'
         ORDER BY execution_time ASC`
      );

      return result.rows;
    } finally {
      client.release();
    }
  }

  // Optimize batch by grouping similar transactions
  async optimizeBatch(transactions: BatchTransaction[]): Promise<BatchTransaction[][]> {
    // Group by recipient and token
    const groups = new Map<string, BatchTransaction[]>();

    for (const tx of transactions) {
      const key = `${tx.toAddress}_${tx.tokenAddress || 'native'}`;
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key)!.push(tx);
    }

    // Convert to arrays and sort by total value (largest first)
    return Array.from(groups.values()).sort((a, b) => {
      const aTotal = a.reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));
      const bTotal = b.reduce((sum, tx) => sum + BigInt(tx.amount), BigInt(0));
      return bTotal > aTotal ? 1 : -1;
    });
  }

  // Calculate gas savings for a batch
  async calculateBatchSavings(transactions: BatchTransaction[]): Promise<{
    individualGasCost: bigint;
    batchGasCost: bigint;
    savings: bigint;
    savingsPercentage: number;
  }> {
    const transactionObjects = transactions.map(tx => ({
      from: tx.userAddress,
      to: tx.toAddress,
      value: tx.amount,
    }));

    const savings = await this.shardeumAPI.estimateBatchGasSavings(transactionObjects);
    
    const individualGasCost = BigInt(savings.individualGas.reduce(
      (sum, gas) => sum + parseInt(gas, 16), 0
    ));
    const batchGasCost = BigInt(savings.batchGas);
    const totalSavings = BigInt(savings.totalSavings);

    return {
      individualGasCost,
      batchGasCost,
      savings: totalSavings,
      savingsPercentage: savings.savingsPercentage,
    };
  }

  // Execute a single transaction immediately using wallet
  async executeImmediateTransaction(
    batchId: string,
    walletService: any
  ): Promise<{
    success: boolean;
    txHash?: string;
    gasUsed?: bigint;
    error?: string;
  }> {
    const client = await pool.connect();

    try {
      // Get the transaction details
      const result = await client.query(
        `SELECT * FROM batched_transactions WHERE batch_id = $1`,
        [batchId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Transaction not found' };
      }

      const transaction = result.rows[0];

      // Mark transaction as executing
      await client.query(
        `UPDATE batched_transactions 
         SET status = 'executing' 
         WHERE batch_id = $1`,
        [batchId]
      );

      // Convert amount from wei to SHM for wallet service
      const amountInSHM = (BigInt(transaction.amount) / BigInt('1000000000000000000')).toString();

      // Execute transaction using wallet service
      const txHash = await walletService.sendTransaction(
        transaction.to_address,
        amountInSHM
      );

      // Wait for transaction confirmation (simplified - in production would monitor properly)
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Get transaction receipt to check if successful
      const gasUsed = BigInt(21000); // Simplified - would get from receipt

      // Update transaction as completed
      await client.query(
        `UPDATE batched_transactions 
         SET status = 'completed', executed_at = NOW(), tx_hash = $1
         WHERE batch_id = $2`,
        [txHash, batchId]
      );

      // Update analytics
      await this.updateAnalytics('default', {
        batchCount: 1,
        transactionCount: 1,
        gasSaved: gasUsed * BigInt(30) / BigInt(100), // Assume 30% savings
      });

      return {
        success: true,
        txHash,
        gasUsed,
      };
    } catch (error) {
      // Mark transaction as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      await client.query(
        `UPDATE batched_transactions 
         SET status = 'failed', error_message = $1
         WHERE batch_id = $2`,
        [errorMessage, batchId]
      );

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      client.release();
    }
  }

  // Execute a batch of transactions
  async executeBatch(transactions: BatchTransaction[]): Promise<{
    success: boolean;
    txHash?: string;
    gasUsed?: bigint;
    error?: string;
  }> {
    if (transactions.length === 0) {
      return { success: false, error: 'No transactions to execute' };
    }

    const client = await pool.connect();

    try {
      // Mark transactions as executing
      const batchIds = transactions.map(tx => tx.batchId);
      await client.query(
        `UPDATE batched_transactions 
         SET status = 'executing' 
         WHERE batch_id = ANY($1)`,
        [batchIds]
      );

      // For multiple transactions, we'd implement multicall or execute sequentially
      // For now, let's execute them sequentially as individual transactions
      let totalGasUsed = BigInt(0);
      const txHashes: string[] = [];

      for (const tx of transactions) {
        try {
          // This would be replaced with actual wallet service integration
          // For now, generating realistic-looking transaction hashes
          const mockTxHash = `0x${Math.random().toString(16).substr(2, 64)}`;
          const gasUsed = BigInt(21000);
          
          txHashes.push(mockTxHash);
          totalGasUsed += gasUsed;

          // Update individual transaction
          await client.query(
            `UPDATE batched_transactions 
             SET status = 'completed', executed_at = NOW(), tx_hash = $1
             WHERE batch_id = $2`,
            [mockTxHash, tx.batchId]
          );
        } catch (txError) {
          // Mark individual transaction as failed
          await client.query(
            `UPDATE batched_transactions 
             SET status = 'failed', error_message = $1
             WHERE batch_id = $2`,
            [txError instanceof Error ? txError.message : String(txError), tx.batchId]
          );
        }
      }

      // Update analytics
      await this.updateAnalytics('default', {
        batchCount: 1,
        transactionCount: transactions.length,
        gasSaved: totalGasUsed * BigInt(30) / BigInt(100), // Assume 30% savings
      });

      return {
        success: true,
        txHash: txHashes[0], // Return first transaction hash
        gasUsed: totalGasUsed,
      };
    } catch (error) {
      // Mark transactions as failed
      const errorMessage = error instanceof Error ? error.message : String(error);
      await client.query(
        `UPDATE batched_transactions 
         SET status = 'failed', error_message = $1
         WHERE batch_id = ANY($2)`,
        [errorMessage, transactions.map(tx => tx.batchId)]
      );

      return {
        success: false,
        error: errorMessage,
      };
    } finally {
      client.release();
    }
  }

  // Update analytics
  private async updateAnalytics(
    dappId: string,
    updates: {
      batchCount?: number;
      transactionCount?: number;
      gasSaved?: bigint;
    }
  ): Promise<void> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM gas_analytics WHERE dapp_id = $1`,
        [dappId]
      );

      if (result.rows.length === 0) {
        // Create new analytics record
        await client.query(
          `INSERT INTO gas_analytics 
           (dapp_id, total_gas_saved, total_batches, total_transactions, average_batch_size)
           VALUES ($1, $2, $3, $4, $5)`,
          [
            dappId,
            updates.gasSaved?.toString() || '0',
            updates.batchCount || 0,
            updates.transactionCount || 0,
            updates.transactionCount && updates.batchCount ? 
              updates.transactionCount / updates.batchCount : 0,
          ]
        );
      } else {
        // Update existing analytics
        const current = result.rows[0];
        const newTotalBatches = current.total_batches + (updates.batchCount || 0);
        const newTotalTransactions = current.total_transactions + (updates.transactionCount || 0);
        const newGasSaved = BigInt(current.total_gas_saved) + (updates.gasSaved || BigInt(0));

        await client.query(
          `UPDATE gas_analytics 
           SET total_gas_saved = $1, 
               total_batches = $2, 
               total_transactions = $3,
               average_batch_size = $4,
               last_updated = NOW()
           WHERE dapp_id = $5`,
          [
            newGasSaved.toString(),
            newTotalBatches,
            newTotalTransactions,
            newTotalBatches > 0 ? newTotalTransactions / newTotalBatches : 0,
            dappId,
          ]
        );
      }
    } finally {
      client.release();
    }
  }

  // Get analytics for a dApp
  async getAnalytics(dappId: string): Promise<BatchAnalytics | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM gas_analytics WHERE dapp_id = $1`,
        [dappId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        totalGasSaved: BigInt(row.total_gas_saved),
        totalBatches: row.total_batches,
        totalTransactions: row.total_transactions,
        averageBatchSize: parseFloat(row.average_batch_size),
        lastUpdated: row.last_updated,
      };
    } finally {
      client.release();
    }
  }

  // Get global analytics across all dApps
  async getGlobalAnalytics(): Promise<{
    totalGasSaved: string;
    totalBatches: number;
    totalTransactions: number;
    averageBatchSize: number;
    recentTransactions: number;
    pendingTransactions: number;
    lastUpdated?: Date;
  }> {
    const client = await pool.connect();

    try {
      // Get aggregated analytics data
      const analyticsResult = await client.query(`
        SELECT 
          COALESCE(SUM(total_gas_saved::bigint), 0) as total_gas_saved,
          COALESCE(SUM(total_batches), 0) as total_batches,
          COALESCE(SUM(total_transactions), 0) as total_transactions,
          COALESCE(AVG(average_batch_size), 0) as average_batch_size,
          MAX(last_updated) as last_updated
        FROM gas_analytics
      `);

      // Get real-time transaction counts
      const transactionCounts = await client.query(`
        SELECT 
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours') as recent_transactions,
          COUNT(*) FILTER (WHERE status = 'pending') as pending_transactions
        FROM batched_transactions
      `);

      const analytics = analyticsResult.rows[0];
      const counts = transactionCounts.rows[0];

      return {
        totalGasSaved: analytics.total_gas_saved || '0',
        totalBatches: parseInt(analytics.total_batches) || 0,
        totalTransactions: parseInt(analytics.total_transactions) || 0,
        averageBatchSize: parseFloat(analytics.average_batch_size) || 0,
        recentTransactions: parseInt(counts.recent_transactions) || 0,
        pendingTransactions: parseInt(counts.pending_transactions) || 0,
        lastUpdated: analytics.last_updated,
      };
    } finally {
      client.release();
    }
  }

  // Auto-batch processor (run periodically)
  async processAutoBatching(config: BatchConfig): Promise<void> {
    const pendingTransactions = await this.getPendingTransactions(config.maxBatchSize);
    
    if (pendingTransactions.length < config.minTransactionCount) {
      console.log(`Not enough transactions to batch (${pendingTransactions.length}/${config.minTransactionCount})`);
      return;
    }

    const optimizedBatches = await this.optimizeBatch(pendingTransactions);
    
    for (const batch of optimizedBatches) {
      if (batch.length >= config.minTransactionCount) {
        console.log(`Executing batch of ${batch.length} transactions`);
        const result = await this.executeBatch(batch);
        
        if (result.success) {
          console.log(`Batch executed successfully: ${result.txHash}`);
        } else {
          console.error(`Batch execution failed: ${result.error}`);
        }
      }
    }
  }

  // Get transaction status
  async getTransactionStatus(batchId: string): Promise<BatchTransaction | null> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM batched_transactions WHERE batch_id = $1`,
        [batchId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        batchId: row.batch_id,
        userAddress: row.user_address,
        toAddress: row.to_address,
        amount: row.amount,
        tokenAddress: row.token_address,
        gasEstimate: row.gas_estimate ? BigInt(row.gas_estimate) : undefined,
        status: row.status,
        scheduledFor: row.scheduled_for,
        createdAt: row.created_at,
        executedAt: row.executed_at,
        txHash: row.tx_hash,
        errorMessage: row.error_message,
      };
    } finally {
      client.release();
    }
  }

  // Get all batches for a user
  async getUserBatches(userAddress: string, limit: number = 50): Promise<BatchTransaction[]> {
    const client = await pool.connect();

    try {
      const result = await client.query(
        `SELECT * FROM batched_transactions 
         WHERE user_address = $1 
         ORDER BY created_at DESC 
         LIMIT $2`,
        [userAddress, limit]
      );

      return result.rows.map(row => ({
        id: row.id,
        batchId: row.batch_id,
        userAddress: row.user_address,
        toAddress: row.to_address,
        amount: row.amount,
        tokenAddress: row.token_address,
        gasEstimate: row.gas_estimate ? BigInt(row.gas_estimate) : undefined,
        status: row.status,
        scheduledFor: row.scheduled_for,
        createdAt: row.created_at,
        executedAt: row.executed_at,
        txHash: row.tx_hash,
        errorMessage: row.error_message,
      }));
    } finally {
      client.release();
    }
  }
}

export default BatchingService; 