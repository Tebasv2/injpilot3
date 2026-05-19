'use client';

import { useWallet } from '@/hooks/useWallet';
import { useInjectiveData } from '@/hooks/useInjectiveData';
import { TrendingUp, TrendingDown, Coins, Shield, PieChart, Loader2 } from 'lucide-react';

export default function LiveDataPanel() {
  const { wallet } = useWallet();
  const { price, balances, staking, loading } = useInjectiveData(wallet.address);

  const injBalance = balances.find((b) => b.denom === 'inj');
  const balanceNum = injBalance ? parseFloat(injBalance.amount) / 1e18 : 0;

  if (!wallet.isConnected) {
    return (
      <div className="glass rounded-xl p-6 h-full flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 rounded-full bg-injective-900/50 flex items-center justify-center mb-4">
          <Coins size={24} className="text-injective-500" />
        </div>
        <h3 className="text-white font-medium mb-2">Wallet Not Connected</h3>
        <p className="text-sm text-injective-100 opacity-50">
          Connect your Keplr wallet to see live data
        </p>
      </div>
    );
  }

  if (loading && !price.price) {
    return (
      <div className="glass rounded-xl p-6 h-full flex items-center justify-center">
        <Loader2 size={32} className="animate-spin text-injective-500" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 h-full overflow-y-auto scrollbar-hide">
      {/* INJ Price Card */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-injective-100 opacity-60">INJ Price</span>
          <span className={`text-xs px-2 py-1 rounded-full ${price.change24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
          </span>
        </div>
        <p className="text-3xl font-bold text-white">${price.price.toFixed(2)}</p>
        {price.change24h >= 0 ? (
          <TrendingUp size={16} className="text-green-400 mt-1" />
        ) : (
          <TrendingDown size={16} className="text-red-400 mt-1" />
        )}
      </div>

      {/* Balance Card */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Coins size={16} className="text-injective-500" />
          <span className="text-sm text-injective-100 opacity-60">Your Balance</span>
        </div>
        <p className="text-2xl font-bold text-white">{balanceNum.toFixed(4)} INJ</p>
        <p className="text-sm text-injective-100 opacity-50 mt-1">
          ≈ ${(balanceNum * price.price).toFixed(2)} USD
        </p>
        {balances.length > 1 && (
          <div className="mt-3 pt-3 border-t border-injective-900/50">
            <p className="text-xs text-injective-100 opacity-40 mb-2">Other tokens</p>
            {balances.slice(0, 5).filter(b => b.denom !== 'inj').map((b) => (
              <div key={b.denom} className="flex justify-between text-sm py-0.5">
                <span className="text-injective-100 opacity-70">{b.denom}</span>
                <span className="text-white">{(parseFloat(b.amount) / 1e6).toFixed(2)}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staking APY Card */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <Shield size={16} className="text-injective-500" />
          <span className="text-sm text-injective-100 opacity-60">Staking APY</span>
        </div>
        <p className="text-2xl font-bold text-white">{staking?.apy.toFixed(1) || '14.5'}%</p>
        {staking && staking.totalRewards !== '0' && (
          <p className="text-sm text-green-400 mt-1">
            +{(parseFloat(staking.totalRewards) / 1e18).toFixed(2)} INJ rewards available
          </p>
        )}
      </div>

      {/* Portfolio Summary */}
      <div className="glass rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <PieChart size={16} className="text-injective-500" />
          <span className="text-sm text-injective-100 opacity-60">Portfolio</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-sm text-injective-100 opacity-70">INJ</span>
            <span className="text-sm text-white">{balanceNum.toFixed(2)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-injective-100 opacity-70">USDT</span>
            <span className="text-sm text-white">—</span>
          </div>
          <div className="flex justify-between">
            <span className="text-sm text-injective-100 opacity-70">Positions</span>
            <span className="text-sm text-white">{balances.length}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass rounded-xl p-5">
        <p className="text-sm text-injective-100 opacity-60 mb-3">Quick Ask</p>
        <div className="flex flex-col gap-2">
          {[
            "Stake for best APY?",
            "Explain my transactions",
            "Diversify my portfolio?",
          ].map((q) => (
            <button
              key={q}
              className="text-left text-xs px-3 py-2 rounded-lg bg-injective-900/30 hover:bg-injective-900/50 text-injective-100 transition-colors"
            >
              → {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}