'use client';

import { useState, useEffect } from 'react';
import { getInjPrice, getBalance, getStakingInfo } from '@/lib/injective';
import type { Balance, PriceData, StakingInfo } from '@/types';

export function useInjectiveData(address: string) {
  const [price, setPrice] = useState<PriceData>({ price: 0, change24h: 0 });
  const [balances, setBalances] = useState<Balance[]>([]);
  const [staking, setStaking] = useState<StakingInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!address) return;

    let cancelled = false;

    async function fetchAll() {
      setLoading(true);
      setError(null);
      console.log('[InjectiveData] Fetching for:', address);

      try {
        const [priceData, balanceData, stakingData] = await Promise.all([
          getInjPrice(),
          getBalance(address),
          getStakingInfo(address),
        ]);

        if (!cancelled) {
          console.log('[InjectiveData] Price:', priceData);
          console.log('[InjectiveData] Balances:', balanceData);
          console.log('[InjectiveData] Staking:', stakingData);
          setPrice(priceData);
          setBalances(balanceData);
          setStaking(stakingData);
        }
      } catch (err: any) {
        if (!cancelled) {
          console.error('[InjectiveData] Fetch error:', err);
          setError(err.message);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchAll();

    // Refresh every 30 seconds
    const interval = setInterval(fetchAll, 30_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [address]);

  return { price, balances, staking, loading, error, refetch: () => {} };
}