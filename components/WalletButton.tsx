'use client';

import { useWallet } from '@/hooks/useWallet';
import { Wallet, LogOut, Loader2 } from 'lucide-react';

export default function WalletButton() {
  const { wallet, connect, disconnect, loading, error } = useWallet();

  if (wallet.isConnected) {
    return (
      <div className="flex items-center gap-2">
        <div className="glass px-3 py-1.5 rounded-lg">
          <p className="text-xs font-mono text-injective-500">
            {wallet.address.slice(0, 6)}...{wallet.address.slice(-4)}
          </p>
        </div>
        <button
          onClick={disconnect}
          className="glass p-1.5 rounded-lg hover:bg-injective-900/50 transition-colors"
          title="Disconnect"
        >
          <LogOut size={14} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={connect}
        disabled={loading}
        className="flex items-center gap-1.5 bg-injective-500 hover:bg-injective-600 px-3 py-2 rounded-lg text-sm font-medium transition-colors glow disabled:opacity-50"
      >
        {loading
          ? <Loader2 size={14} className="animate-spin" />
          : <Wallet size={14} />
        }
        {loading ? 'Connecting...' : 'Connect'}
      </button>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}