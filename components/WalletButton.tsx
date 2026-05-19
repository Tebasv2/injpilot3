'use client';

import { useWallet } from '@/hooks/useWallet';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export default function WalletButton() {
  const { wallet, connect, disconnect, loading, error } = useWallet();

  if (wallet.isConnected) {
    return (
      <div className="flex items-center gap-3">
        <div className="glass px-4 py-2 rounded-lg">
          <p className="text-xs text-injective-100 opacity-60">Connected</p>
          <p className="text-sm font-mono text-injective-500">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>
        <button
          onClick={disconnect}
          className="flex items-center gap-2 glass px-4 py-2 rounded-lg hover:bg-injective-900/50 transition-colors"
        >
          <LogOut size={16} />
          <span className="text-sm">Disconnect</span>
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={loading}
        className="flex items-center gap-2 bg-injective-500 hover:bg-injective-600 px-5 py-2.5 rounded-lg font-medium transition-colors glow disabled:opacity-50"
      >
        {loading ? <Loader2 size={16} className="animate-spin" /> : <Wallet size={16} />}
        {loading ? 'Connecting...' : 'Connect Wallet'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}