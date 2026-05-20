'use client';

import { useWallet } from '@/hooks/useWallet';
import { useInjectiveData } from '@/hooks/useInjectiveData';
import { TrendingUp, TrendingDown, Coins, Shield, PieChart, Loader2, AlertCircle } from 'lucide-react';

export default function LiveDataPanel() {
  const { wallet } = useWallet();
  const { price, balances, staking, loading, error } = useInjectiveData(wallet.address);

  const injBalance = balances.find((b) => b.denom === 'inj');
  const balanceNum = injBalance ? parseFloat(injBalance.amount) / 1e18 : 0;

  if (!wallet.isConnected) {
    return (
      <div className="glass rounded-xl p-6 h-[400px] flex flex-col items-center justify-center text-center">
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

  if (loading && !price.price && !error) {
    return (
      <div className="glass rounded-xl p-6 h-[400px] flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={32} className="animate-spin text-injective-500 mx-auto mb-3" />
          <p className="text-sm text-injective-100 opacity-60">Loading wallet data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl p-5 flex flex-col gap-4 min-h-[400px] lg:min-h-0 overflow-y-auto scrollbar-hide">
      {/* Error Banner */}
      {error && (
        <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/30 rounded-lg p-3">
          <AlertCircle size={16} className="text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}

      {/* INJ Price Card */}
      <div className="bg-injective-900/30 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-injective-100 opacity-60 uppercase tracking-wider">INJ Price</span>
          <span className={`text-xs px-2 py-0.5 rounded-full ${price.change24h >= 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
            {price.change24h >= 0 ? '+' : ''}{price.change24h.toFixed(2)}%
          </span>
        </div>
        <p className="text-2xl font-bold text-white">
          {price.price > 0 ? `$${price.price.toFixed(2)}` : '—'}
        </p>
        {price.change24h !== 0 && (
          price.change24h >= 0
            ? <TrendingUp size={14} className="text-green-400 mt-1" />
            : <TrendingDown size={14} className="text-red-400 mt-1" />
        )}
      </div>

      {/* Balance Card */}
      <div className="bg-injective-900/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Coins size={14} className="text-injective-500" />
          <span className="text-xs text-injective-100 opacity-60 uppercase tracking-wider">Your Balance</span>
        </div>
        <p className="text-xl font-bold text-white">
          {balanceNum > 0 ? `${balanceNum.toFixed(4)} INJ` : '— INJ'}
        </p>
        <p className="text-xs text-injective-100 opacity-50 mt-1">
          {price.price > 0 && balanceNum > 0
            ? `≈ $${(balanceNum * price.price).toFixed(2)} USD`
            : 'Balance loading...'}
        </p>
        {balances.length > 1 && (
          <div className="mt-3 pt-3 border-t border-injective-900/50">
            <p className="text-xs text-injective-100 opacity-40 mb-2">Other tokens</p>
            {balances.slice(0, 5).filter(b => b.denom !== 'inj').map((b) => (
              <div key={b.denom} className="flex justify-between text-xs py-0.5">
                <span className="text-injective-100 opacity-70">{b.denom}</span>
                <span className="text-white">
                  {b.denom === 'usdt' || b.denom === 'usdc'
                    ? (parseFloat(b.amount) / 1e6).toFixed(2)
                    : (parseFloat(b.amount) / 1e18).toFixed(4)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Staking APY Card */}
      <div className="bg-injective-900/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} className="text-injective-500" />
          <span className="text-xs text-injective-100 opacity-60 uppercase tracking-wider">Staking APY</span>
        </div>
        <p className="text-xl font-bold text-white">
          {staking?.apy ? `${staking.apy.toFixed(1)}%` : '—'}
        </p>
        {staking && staking.totalRewards !== '0' && (
          <p className="text-xs text-green-400 mt-1">
            +{(parseFloat(staking.totalRewards) / 1e18).toFixed(4)} INJ rewards available
          </p>
        )}
      </div>

      {/* Portfolio Summary */}
      <div className="bg-injective-900/30 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <PieChart size={14} className="text-injective-500" />
          <span className="text-xs text-injective-100 opacity-60 uppercase tracking-wider">Portfolio</span>
        </div>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-xs text-injective-100 opacity-70">INJ</span>
            <span className="text-xs text-white">{balanceNum > 0 ? balanceNum.toFixed(4) : '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-injective-100 opacity-70">Tokens</span>
            <span className="text-xs text-white">{balances.length || '—'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-xs text-injective-100 opacity-70">Delegations</span>
            <span className="text-xs text-white">{staking?.delegations?.length || 0}</span>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-injective-900/30 rounded-xl p-4">
        <p className="text-xs text-injective-100 opacity-40 uppercase tracking-wider mb-3">Quick Ask</p>
        <div className="flex flex-col gap-2">
          {[
            "Where should I stake?",
            "Explain my transactions",
            "Diversify my portfolio?",
          ].map((q) => (
            <button
              key={q}
              className="text-left text-xs px-3 py-2 rounded-lg bg-injective-900/40 hover:bg-injective-900/60 text-injective-100 transition-colors"
            >
              → {q}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}