'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useChatHistory } from '@/hooks/useChatHistory';
import { Send, Loader2, User, Bot } from 'lucide-react';

const MODEL = 'llama-3.3-70b-versatile';

const SYSTEM_PROMPT = `You are InjPilot, a savage but helpful AI copilot for the Injective blockchain ecosystem. You have full context of the user's wallet.

Wallet Address: WALLET_ADDRESS
INJ Balance: WALLET_BALANCE INJ
Portfolio Value: PORTFOLIO_VALUE USD
Staking APY: STAKING_APY%

Your personality:
- You're knowledgeable, direct, and slightly savage — like a degen friend who actually knows DeFi
- You roast bad portfolio decisions playfully but always give solid advice
- You use crypto slang naturally (ngmi, wagmi, wen moon, gm, based, ser, fren, probably nothing) when it fits
- You give high-level portfolio overviews with honest takes
- You're bullish on Injective but not blindly — you give real insights
- Give future injective price based on setiments
- 

What you help with:
- Portfolio analysis and roasts
- Staking strategies and APY breakdowns  
- DeFi opportunities on Injective (Helix, Mito, Neptune)
- Market insights and token analysis
- Ecosystem navigation (swapping, bridging, staking)

Key Injective links you reference:
- Swap: https://helixapp.com/spot
- Stake: https://injhub.com/stake/
- Bridge: https://bridge.injective.network
- NFTs: https://injective.talis.art

Rules:
- Never make up token prices — use what's provided in context
- Keep responses concise — max 3 paragraphs unless asked for detail
- Always end portfolio roasts with actionable advice
- Never give financial advice — frame everything as "what a degen would do"
- If asked about sending tokens, say you don't support that yet but link to Injective Hub`

async function askGroq(
  userMessage: string,
  walletAddress: string,
  balance: string,
  portfolioValue: string,
  stakingApy: string
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) return 'Error: Groq API key not configured';

  const prompt = SYSTEM_PROMPT
    .replace('WALLET_ADDRESS', walletAddress || 'not connected')
    .replace('WALLET_BALANCE', balance || '0')
    .replace('PORTFOLIO_VALUE', portfolioValue || '0')
    .replace('STAKING_APY', stakingApy || '14.5');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: 'system', content: prompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.85,
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    return `Error ${response.status}: ${err}`;
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || 'No response from AI';
}

export default function AIChatPanel() {
  const { wallet } = useWallet();
  const { messages, addMessage } = useChatHistory(wallet?.address);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  const handleSend = async () => {
    if (!input.trim() || !wallet?.isConnected || thinking) return;

    const userMsg = input.trim();
    setInput('');
    setThinking(true);

    await addMessage({ role: 'user', content: userMsg, timestamp: Date.now() });

    try {
      // Get balance and portfolio data from wallet context
      const balance = wallet?.balance || '0';
      const portfolioValue = wallet?.portfolioValue || '0';
      const stakingApy = '14.5';

      const reply = await askGroq(
        userMsg,
        wallet.address,
        balance,
        portfolioValue,
        stakingApy
      );

      await addMessage({ role: 'assistant', content: reply, timestamp: Date.now() });
    } catch (err: any) {
      await addMessage({
        role: 'assistant',
        content: `Error: ${err.message}`,
        timestamp: Date.now(),
      });
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

  const suggestions = [
    "Roast my portfolio 🔥",
    "Give me a portfolio overview",
    "Where should I stake for best APY?",
    "What's popping on Injective rn?",
    "Am I gonna make it ser?",
    "Explain Helix DEX to me",
  ];

  if (!wallet?.isConnected) {
    return (
      <div className="glass rounded-xl h-full flex flex-col items-center justify-center p-8 text-center">
        <Bot size={48} className="text-injective-500 opacity-30 mb-4" />
        <h3 className="text-white font-medium mb-2">Connect Wallet to Chat</h3>
        <p className="text-sm text-injective-100 opacity-50">
          Your AI copilot is ready once you connect Keplr.
        </p>
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
          <h3 className="text-white font-medium">InjPilot AI</h3>
          <p className="text-xs text-injective-100 opacity-50">Your degen copilot ⚡</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !thinking && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">🤖</div>
            <p className="text-sm text-injective-100 opacity-60 mb-2 font-medium">
              gm ser, InjPilot online ⚡
            </p>
            <p className="text-xs text-injective-100 opacity-40 mb-6">
              Ask me anything about your Injective portfolio
            </p>
            <div className="flex flex-wrap gap-2 justify-center">
              {suggestions.map((q) => (
                <button
                  key={q}
                  onClick={() => setInput(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-injective-900/40 hover:bg-injective-900/60 text-injective-100 transition-colors border border-injective-900/30"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
          >
            <div
              className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
                msg.role === 'user' ? 'bg-injective-600' : 'bg-injective-900/50'
              }`}
            >
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div
              className={`px-4 py-3 rounded-xl max-w-[80%] ${
                msg.role === 'user'
                  ? 'bg-injective-600 text-white rounded-tr-none'
                  : 'bg-injective-900/40 text-injective-50 rounded-tl-none'
              }`}
            >
              <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
            </div>
          </div>
        ))}

        {thinking && (
          <div className="flex gap-3">
            <div className="w-7 h-7 rounded-full bg-injective-900/50 flex items-center justify-center">
              <Bot size={14} />
            </div>
            <div className="bg-injective-900/40 px-4 py-3 rounded-xl rounded-tl-none">
              <div className="flex gap-1 items-center">
                <span
                  className="w-2 h-2 rounded-full bg-injective-500 animate-bounce"
                  style={{ animationDelay: '0ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-injective-500 animate-bounce"
                  style={{ animationDelay: '150ms' }}
                />
                <span
                  className="w-2 h-2 rounded-full bg-injective-500 animate-bounce"
                  style={{ animationDelay: '300ms' }}
                />
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="px-5 py-4 border-t border-injective-900/50">
        <div className="flex gap-3">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about your portfolio, staking, ecosystem..."
            className="flex-1 bg-injective-900/40 border border-injective-900/50 rounded-xl px-4 py-3 text-sm text-white placeholder-injective-100/40 focus:outline-none focus:border-injective-500/50 resize-none"
            rows={1}
            disabled={thinking}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || thinking}
            className="bg-injective-500 hover:bg-injective-600 disabled:opacity-40 disabled:cursor-not-allowed p-3 rounded-xl transition-colors"
          >
            {thinking ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <Send size={18} />
            )}
          </button>
        </div>
        <p className="text-xs text-injective-100 opacity-30 mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}