'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useChatHistory } from '@/hooks/useChatHistory';
import { buildAndBroadcastSendTx, getBalance, getStakingInfo } from '@/lib/injective';
import { Send, Loader2, User, Bot, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '@/types';

const GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
const MODEL = 'llama-3.3-70b-versatile';

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

Always be cautious about transaction amounts and addresses. Confirm before executing large transfers.`;

async function groqChat(messages: any[], tools: any[]) {
  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages,
      tools,
      tool_choice: 'auto',
      temperature: 0.7,
      max_tokens: 2048,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Groq API error: ${response.status} - ${err}`);
  }

  return response.json();
}

const TOOLS = [
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

export default function AIChatPanel() {
  const { wallet } = useWallet();
  const { messages, addMessage } = useChatHistory(wallet.address);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pendingTx, setPendingTx] = useState<{ to: string; amount: string; denom: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleToolCall = async (name: string, args: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'get_wallet_balance': {
        const bals = await getBalance(wallet.address);
        const injBal = bals.find((b) => b.denom === 'inj');
        return injBal
          ? `INJ: ${(parseFloat(injBal.amount) / 1e18).toFixed(4)}`
          : 'No INJ found';
      }
      case 'get_staking_info': {
        const info = await getStakingInfo(wallet.address);
        return `APY: ${info.apy}%\nRewards: ${(parseFloat(info.totalRewards) / 1e18).toFixed(4)} INJ\nDelegations: ${info.delegations.length}`;
      }
      case 'send_token': {
        setPendingTx({
          to: args.to_address as string,
          amount: args.amount as string,
          denom: args.denom as string,
        });
        return `⏳ Pending: Send ${args.amount} ${args.denom} to ${(args.to_address as string).slice(0, 10)}...\nCheck Keplr to confirm.`;
      }
      case 'stake_inj': {
        const validator = args.validator as string;
        const amount = args.amount as string;
        return `⚠️ Staking is not supported in this demo. Requested stake: ${amount} INJ to validator ${validator}.`;
      }
      default:
        return `Unknown tool: ${name}`;
    }
  };

  const handleConfirmTx = async () => {
    if (!pendingTx || !window.keplr) return;
    try {
      const chainId = process.env.NEXT_PUBLIC_INJECTIVE_CHAIN_ID || 'injective-1';
      const offlineSigner = window.getOfflineSigner!(chainId);
      const accounts = await offlineSigner.getAccounts();
      const result = await buildAndBroadcastSendTx({
        fromAddress: accounts[0].address,
        toAddress: pendingTx.to,
        amount: (parseFloat(pendingTx.amount) * 1e18).toString(),
        denom: pendingTx.denom,
        keplr: window.keplr,
      });
      await addMessage({
        role: 'assistant',
        content: `✅ Sent **${pendingTx.amount} ${pendingTx.denom}** to \`${pendingTx.to}\`\n\nTx: \`${result.txHash}\``,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      await addMessage({ role: 'assistant', content: `❌ Failed: ${err.message}`, timestamp: Date.now() });
    } finally {
      setPendingTx(null);
    }
  };

  const handleSend = async () => {
    if (!input.trim() || !wallet.isConnected || thinking) return;

    const userMsg = input.trim();
    setInput('');
    setThinking(true);
    await addMessage({ role: 'user', content: userMsg, timestamp: Date.now() });

    try {
      const groqMessages: any[] = [
        { role: 'system', content: `${SYSTEM_PROMPT}\n\nUser's wallet: ${wallet.address}` },
        ...messages.map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: userMsg },
      ];

      let data = await groqChat(groqMessages, TOOLS);
      let reply = data.choices?.[0]?.message;

      // Handle tool calls — Groq will call them automatically with tool_choice: 'auto'
      if (reply?.tool_calls?.length) {
        for (const tc of reply.tool_calls) {
          const args = JSON.parse(tc.function.arguments || '{}');
          const result = await handleToolCall(tc.function.name, args);
          groqMessages.push(reply);
          groqMessages.push({
            role: 'tool' as const,
            content: result,
            tool_call_id: tc.id,
          });
        }
        // Get final response after tool results
        const followUp = await groqChat(groqMessages, TOOLS);
        reply = followUp.choices?.[0]?.message;
      }

      await addMessage({ role: 'assistant', content: reply?.content || 'No response', timestamp: Date.now() });
    } catch (err: any) {
      await addMessage({ role: 'assistant', content: `⚠️ Error: ${err.message}`, timestamp: Date.now() });
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  if (!wallet.isConnected) {
    return (
      <div className="glass rounded-xl h-full flex flex-col items-center justify-center p-8 text-center">
        <Bot size={48} className="text-injective-500 opacity-30 mb-4" />
        <h3 className="text-white font-medium mb-2">Connect Wallet to Chat</h3>
        <p className="text-sm text-injective-100 opacity-50">Your AI assistant is ready once you connect Keplr.</p>
      </div>
    );
  }

  return (
    <div className="glass rounded-xl h-full flex flex-col">
      <div className="px-5 py-4 border-b border-injective-900/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-injective-500 to-purple-600 flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-medium">AI Assistant</h3>
          <p className="text-xs text-injective-100 opacity-50">Powered by Groq</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !thinking && (
          <div className="text-center py-8">
            <Bot size={32} className="text-injective-500 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-injective-100 opacity-60 mb-4">Ask me anything about your Injective wallet</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {['Where should I stake?', 'Send 2 INJ to inj1...', 'My portfolio summary'].map((q) => (
                <button key={q} onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-injective-900/40 hover:bg-injective-900/60 text-injective-100 transition-colors">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${msg.role === 'user' ? 'bg-injective-600' : 'bg-injective-900/50'}`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`px-4 py-3 rounded-xl max-w-[80%] ${msg.role === 'user' ? 'bg-injective-600 text-white rounded-tr-none' : 'bg-injective-900/40 text-injective-50 rounded-tl-none'}`}>
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-injective-900/50 flex items-center justify-center"><Bot size={14} /></div>
            <div className="bg-injective-900/40 px-4 py-3 rounded-xl rounded-tl-none">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-injective-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-injective-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-injective-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {pendingTx && (
        <div className="px-5 py-4 border-t border-injective-900/50 bg-injective-900/30">
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-400 font-medium mb-2">Confirm Transaction</p>
              <p className="text-xs text-injective-100 opacity-70 mb-3">
                Send <span className="text-white font-medium">{pendingTx.amount} {pendingTx.denom}</span> to <span className="font-mono text-white">{pendingTx.to}</span>
              </p>
              <div className="flex gap-2">
                <button onClick={handleConfirmTx} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg font-medium transition-colors">
                  Confirm in Keplr
                </button>
                <button onClick={() => setPendingTx(null)} className="flex-1 bg-injective-900/50 hover:bg-injective-900/70 text-injective-100 text-xs py-2 rounded-lg font-medium transition-colors">
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="px-5 py-4 border-t border-injective-900/50">
        <div className="flex gap-3">
          <textarea value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={handleKeyDown}
            placeholder="Ask about your wallet, send tokens, find DeFi..."
            className="flex-1 bg-injective-900/40 border border-injective-900/50 rounded-xl px-4 py-3 text-sm text-white placeholder-injective-100/40 focus:outline-none focus:border-injective-500/50 resize-none"
            rows={1} disabled={thinking} />
          <button onClick={handleSend} disabled={!input.trim() || thinking}
            className="bg-injective-500 hover:bg-injective-600 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-xl transition-colors glow">
            {thinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}