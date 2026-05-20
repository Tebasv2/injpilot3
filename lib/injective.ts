/**
 * Injective blockchain utilities for wallet data and transactions
 */

// ── Fetch helpers ──────────────────────────────────────────────────────────

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// ── CoinGecko ─────────────────────────────────────────────────────────────

export interface PriceData {
  price: number;
  change24h: number;
}

export async function getInjPrice(): Promise<PriceData> {
  try {
    const data = await fetchJson(
      'https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd&include_24hr_change=true'
    );
    return {
      price: data['injective-protocol']?.usd ?? 0,
      change24h: data['injective-protocol']?.usd_24h_change ?? 0,
    };
  } catch {
    return { price: 0, change24h: 0 };
  }
}

// ── Balance ────────────────────────────────────────────────────────────────

export interface Balance {
  denom: string;
  amount: string;
  usdValue: number;
}

export async function getBalance(address: string): Promise<Balance[]> {
  try {
    const data = await fetchJson(
      `https://lcd.injective.network/cosmos/bank/v1beta1/balances/${address}`
    );
    return (data.balances ?? []).map((coin: { denom: string; amount: string }) => ({
      denom: coin.denom,
      amount: coin.amount,
      usdValue: 0,
    }));
  } catch {
    return [];
  }
}

// ── Staking ────────────────────────────────────────────────────────────────

export interface StakingInfo {
  delegations: Array<{ validator: string; amount: string; reward: string }>;
  totalRewards: string;
  apy: number;
}

export async function getStakingInfo(address: string): Promise<StakingInfo> {
  try {
    const [delRes, rewardRes] = await Promise.all([
      fetchJson(`https://lcd.injective.network/cosmos/staking/v1beta1/delegations/${address}`),
      fetchJson(`https://lcd.injective.network/cosmos/distribution/v1beta1/delegators/${address}/rewards`),
    ]);

    const delegations = (delRes.delegation_responses ?? []).map((d: any) => ({
      validator: d.delegation?.validator_address ?? '',
      amount: d.balance?.amount ?? '0',
      reward: '0',
    }));

    const total = rewardRes.total?.[0]?.amount ?? '0';

    return { delegations, totalRewards: total, apy: 14.5 };
  } catch {
    return { delegations: [], totalRewards: '0', apy: 14.5 };
  }
}

// ── Send Transaction ───────────────────────────────────────────────────────

/**
 * Build, sign, and broadcast a MsgSend via Keplr.
 * Uses signAmino (Cosmos SDK standard) + direct LCD broadcast.
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
  amount: string; // plain string like "1000" (in smallest unit, e.g. 0.001 INJ = 1000000000000)
  denom: string;
  keplr: any;
}): Promise<{ txHash: string }> {
  const chainId = process.env.NEXT_PUBLIC_INJECTIVE_CHAIN_ID || 'injective-1';
  const lcdUrl = 'https://lcd.injective.network';

  // 1. Fetch account info
  const accountData = await fetchJson(`${lcdUrl}/cosmos/auth/v1beta1/accounts/${fromAddress}`);
  const baseAccount = accountData.account?.base_account;
  if (!baseAccount) throw new Error('Could not find account on chain');

  const accountNumber = baseAccount.account_number;
  const sequence = baseAccount.sequence;

  // 2. Build the sign doc (Amino format for Injective/Keplr)
  const gasLimit = '200000';
  const feeAmount = '500000000000'; // 0.0005 INJ

  const signDoc = {
    chain_id: chainId,
    account_number: String(accountNumber),
    sequence: String(sequence),
    fee: {
      gas: gasLimit,
      amount: [{ denom: 'inj', amount: feeAmount }],
    },
    msgs: [
      {
        type: 'cosmos-sdk/MsgSend',
        value: {
          from_address: fromAddress,
          to_address: toAddress,
          amount: [{ denom, amount }],
        },
      },
    ],
    memo: '',
  };

  // 3. Request signature from Keplr
  const signResponse = await keplr.signAmino(chainId, fromAddress, signDoc, {
    preferNoSetFee: false,
    preferNoSetMemo: false,
    disableBalanceCheck: false,
  });

  const { signature: sig } = signResponse;
  const pubKey = sig.pub_key?.value ?? signResponse.pub_key?.value ?? '';
  const sigBytes = sig.signature ?? '';

  // 4. Build signed transaction (StdTx Amino JSON)
  const signedTx = {
    tx: {
      msg: [signDoc.msgs[0]],
      fee: signDoc.fee,
      signatures: [{ signature: sigBytes, pub_key: sig.pub_key }],
      memo: '',
    },
    mode: 'block',
  };

  // 5. Broadcast via LCD
  const broadcastRes = await fetch(`${lcdUrl}/cosmos/tx/v1beta1/txs`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tx_bytes: btoa(JSON.stringify({
        type: 'cosmos-sdk/StdTx',
        value: signedTx.tx,
      })),
      mode: 'BROADCAST_MODE_SYNC',
    }),
  });

  if (!broadcastRes.ok) {
    const errText = await broadcastRes.text();
    throw new Error(`Broadcast failed: ${broadcastRes.status} — ${errText}`);
  }

  const result = await broadcastRes.json();
  const txHash = result.tx_response?.txhash ?? result.txhash ?? '';

  return { txHash };
}