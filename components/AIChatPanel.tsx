'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useChatHistory } from '@/hooks/useChatHistory';
import { buildAndBroadcastSendTx } from '@/lib/injective';
import { Send, Loader2, User, Bot, AlertCircle, X } from 'lucide-react';
import type { ChatMessage } from '@/types';

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are an AI assistant for an Injective blockchain wallet.
The user has connected their Keplr wallet at address: WALLET_ADDRESS
You can help with: wallet balance, staking, DeFi, token transfers, portfolio.
IMPORTANT: If the user asks to send/transfer tokens (e.g. "send 0.001 INJ to inj1..."),
respond with only the words: ACTION:SEND followed by the amount, address, and denom on separate lines.
Example: ACTION:SEND
amount:0.001
denom:inj
to:inj1t0gw53gp69z9yygdcqdr5399guwqzkyq76qnlz
Do NOT explain — just output the action line.`;

async function askGroq(userMessage: string, walletAddress: string): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) return 'Error: Groq API key not configured (NEXT_PUBLIC_GROQ_API_KEY)';

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT.replace('WALLET_ADDRESS', walletAddress) },
    { role: 'user', content: userMessage },
  ];

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ model: MODEL, messages, temperature: 0.7, max_tokens: 1024 }),
  });

  if (!response.ok) {
    const err = await response.text();
    return `Groq error ${response.status}: ${err}`;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from AI';
}

// Parse send command from AI response
function parseSendCommand(text: string): { amount: string; denom: string; to: string } | null {
  const lines = text.trim().split('\n');
  let amount = '', denom = 'inj', to = '';

  for (const line of lines) {
    const [key, ...valParts] = line.split(':');
    const val = valParts.join(':').trim();
    if (key === 'amount') amount = val;
    if (key === 'denom') denom = val;
    if (key === 'to') to = val;
  }

  // Also check for raw "send X INJ to inj1..." pattern
  const rawMatch = text.match(/send\s+([\d.]+)\s+(inj|usdt|token)\s+to\s+(inj1[a-z0-9]+)/i);
  if (rawMatch) {
    amount = rawMatch[1];
    denom = rawMatch[2].toLowerCase();
    to = rawMatch[3];
  }

  if (amount && to) return { amount, denom, to };
  return null;
}

// Convert to smallest unit (6 decimals for usdt, 18 for inj)
function toSmallestUnit(amount: string, denom: string): string {
  const num = parseFloat(amount);
  if (denom === 'inj' || denom === 'inj') return (num * 1e18).toFixed(0);
  if (denom === 'usdt' || denom === 'usdc') return (num * 1e6).toFixed(0);
  return (num * 1e6).toFixed(0); // default 6 decimals
}

export default function AIChatPanel() {
  const { wallet } = useWallet();
  const { messages, addMessage } = useChatHistory(wallet.address);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [pendingTx, setPendingTx] = useState<{ amount: string; denom: string; to: string } | null>(null);
  const [txError, setTxError] = useState('');
  const [txSuccess, setTxSuccess] = useState('');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleConfirmTx = async () => {
    if (!pendingTx || !window.keplr) return;
    setTxError('');
    setTxSuccess('');

    try {
      const chainId = process.env.NEXT_PUBLIC_INJECTIVE_CHAIN_ID || 'injective-1';
      const signer = window.getOfflineSigner!(chainId);
      const accounts = await signer.getAccounts();

      const result = await buildAndBroadcastSendTx({
        fromAddress: accounts[0].address,
        toAddress: pendingTx.to,
        amount: toSmallestUnit(pendingTx.amount, pendingTx.denom),
        denom: pendingTx.denom,
        keplr: window.keplr,
      });

      setTxSuccess(result.txHash);
      await addMessage({
        role: 'assistant',
        content: `✅ **Transaction Sent**\n\n` +
          `Sent **${pendingTx.amount} ${pendingTx.denom.toUpperCase()}** to \`${pendingTx.to}\`\n\n` +
          `Tx Hash: \`${result.txHash}\``,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      const msg = err.message || 'Transaction failed';
      setTxError(msg);
      await addMessage({
        role: 'assistant',
        content: `❌ **Transaction Failed**\n\n${msg}`,
        timestamp: Date.now(),
      });
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
      const reply = await askGroq(userMsg, wallet.address);

      // Check if AI returned a send command
      const sendCmd = parseSendCommand(reply);

      if (sendCmd) {
        // Show confirmation modal
        await addMessage({ role: 'assistant', content: `🔐 **Confirm Transaction**\n\nYou are about to send **${sendCmd.amount} ${sendCmd.denom.toUpperCase()}** to:\n\`${sendCmd.to}\`\n\nClick *Confirm* to open Keplr.`, timestamp: Date.now() });
        setPendingTx(sendCmd);
      } else {
        await addMessage({ role: 'assistant', content: reply, timestamp: Date.now() });
      }
    } catch (err: any) {
      await addMessage({ role: 'assistant', content: `Error: ${err.message}`, timestamp: Date.now() });
    } finally {
      setThinking(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
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
      {/* Header */}
      <div className="px-5 py-4 border-b border-injective-900/50 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-injective-500 to-purple-600 flex items-center justify-center">
          <Bot size={16} className="text-white" />
        </div>
        <div>
          <h3 className="text-white font-medium">AI Assistant</h3>
          <p className="text-xs text-injective-100 opacity-50">Powered by Groq</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !thinking && (
          <div className="text-center py-8">
            <Bot size={32} className="text-injective-500 mx-auto mb-3 opacity-50" />
            <p className="text-sm text-injective-100 opacity-60 mb-4">Ask me anything about your Injective wallet</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {[
                "What's my INJ balance?",
                "Where should I stake?",
                "Send 0.001 INJ to inj1t0gw53gp69z9yygdcqdr5399guwqzkyq76qnlz",
              ].map((q) => (
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

      {/* Transaction Confirmation */}
      {pendingTx && (
        <div className="px-5 py-4 border-t border-yellow-500/50 bg-yellow-500/5">
          <div className="flex items-start gap-3">
            <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-yellow-400 font-medium">Confirm Transaction</p>
                <button onClick={() => setPendingTx(null)} className="text-injective-100/40 hover:text-white">
                  <X size={16} />
                </button>
              </div>
              <p className="text-xs text-injective-100 opacity-70 mb-3">
                Send <span className="text-white font-medium">{pendingTx.amount} {pendingTx.denom.toUpperCase()}</span> to <span className="font-mono text-white">{pendingTx.to}</span>
              </p>
              {txError && <p className="text-xs text-red-400 mb-2">{txError}</p>}
              {txSuccess && <p className="text-xs text-green-400 mb-2">Tx: {txSuccess}</p>}
              <button
                onClick={handleConfirmTx}
                className="w-full bg-green-600 hover:bg-green-700 text-white text-xs py-2.5 rounded-lg font-medium transition-colors"
              >
                Confirm in Keplr
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Input */}
      <div className="px-5 py-4 border-t border-injective-900/50">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your wallet, send tokens..."
            className="flex-1 bg-injective-900/40 border border-injective-900/50 rounded-xl px-4 py-3 text-sm text-white placeholder-injective-100/40 focus:outline-none focus:border-injective-500/50 resize-none"
            rows={1}
            disabled={thinking}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            className="bg-injective-500 hover:bg-injective-600 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-xl transition-colors glow"
          >
            {thinking ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
          </button>
        </div>
      </div>
    </div>
  );
}