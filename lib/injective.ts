/**
 * Injective blockchain utilities
 * Pure Keplr + REST — no SDK dependency
 */

async function fetchJson(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

// ── CoinGecko ─────────────────────────────────────────────────────────────

export interface PriceData { price: number; change24h: number; }

export async function getInjPrice(): Promise<PriceData> {
  try {
    const data = await fetchJson(
      'https://api.coingecko.com/api/v3/simple/price?ids=injective-protocol&vs_currencies=usd&include_24h_change=true'
    );
    return {
      price: data['injective-protocol']?.usd ?? 0,
      change24h: data['injective-protocol']?.usd_24h_change ?? 0,
    };
  } catch { return { price: 0, change24h: 0 }; }
}

// ── Balance ────────────────────────────────────────────────────────────────

export interface Balance { denom: string; amount: string; usdValue: number; }

export async function getBalance(address: string): Promise<Balance[]> {
  try {
    const data = await fetchJson(
      `https://lcd.injective.network/cosmos/bank/v1beta1/balances/${address}`
    );
    return (data.balances ?? []).map((coin: { denom: string; amount: string }) => ({
      denom: coin.denom, amount: coin.amount, usdValue: 0,
    }));
  } catch { return []; }
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
  } catch { return { delegations: [], totalRewards: '0', apy: 14.5 }; }
}

// ── Send Transaction ───────────────────────────────────────────────────────

export async function buildAndBroadcastSendTx({
  fromAddress, toAddress, amount, denom, keplr,
}: {
  fromAddress: string;
  toAddress: string;
  amount: string; // smallest unit, e.g. "1000000" for 0.001 INJ (6 decimals)
  denom: string;
  keplr: any;
}): Promise<{ txHash: string }> {
  const chainId = process.env.NEXT_PUBLIC_INJECTIVE_CHAIN_ID || 'injective-1';
  const lcdUrl = 'https://lcd.injective.network';

  // 1. Fetch account info
  const accountData = await fetchJson(`${lcdUrl}/cosmos/auth/v1beta1/accounts/${fromAddress}`);
  const baseAccount = accountData.account?.base_account;
  if (!baseAccount) throw new Error('Account not found on chain');

  const accountNumber = Number(baseAccount.account_number);
  const sequence = Number(baseAccount.sequence);
  const pubKeyAny = baseAccount.pub_key;
  const pubKey = pubKeyAny?.value ?? '';

  // 2. Build standard Amino tx body
  const fee = {
    amount: [{ denom: 'inj', amount: '500000000000' }], // 0.0005 INJ
    gas: '200000',
  };

  const messages = [
    {
      type: 'cosmos-sdk/MsgSend',
      value: {
        from_address: fromAddress,
        to_address: toAddress,
        amount: [{ denom, amount }],
      },
    },
  ];

  const signDoc = {
    chain_id: chainId,
    account_number: accountNumber,
    sequence: sequence,
    fee,
    messages,
  };

  // 3. Sign via Keplr Amino (Injective-compatible)
  const signResponse = await keplr.signAmino(chainId, fromAddress, signDoc);
  console.log('signAmino response keys:', Object.keys(signResponse));
  console.log('signAmino signature type:', typeof signResponse.signature);

  // 4. Build signed tx and broadcast
  const signedTx = {
    msg: messages,
    fee,
    signatures: [{ signature: signResponse.signature, pub_key: { type: 'tendermint/PubKeySecp256k1', value: pubKey } }],
    memo: '',
  };
  console.log('signedTx built, about to encode');

  const txBase64 = base64Encode(new TextEncoder().encode(JSON.stringify(signedTx)));

  // 4. Broadcast via Tendermint RPC (accepts Amino JSON directly)
  const tmPayload = {
    jsonrpc: '2.0',
    id: 1,
    method: 'broadcast_tx_commit',
    params: { tx: txBase64 },
  };

  const broadcastRes = await fetch(`${lcdUrl.replace('lcd.', '')}/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(tmPayload),
  });

  if (!broadcastRes.ok) {
    const err = await broadcastRes.text();
    throw new Error(`Broadcast failed: ${broadcastRes.status} — ${err}`);
  }

  const result = await broadcastRes.json();
  if (result.error) throw new Error(`Tx broadcast error: ${JSON.stringify(result.error)}`);
  const txHash = result.result?.hash ?? '';
  if (!txHash) throw new Error('No txhash in response');
  return { txHash };
}

// ── Base64 (browser-safe) ─────────────────────────────────────────────────

function base64Encode(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}