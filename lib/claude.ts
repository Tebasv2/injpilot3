import Anthropic from '@anthropic/claude-sdk';
import type { ChatMessage } from '@/types';

const anthropic = new Anthropic();

const SYSTEM_PROMPT = `You are an AI assistant for an Injective blockchain wallet.

The user has connected their Keplr wallet. You have access to:
- Their wallet balance and transaction history (via on-chain queries)
- Real-time INJ price data
- Staking validator info and APY
- Portfolio positions

You can help them:
- Query their wallet: balance, recent transactions, staking rewards
- Make transaction suggestions and explain DeFi opportunities
- Execute transactions: send INJ/tokens, stake, provide liquidity

IMPORTANT — Transaction Execution:
When the user asks to SEND tokens (e.g. "send 2 INJ to inj1..."), you should call the send_token function.
The user's wallet will pop up in Keplr for them to confirm. Only proceed if they explicitly confirm.

Be concise, clear, and accurate. Don't make up data. If you don't know something, say so.

Always be cautious about transaction amounts and addresses. Confirm before executing large transfers.`;

const TOOLS = [
  {
    name: 'get_wallet_balance',
    description: 'Get the connected wallet balance for INJ and other tokens',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_staking_info',
    description: 'Get staking info: delegated validators, rewards, APY',
    input_schema: { type: 'object', properties: {}, required: [] },
  },
  {
    name: 'get_transaction_history',
    description: 'Get recent transactions for the connected wallet',
    input_schema: {
      type: 'object',
      properties: { limit: { type: 'number', description: 'Number of transactions to fetch (default 5)' } },
      required: [],
    },
  },
  {
    name: 'send_token',
    description: 'Send tokens to an Injective address. Will trigger Keplr confirmation.',
    input_schema: {
      type: 'object',
      properties: {
        to_address: { type: 'string', description: 'Recipient Injective address (inj1...)' },
        amount: { type: 'string', description: 'Amount to send (e.g. "2" for 2 INJ)' },
        denom: { type: 'string', description: 'Token denom (e.g. "inj" or "usdt")' },
      },
      required: ['to_address', 'amount', 'denom'],
    },
  },
  {
    name: 'stake_inj',
    description: 'Stake INJ to a validator',
    input_schema: {
      type: 'object',
      properties: {
        validator: { type: 'string', description: 'Validator address (injvaloper1...)' },
        amount: { type: 'string', description: 'Amount to stake in INJ' },
      },
      required: ['validator', 'amount'],
    },
  },
];

export async function sendToClaude({
  messages,
  walletAddress,
  onToolCall,
}: {
  messages: ChatMessage[];
  walletAddress: string;
  onToolCall: (name: string, input: Record<string, unknown>) => Promise<string>;
}): Promise<string> {
  const anthropicMessages = messages.map((m) => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }));

  // Inject wallet context
  const contextMessage = {
    role: 'system' as const,
    content: `${SYSTEM_PROMPT}\n\nUser's connected wallet address: ${walletAddress}`,
  };

  const response = await anthropic.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2048,
    system: SYSTEM_PROMPT,
    messages: [...anthropicMessages],
    tools: TOOLS,
  });

  // Handle tool calls if any
  const responseText = response.content
    .filter((block) => block.type === 'text')
    .map((block) => (block as any).text)
    .join('\n');

  return responseText;
}

export { TOOLS };