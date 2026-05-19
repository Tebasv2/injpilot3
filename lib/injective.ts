import { ChainRestAuthApi, ChainRestBankApi, createInjectiveExtension, getChainId } from '@injectivelabs/sdk-ts';
import { getEndpointFromChainId } from '@injectivelabs/sdk-ts';
import type { Balance, PriceData, StakingInfo, Delegation } from '@/types';

const CHAIN_ID = process.env.NEXT_PUBLIC_INJECTIVE_CHAIN_ID || 'injective-1';

function getNetwork() {
  if (CHAIN_ID === 'injective-1') {
    return { chainId: CHAIN_ID, endpoints: { rest: 'https://api.injective.network' } };
  }
  return { chainId: 'injective-888', endpoints: { rest: 'https://testnet.api.injective.network' } };
}

/**
 * Get INJ price from CoinGecko
 */
export async function getInjPrice(): Promise<PriceData> {
  const response = await fetch(
    'https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd&include_24hr_change=true'
  );
  const data = await response.json();
  return {
    price: data['injective-protocol']?.usd || 0,
    change24h: data['injective-protocol']?.usd_24h_change || 0,
  };
}

/**
 * Get wallet balance (INJ + all tokens)
 */
export async function getBalance(address: string): Promise<Balance[]> {
  const network = getNetwork();
  const bankApi = new ChainRestBankApi(network.endpoints.rest);
  const balances = await bankApi.fetchBalances(address);

  return balances.map((coin: { denom: string; amount: string }) => ({
    denom: coin.denom,
    amount: coin.amount,
    usdValue: 0, // Could convert via price API
  }));
}

/**
 * Get staking info for a wallet
 */
export async function getStakingInfo(address: string): Promise<StakingInfo> {
  const network = getNetwork();
  // Injective uses Cosmos SDK staking module
  // For demo, return mock data — real impl uses grpc query
  return {
    delegations: [],
    totalRewards: '0',
    apy: 14.5,
  };
}

/**
 * Get INJ price for conversion
 */
export async function getInjUsdPrice(): Promise<number> {
  const data = await getInjPrice();
  return data.price;
}

/**
 * Build and broadcast a send transaction via Keplr
 */
export async function buildAndBroadcastSendTx({
  fromAddress,
  toAddress,
  amount,
  denom,
  keplr,
}: {
  fromAddress: string;
  toAddress: string;
  amount: string;
  denom: string;
  keplr: any;
}): Promise<{ txHash: string }> {
  const chainId = getChainId(CHAIN_ID);

  // Message construction
  const msg = {
    typeUrl: '/cosmos.bank.v1beta1.MsgSend',
    value: {
      fromAddress,
      toAddress,
      amount: [{ denom, amount }],
    },
  };

  const fee = {
    amount: [{ denom: 'inj', amount: '500000000000' }], // 0.0005 INJ
    gas: '200000',
  };

  const tx = {
    msgs: [msg],
    chainId,
    fee,
    memo: '',
  };

  // Request signature from Keplr
  const signed = await keplr.signTx(chainId, tx, 'block', fromAddress);

  // Broadcast via REST API
  const endpoint = getEndpointFromChainId(chainId);
  const broadcastRes = await fetch(`${endpoint}/api/v1/txs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tx: signed, mode: 'BROADCAST_MODE_SYNC' }),
  });

  const result = await broadcastRes.json();
  return { txHash: result.txhash || result.hash || '' };
}