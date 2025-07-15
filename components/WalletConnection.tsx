'use client';

import { useState, useEffect } from 'react';
import { Wallet, ExternalLink, Zap, Users } from 'lucide-react';
import walletService, { WalletState } from '../lib/wallet-service';

interface WalletConnectionProps {
  onConnect?: (walletState: WalletState) => void;
  onDisconnect?: () => void;
  showBalance?: boolean;
  className?: string;
}

export default function WalletConnection({ 
  onConnect, 
  onDisconnect, 
  showBalance = true,
  className = '' 
}: WalletConnectionProps) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConnectModal, setShowConnectModal] = useState(false);

  useEffect(() => {
    checkConnection();
  }, []);

  const checkConnection = async () => {
    try {
      const isConnected = await walletService.isConnected();
      if (isConnected) {
        const address = await walletService.getCurrentAccount();
        if (address) {
          const balance = await walletService.getBalance(address);
          const walletType = walletService.getWalletType();
          setWallet({
            isConnected: true,
            address,
            balance,
            chainId: '0x1f93', // Shardeum testnet
            type: walletType || 'metamask',
          });
        }
      }
    } catch (error) {
      console.error('Error checking wallet connection:', error);
    }
  };

  const connectMetaMask = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletState = await walletService.connectMetaMask();
      setWallet(walletState);
      setShowConnectModal(false);
      onConnect?.(walletState);
    } catch (error: any) {
      setError(error.message);
      console.error('MetaMask connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const connectWalletConnect = async () => {
    setIsConnecting(true);
    setError(null);
    
    try {
      const walletState = await walletService.connectWalletConnect();
      setWallet(walletState);
      setShowConnectModal(false);
      onConnect?.(walletState);
    } catch (error: any) {
      setError(error.message);
      console.error('WalletConnect connection failed:', error);
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnect = async () => {
    try {
      await walletService.disconnect();
      setWallet(null);
      onDisconnect?.();
    } catch (error) {
      console.error('Disconnect failed:', error);
    }
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    if (num < 0.001) return '< 0.001';
    return num.toFixed(4);
  };

  if (wallet?.isConnected) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {showBalance && (
          <div className="text-sm">
            <span className="text-gray-600">Balance: </span>
            <span className="font-semibold text-gray-900">
              {formatBalance(wallet.balance)} SHM
            </span>
          </div>
        )}
        
        <div className="flex items-center space-x-2 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          <span className="text-sm font-medium text-green-800">
            {walletService.formatAddress(wallet.address)}
          </span>
          <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded">
            {wallet.type === 'metamask' ? 'MetaMask' : 'WalletConnect'}
          </span>
        </div>
        
        <button
          onClick={disconnect}
          className="text-sm text-gray-600 hover:text-red-600 transition-colors"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <div className={className}>
      <button
        onClick={() => setShowConnectModal(true)}
        className="flex items-center space-x-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
      >
        <Wallet className="w-4 h-4" />
        <span>Connect Wallet</span>
      </button>

      {/* Connection Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Connect Your Wallet</h3>
              <p className="text-gray-600">
                Choose your preferred wallet to connect to GasGuru
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            <div className="space-y-3">
              {/* MetaMask Option */}
              <button
                onClick={connectMetaMask}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center">
                    <Zap className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">MetaMask</p>
                    <p className="text-sm text-gray-600">Connect using MetaMask browser extension</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>

              {/* WalletConnect Option */}
              <button
                onClick={connectWalletConnect}
                disabled={isConnecting}
                className="w-full flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-gray-900">WalletConnect</p>
                    <p className="text-sm text-gray-600">Scan QR code with your mobile wallet</p>
                  </div>
                </div>
                <ExternalLink className="w-4 h-4 text-gray-400" />
              </button>
            </div>

            {isConnecting && (
              <div className="mt-4 flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-indigo-600"></div>
                <span className="text-sm text-gray-600">Connecting...</span>
              </div>
            )}

            <button
              onClick={() => setShowConnectModal(false)}
              className="w-full mt-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
            >
              Cancel
            </button>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> GasGuru works on Shardeum Testnet. 
                Make sure your wallet is connected to the correct network.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 