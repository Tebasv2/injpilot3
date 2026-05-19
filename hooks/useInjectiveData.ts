'use client';

import { useState, useEffect, useCallback } from 'react';
import { getInjPrice, getBalance, getStakingInfo } from '@/lib/injective';
import type { Balance, PriceData, StakingInfo } from '@/types';

export function useInjectiveData(address: string) {
  const [price, setPrice] = useState<PriceData>({ price: 0, change24h: 0 });
  const [balances, setBalances] = useState<Balance[]>([]);
  const [staking, setStaking] = useState<StakingInfo | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAll = useCallback(async () => {
    if (!address) return;
    setLoading(true);

    try {
      const [priceData, balanceData, stakingData] = await Promise.all([
        getInjPrice(),
        getBalance(address),
        getStakingInfo(address),
      ]);

      setPrice(priceData);
      setBalances(balanceData);
      setStaking(stakingData);
    } catch (err) {
      console.error('Failed to fetch wallet data:', err);
    } finally {
      setLoading(false);
    }
  }, [address]);

  useEffect(() => {
    fetchAll();
    // Refresh every 30 seconds
    const interval = setInterval(fetchAll, 30_000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  return { price, balances, staking, loading, refetch: fetchAll };
}