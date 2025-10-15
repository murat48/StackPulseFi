'use client';

import { useEffect, useState } from 'react';
import { Wallet, LogOut } from 'lucide-react';
import { connectWallet, disconnectWallet, isWalletConnected, getUserAddress } from '@/lib/stacks/wallet';

export default function WalletConnect() {
  const [connected, setConnected] = useState(false);
  const [address, setAddress] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    const checkConnection = () => {
      try {
        const isConnected = isWalletConnected();
        setConnected(isConnected);
        if (isConnected) {
          const addr = getUserAddress();
          setAddress(addr);
          console.log('👛 Wallet connected:', addr);
        } else {
          console.log('👛 No wallet connected');
        }
      } catch (error) {
        console.error('Error checking wallet connection:', error);
      }
    };

    checkConnection();

    // Check connection status on focus
    window.addEventListener('focus', checkConnection);

    // Check periodically in case of state changes
    const interval = setInterval(checkConnection, 2000);

    return () => {
      window.removeEventListener('focus', checkConnection);
      clearInterval(interval);
    };
  }, [isClient]);

  const handleConnect = () => {
    console.log('🔌 Connect button clicked');
    connectWallet();
  };

  const handleDisconnect = () => {
    disconnectWallet();
    setConnected(false);
    setAddress(null);
  };

  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  if (connected && address) {
    return (
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 px-2 py-1.5 sm:px-3 sm:py-2 md:px-4 md:py-3 bg-green-100 text-green-800 rounded-lg sm:rounded-xl border border-green-200 shadow-lg">
          <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
          <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" />
          <span className="text-xs sm:text-sm font-semibold">{formatAddress(address)}</span>
        </div>
        <button
          onClick={handleDisconnect}
          className="p-2 sm:p-2.5 md:p-3 text-gray-600 hover:text-red-600 transition-all duration-300 hover:bg-red-50 rounded-lg sm:rounded-xl"
          title="Disconnect Wallet"
        >
          <LogOut size={16} className="sm:w-[18px] sm:h-[18px]" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={handleConnect}
      className="btn-primary flex items-center gap-2 sm:gap-3 px-3 py-2 sm:px-4 md:px-6 sm:py-2.5 md:py-3 text-sm sm:text-base font-semibold"
    >
      <Wallet size={16} className="sm:w-[18px] sm:h-[18px]" />
      <span>Connect Wallet</span>
    </button>
  );
}
