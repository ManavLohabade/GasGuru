import { ethers } from 'ethers';
import { EthereumProvider } from '@walletconnect/ethereum-provider';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export interface WalletState {
  isConnected: boolean;
  address: string;
  balance: string;
  chainId: string;
  provider?: any;
  type?: 'metamask' | 'walletconnect';
}

export interface WalletConfig {
  chainId: number;
  chainName: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
  rpcUrls: string[];
  blockExplorerUrls: string[];
}

const SHARDEUM_TESTNET_CONFIG: WalletConfig = {
  chainId: 8083,
  chainName: 'Shardeum Testnet',
  nativeCurrency: {
    name: 'Shardeum',
    symbol: 'SHM',
    decimals: 18,
  },
  rpcUrls: ['https://api-testnet.shardeum.org'],
  blockExplorerUrls: ['https://explorer-testnet.shardeum.org'],
};

class WalletService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.Signer | null = null;
  private walletConnectProvider: any | null = null;
  private currentWalletType: 'metamask' | 'walletconnect' | null = null;
  private readonly targetChainId = `0x${SHARDEUM_TESTNET_CONFIG.chainId.toString(16)}`;

  constructor() {
    this.setupEventListeners();
  }

  // Check if MetaMask is installed
  isMetaMaskInstalled(): boolean {
    return typeof window !== 'undefined' && typeof window.ethereum !== 'undefined';
  }

  // Initialize WalletConnect provider
  private async initWalletConnect(): Promise<any> {
    if (this.walletConnectProvider) {
      return this.walletConnectProvider;
    }

    const provider = await EthereumProvider.init({
      projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id', // Replace with your actual project ID
      chains: [SHARDEUM_TESTNET_CONFIG.chainId],
      showQrModal: true,
      metadata: {
        name: 'GasGuru',
        description: 'Batch transactions and save gas on Shardeum',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`],
      },
    });

    this.walletConnectProvider = provider;
    return provider;
  }

  // Connect with MetaMask
  async connectMetaMask(): Promise<WalletState> {
    if (!this.isMetaMaskInstalled()) {
      throw new Error('MetaMask is not installed. Please install MetaMask and try again.');
    }

    try {
      // Request account access
      const accounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (accounts.length === 0) {
        throw new Error('No accounts found. Please unlock your MetaMask wallet.');
      }

      // Initialize provider and signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();
      this.currentWalletType = 'metamask';

      const address = accounts[0];
      const chainId = await window.ethereum.request({ method: 'eth_chainId' });

      // Check if we're on the correct network
      if (chainId !== this.targetChainId) {
        await this.switchToShardeumTestnet();
      }

      // Get balance
      const balance = await this.getBalance(address);

      return {
        isConnected: true,
        address,
        balance,
        chainId,
        provider: this.provider,
        type: 'metamask',
      };
    } catch (error: any) {
      console.error('MetaMask connection failed:', error);
      throw new Error(`Failed to connect to MetaMask: ${error.message}`);
    }
  }

  // Connect with WalletConnect
  async connectWalletConnect(): Promise<WalletState> {
    try {
      const provider = await this.initWalletConnect();
      
      // Enable session (triggers QR Code modal)
      const accounts = await provider.enable();
      
      if (accounts.length === 0) {
        throw new Error('No accounts found');
      }

      // Initialize ethers provider
      this.provider = new ethers.BrowserProvider(provider);
      this.signer = await this.provider.getSigner();
      this.currentWalletType = 'walletconnect';

      const address = accounts[0];
      const chainId = await provider.request({ method: 'eth_chainId' });

      // Get balance
      const balance = await this.getBalance(address);

      return {
        isConnected: true,
        address,
        balance,
        chainId,
        provider: this.provider,
        type: 'walletconnect',
      };
    } catch (error: any) {
      console.error('WalletConnect connection failed:', error);
      throw new Error(`Failed to connect with WalletConnect: ${error.message}`);
    }
  }

  // Switch to Shardeum Testnet
  async switchToShardeumTestnet(): Promise<void> {
    if (this.currentWalletType === 'metamask' && window.ethereum) {
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: this.targetChainId }],
        });
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [
                {
                  chainId: this.targetChainId,
                  chainName: SHARDEUM_TESTNET_CONFIG.chainName,
                  nativeCurrency: SHARDEUM_TESTNET_CONFIG.nativeCurrency,
                  rpcUrls: SHARDEUM_TESTNET_CONFIG.rpcUrls,
                  blockExplorerUrls: SHARDEUM_TESTNET_CONFIG.blockExplorerUrls,
                },
              ],
            });
          } catch (addError: any) {
            throw new Error(`Failed to add Shardeum Testnet: ${addError.message}`);
          }
        } else {
          throw new Error(`Failed to switch to Shardeum Testnet: ${switchError.message}`);
        }
      }
    }
  }

  // Get account balance
  async getBalance(address: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const balance = await this.provider.getBalance(address);
      return ethers.formatEther(balance);
    } catch (error: any) {
      console.error('Error getting balance:', error);
      throw new Error(`Failed to get balance: ${error.message}`);
    }
  }

  // Send transaction
  async sendTransaction(to: string, amount: string, gasLimit?: number): Promise<string> {
    if (!this.signer) {
      throw new Error('Wallet not connected');
    }

    try {
      const value = ethers.parseEther(amount);
      
      const transaction: any = {
        to,
        value,
      };

      if (gasLimit) {
        transaction.gasLimit = gasLimit;
      }

      const txResponse = await this.signer.sendTransaction(transaction);
      return txResponse.hash;
    } catch (error: any) {
      console.error('Transaction failed:', error);
      throw new Error(`Transaction failed: ${error.message}`);
    }
  }

  // Estimate gas
  async estimateGas(to: string, amount: string): Promise<bigint> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const value = ethers.parseEther(amount);
      const gasEstimate = await this.provider.estimateGas({
        to,
        value,
      });
      return gasEstimate;
    } catch (error: any) {
      console.error('Gas estimation failed:', error);
      return BigInt(21000); // Default gas limit
    }
  }

  // Get current account
  async getCurrentAccount(): Promise<string | null> {
    if (!this.signer) {
      return null;
    }

    try {
      return await this.signer.getAddress();
    } catch (error) {
      console.error('Error getting current account:', error);
      return null;
    }
  }

  // Check if wallet is connected
  async isConnected(): Promise<boolean> {
    if (this.currentWalletType === 'metamask' && window.ethereum) {
      try {
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        return accounts.length > 0;
      } catch {
        return false;
      }
    }

    if (this.currentWalletType === 'walletconnect' && this.walletConnectProvider) {
      return this.walletConnectProvider.connected;
    }

    return false;
  }

  // Disconnect wallet
  async disconnect(): Promise<void> {
    if (this.currentWalletType === 'walletconnect' && this.walletConnectProvider) {
      await this.walletConnectProvider.disconnect();
    }

    this.provider = null;
    this.signer = null;
    this.walletConnectProvider = null;
    this.currentWalletType = null;
  }

  // Verify we're on the correct network
  async verifyNetwork(): Promise<boolean> {
    try {
      if (this.currentWalletType === 'metamask' && window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        return chainId === this.targetChainId;
      }

      if (this.currentWalletType === 'walletconnect' && this.walletConnectProvider) {
        const chainId = await this.walletConnectProvider.request({ method: 'eth_chainId' });
        return chainId === this.targetChainId;
      }

      return false;
    } catch {
      return false;
    }
  }

  // Format address for display
  formatAddress(address: string): string {
    if (!address) return '';
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }

  // Setup event listeners
  private setupEventListeners(): void {
    if (typeof window !== 'undefined' && window.ethereum) {
      // MetaMask events
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          this.disconnect();
        }
        window.location.reload(); // Simple reload for account changes
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload(); // Simple reload for chain changes
      });
    }
  }

  // Get wallet type
  getWalletType(): 'metamask' | 'walletconnect' | null {
    return this.currentWalletType;
  }

  // Get provider
  getProvider(): ethers.BrowserProvider | null {
    return this.provider;
  }

  // Get signer
  getSigner(): ethers.Signer | null {
    return this.signer;
  }
}

export default new WalletService(); 