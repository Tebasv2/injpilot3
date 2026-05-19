export interface Wallet {
  address: string;
  injectiveAddress: string;
  isConnected: boolean;
}

export interface Balance {
  denom: string;
  amount: string;
  usdValue: number;
}

export interface StakingInfo {
  delegations: Delegation[];
  totalRewards: string;
  apy: number;
}

export interface Delegation {
  validator: string;
  amount: string;
  reward: string;
}

export interface Position {
  denom: string;
  amount: string;
  valueUsd: number;
  type: 'spot' | 'derivative' | 'nft';
}

export interface PriceData {
  price: number;
  change24h: number;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: number;
}

export interface AIResponse {
  content: string;
  toolCalls?: ToolCall[];
}

export interface ToolCall {
  name: string;
  input: Record<string, unknown>;
}