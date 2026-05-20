import type { ChatMessage } from '@/types';

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile'; // Groq's fastest model

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
When the user asks to SEND tokens (e.g. "send 2 INJ to inj1..."), use the send_token function.
The user's wallet will pop up in Keplr for them to confirm. Only proceed if they explicitly confirm.

Be concise, clear, and accurate. Don't make up data. If you don't know something, say so.

Always be cautious about transaction amounts and addresses. Confirm before executing large transfers.

Response format: Be conversational and helpful. When providing wallet data, format it cleanly. When about to execute a transaction, be explicit about what's about to happen.`;

export async function sendToGroq({
  messages,
  walletAddress,
  onToolCall,
}: {
  messages: ChatMessage[];
  walletAddress: string;
  onToolCall: (name: string, input: Record<string, unknown>) => Promise<string>;
}): Promise<{ content: string; toolCalls: Array<{ name: string; input: Record<string, unknown> }> }> {
  const systemMsg = {
    role: 'system',
    content: `${SYSTEM_PROMPT}\n\nUser's connected wallet address: ${walletAddress}`,
  };

  const groqMessages = [
    systemMsg,
    ...messages.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    })),
  ];

  // Define tools for function calling
  const tools = [
    {
      type: 'function' as const,
      function: {
        name: 'get_wallet_balance',
        description: "Get the connected wallet's INJ balance and other token balances",
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_staking_info',
        description: 'Get staking info: delegated validators, rewards, APY',
        parameters: { type: 'object', properties: {}, required: [] },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'get_transaction_history',
        description: 'Get recent transactions for the connected wallet',
        parameters: {
          type: 'object',
          properties: {
            limit: { type: 'number', description: 'Number of transactions to fetch (default 5)' },
          },
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'send_token',
        description: 'Send tokens to an Injective address. Triggers Keplr confirmation.',
        parameters: {
          type: 'object',
          properties: {
            to_address: { type: 'string', description: "Recipient Injective address (inj1...)" },
            amount: { type: 'string', description: 'Amount to send (e.g. "2" for 2 INJ)' },
            denom: { type: 'string', description: 'Token denom (e.g. "inj" or "usdt")' },
          },
          required: ['to_address', 'amount', 'denom'],
        },
      },
    },
    {
      type: 'function' as const,
      function: {
        name: 'stake_inj',
        description: 'Stake INJ to a validator',
        parameters: {
          type: 'object',
          properties: {
            validator: { type: 'string', description: 'Validator address (injvaloper1...)' },
            amount: { type: 'string', description: 'Amount to stake in INJ' },
          },
          required: ['validator', 'amount'],
        },
      },
    },
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: groqMessages,
      tools: tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  const data = await response.json();
  const assistantMsg = data.choices[0]?.message;

  if (!assistantMsg) {
    throw new Error('No response from Groq');
  }

  // Handle tool calls
  const toolCalls: Array<{ name: string; input: Record<string, unknown> }> = [];
  let responseText = '';

  if (assistantMsg.tool_calls && assistantMsg.tool_calls.length > 0) {
    // Process each tool call
    for (const toolCall of assistantMsg.tool_calls) {
      const fn = toolCall.function;
      const args = JSON.parse(fn.arguments || '{}');
      toolCalls.push({ name: fn.name, input: args });

      // Execute tool and get result
      const result = await onToolCall(fn.name, args);
      responseText += `\n[Tool: ${fn.name}] ${result}`;
    }

    // If tools were called, get the follow-up message
    if (toolCalls.length > 0) {
      // Add tool results to conversation and get final response
      const toolResultMessages = [
        ...groqMessages,
        assistantMsg,
        ...toolCalls.map((tc, i) => ({
          role: 'tool' as const,
          content: `Result for ${tc.name}: ${assistantMsg.tool_calls?.[i]?.function?.name || tc.name}`,
          tool_call_id: assistantMsg.tool_calls?.[i]?.id || `call_${i}`,
        })),
      ];

      const followUp = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${GROQ_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          messages: toolResultMessages,
          temperature: 0.7,
          max_tokens: 2048,
        }),
      });

      const followUpData = await followUp.json();
      responseText = followUpData.choices[0]?.message?.content || responseText;
    }
  } else {
    responseText = assistantMsg.content || '';
  }

  return { content: responseText, toolCalls };
}

export { MODEL };