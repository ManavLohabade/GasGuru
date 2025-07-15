// Shardeum JSON-RPC API Service
// Uses only official Shardeum API endpoints

interface ShardeumRPCResponse<T> {
  jsonrpc: string;
  id: number;
  result?: T;
  error?: {
    code: number;
    message: string;
  };
}

interface TransactionObject {
  from: string;
  to?: string;
  gas?: string;
  gasPrice?: string;
  value?: string;
  data?: string;
  nonce?: string;
}

interface TransactionReceipt {
  blockHash: string;
  blockNumber: string;
  contractAddress: string | null;
  cumulativeGasUsed: string;
  effectiveGasPrice: string;
  from: string;
  gasUsed: string;
  logs: any[];
  logsBloom: string;
  to: string | null;
  transactionHash: string;
  transactionIndex: string;
  type: string;
  status: string;
}

interface NodeInfo {
  id: string;
  ip: string;
  port: number;
  publicKey: string;
}

interface NetworkAccount {
  activeVersion: string;
  latestVersion: string;
  minVersion: string;
  certCycleDuration: number;
  maintenanceFee: string;
  maintenanceInterval: number;
  penalty: {
    amount: string;
    currency: string;
  };
  reward: {
    amount: string;
    currency: string;
  };
  requiredStake: {
    amount: string;
    currency: string;
  };
  timestamp: number;
}

interface CycleInfo {
  cycleCounter: number;
  startTime: number;
  endTime: number;
  nodes: {
    active: number;
    standby: number;
    syncing: number;
    desired: number;
  };
  duration: number;
  maxSyncTime: number;
  timestamp: number;
}

class ShardeumAPI {
  private baseURL: string;
  private requestId: number = 1;

  constructor(rpcUrl: string = 'https://api.shardeum.org') {
    this.baseURL = rpcUrl;
  }

  private async makeRPCCall<T>(
    method: string,
    params: any[] = []
  ): Promise<T> {
    const response = await fetch(this.baseURL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method,
        params,
        id: this.requestId++,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ShardeumRPCResponse<T> = await response.json();

    if (data.error) {
      throw new Error(`RPC error: ${data.error.message}`);
    }

    if (data.result === undefined) {
      throw new Error('No result in RPC response');
    }

    return data.result;
  }

  // Gas and Network Information
  async getGasPrice(): Promise<string> {
    return this.makeRPCCall<string>('eth_gasPrice');
  }

  async estimateGas(transaction: TransactionObject): Promise<string> {
    return this.makeRPCCall<string>('eth_estimateGas', [transaction, 'latest']);
  }

  async getChainId(): Promise<string> {
    return this.makeRPCCall<string>('eth_chainId');
  }

  async getBlockNumber(): Promise<string> {
    return this.makeRPCCall<string>('eth_blockNumber');
  }

  // Balance and Account Information
  async getBalance(address: string, blockTag: string = 'latest'): Promise<string> {
    return this.makeRPCCall<string>('eth_getBalance', [address, blockTag]);
  }

  async getTransactionCount(address: string, blockTag: string = 'latest'): Promise<string> {
    return this.makeRPCCall<string>('eth_getTransactionCount', [address, blockTag]);
  }

  // Transaction Operations
  async sendTransaction(transaction: TransactionObject): Promise<string> {
    return this.makeRPCCall<string>('eth_sendTransaction', [transaction]);
  }

  async sendRawTransaction(signedTransaction: string): Promise<string> {
    return this.makeRPCCall<string>('eth_sendRawTransaction', [signedTransaction]);
  }

  async getTransactionByHash(hash: string): Promise<any> {
    return this.makeRPCCall<any>('eth_getTransactionByHash', [hash]);
  }

  async getTransactionReceipt(hash: string): Promise<TransactionReceipt> {
    return this.makeRPCCall<TransactionReceipt>('eth_getTransactionReceipt', [hash]);
  }

  // Shardeum-specific APIs
  async getNodeList(page: number = 1, limit: number = 100): Promise<{
    nodes: NodeInfo[];
    totalNodes: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    return this.makeRPCCall('shardeum_getNodeList', [{ page, limit }]);
  }

  async getNetworkAccount(): Promise<NetworkAccount> {
    return this.makeRPCCall<NetworkAccount>('shardeum_getNetworkAccount', []);
  }

  async getCycleInfo(cycleNumber?: number): Promise<{ cycleInfo: CycleInfo }> {
    return this.makeRPCCall('shardeum_getCycleInfo', [cycleNumber || null]);
  }

  // Gas Optimization Helpers
  async calculateOptimalGasPrice(): Promise<{
    current: string;
    recommended: string;
    savings: number;
  }> {
    const currentGasPrice = await this.getGasPrice();
    const networkInfo = await this.getNetworkAccount();
    
    // Shardeum has low and predictable gas fees
    // Recommend slightly lower than current for batched transactions
    const currentPriceWei = parseInt(currentGasPrice, 16);
    const recommendedPriceWei = Math.max(
      Math.floor(currentPriceWei * 0.95), // 5% reduction for batching
      1000000000 // minimum 1 gwei
    );
    
    return {
      current: currentGasPrice,
      recommended: `0x${recommendedPriceWei.toString(16)}`,
      savings: ((currentPriceWei - recommendedPriceWei) / currentPriceWei) * 100,
    };
  }

  async estimateBatchGasSavings(transactions: TransactionObject[]): Promise<{
    individualGas: string[];
    batchGas: string;
    totalSavings: string;
    savingsPercentage: number;
  }> {
    const individualEstimates = await Promise.all(
      transactions.map(tx => this.estimateGas(tx))
    );

    const totalIndividualGas = individualEstimates.reduce(
      (sum, gas) => sum + parseInt(gas, 16),
      0
    );

    // Simulate batch transaction (simplified)
    // In reality, this would be a more complex batching calculation
    const batchOverhead = 21000; // Base transaction cost
    const estimatedBatchGas = Math.floor(totalIndividualGas * 0.7) + batchOverhead;
    
    const savings = totalIndividualGas - estimatedBatchGas;
    const savingsPercentage = (savings / totalIndividualGas) * 100;

    return {
      individualGas: individualEstimates,
      batchGas: `0x${estimatedBatchGas.toString(16)}`,
      totalSavings: `0x${savings.toString(16)}`,
      savingsPercentage,
    };
  }

  // Network Health Monitoring
  async getNetworkHealth(): Promise<{
    nodeCount: number;
    cycleInfo: CycleInfo;
    networkAccount: NetworkAccount;
    isHealthy: boolean;
  }> {
    const [nodeList, cycleInfo, networkAccount] = await Promise.all([
      this.getNodeList(1, 10),
      this.getCycleInfo(),
      this.getNetworkAccount(),
    ]);

    const isHealthy = 
      nodeList.totalNodes > 0 && 
      cycleInfo.cycleInfo.nodes.active > 0 &&
      Date.now() - cycleInfo.cycleInfo.timestamp < 300000; // 5 minutes

    return {
      nodeCount: nodeList.totalNodes,
      cycleInfo: cycleInfo.cycleInfo,
      networkAccount,
      isHealthy,
    };
  }
}

export default ShardeumAPI;
export type { TransactionObject, TransactionReceipt, NodeInfo, NetworkAccount, CycleInfo }; 