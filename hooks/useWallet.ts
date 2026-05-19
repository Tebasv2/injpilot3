'use client';

import { useState, useEffect, useCallback } from 'react';
import type { Wallet } from '@/types';

declare global {
  interface Window {
    keplr?: any;
    getOfflineSigner?: (chainId: string) => any;
  }
}

const CHAIN_ID = process.env.NEXT_PUBLIC_INJECTIVE_CHAIN_ID || 'injective-1';

export function useWallet() {
  const [wallet, setWallet] = useState<Wallet>({
    address: '',
    injectiveAddress: '',
    isConnected: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const connect = useCallback(async () => {
    if (!window.keplr) {
      setError('Keplr Wallet not found. Please install it from https://www.keplr.app/');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await window.keplr.enable(CHAIN_ID);
      const offlineSigner = window.getOfflineSigner!(CHAIN_ID);
      const accounts = await offlineSigner.getAccounts();

      setWallet({
        address: accounts[0].address,
        injectiveAddress: accounts[0].address,
        isConnected: true,
      });
    } catch (err: any) {
      setError(err.message || 'Failed to connect wallet');
    } finally {
      setLoading(false);
    }
  }, []);

  const disconnect = useCallback(() => {
    setWallet({ address: '', injectiveAddress: '', isConnected: false });
  }, []);

  // Auto-reconnect on page load
  useEffect(() => {
    const reconnect = async () => {
      if (window.keplr) {
        try {
          await window.keplr.enable(CHAIN_ID).catch(() => {});
          const offlineSigner = window.getOfflineSigner!(CHAIN_ID);
          const accounts = await offlineSigner.getAccounts().catch(() => []);
          if (accounts.length > 0) {
            setWallet({
              address: accounts[0].address,
              injectiveAddress: accounts[0].address,
              isConnected: true,
            });
          }
        } catch {}
      }
    };
    reconnect();
  }, []);

  return { wallet, connect, disconnect, loading, error };
}