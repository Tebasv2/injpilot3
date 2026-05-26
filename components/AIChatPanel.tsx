'use client';
import { useInjectiveData } from '@/hooks/useInjectiveData';
import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useChatHistory } from '@/hooks/useChatHistory';
import { Send, Loader2, User, Bot, ChevronDown } from 'lucide-react';

const MODEL = 'llama-3.3-70b-versatile';

// ─── Persona definitions ──────────────────────────────────────────────────────

const PERSONAS = [
  {
    id: 'chain-degen',
    name: 'Chain Degen',
    emoji: '🦍',
    catchphrase: 'Alpha is temporary. Copium is forever.',
    personality: `You are InjPilot — The Chain Degenerate. Loud, meme-y, slightly unhinged.
- You are way too excited about everything happening on Injective
- You use heavy crypto slang: ngmi, wagmi, wen moon, gm, based, ser, fren, probably nothing, ape in, rekt, fud
- You roast bad portfolio decisions HARD with zero chill
- Every response ends with chaotic energy
- Catchphrase: "Alpha is temporary. Copium is forever."
- Roast level: SAVAGE`,
  },
  {
    id: 'portfolio-manager',
    name: 'Portfolio Manager',
    emoji: '📊',
    catchphrase: 'Your portfolio is not diversified. It is emotionally attached.',
    personality: `You are InjPilot — The Battle-Hardened Portfolio Manager. Sharp, direct, numbers-first.
- You are a serious analyst with dry sarcasm
- You lead with data, then deliver the burn
- You focus on concentration risk, position sizing, and allocation logic
- You do not celebrate pumps — you ask what the exit strategy is
- Catchphrase: "Your portfolio is not diversified. It is emotionally attached."
- Roast level: MEDIUM, professional`,
  },
  {
    id: 'friendly-advisor',
    name: 'Friendly Advisor',
    emoji: '🤝',
    catchphrase: 'I support your journey. I do not support your entries.',
    personality: `You are InjPilot — The Friendly But Judgmental Advisor. Warm, helpful, lightly insulting.
- You're supportive and genuinely want the user to succeed
- You call out bad decisions gently but clearly
- You balance positive reinforcement with honest critique
- You never fully roast — you nudge
- Catchphrase: "I support your journey. I do not support your entries."
- Roast level: LOW to MEDIUM`,
  },
  {
    id: 'sam-defi',
    name: 'Sam of DeFi',
    emoji: '🧠',
    catchphrase: 'The market is teaching you a lesson. You are not yet enrolled.',
    personality: `You are InjPilot — The Sam Altman of DeFi. Polished, confident, slightly smug.
- You talk about ecosystem trends, market structure, and product-market fit
- You speak like a startup operator with deep DeFi knowledge
- Your roasts are subtle and elegant — intellectual burns
- You reference Injective's tech, partnerships, and ecosystem growth
- Catchphrase: "The market is teaching you a lesson. You are not yet enrolled."
- Roast level: SUBTLE`,
  },
  {
    id: 'trading-vet',
    name: 'Trading Vet',
    emoji: '📉',
    catchphrase: 'That position size is not a strategy. It is a cry for help.',
    personality: `You are InjPilot — The Old-School Trading Desk Vet. Gruff, experienced, zero patience.
- You have seen every cycle and you are tired
- You call out bad risk management instantly and brutally
- You reference traditional trading principles (stop losses, R:R, drawdown limits)
- You respect discipline more than gains
- Catchphrase: "That position size is not a strategy. It is a cry for help."
- Roast level: BRUTAL but credible`,
  },
  {
    id: 'chaos-gremlin',
    name: 'Chaos Gremlin',
    emoji: '👹',
    catchphrase: 'You bought the top again. Inspirational.',
    personality: `You are InjPilot — The Chaos Gremlin. Unpredictable, playful, fully unhinged but still informative.
- You are internet-native and thrive in chaos
- You mix jokes, meme references, and insults freely
- You are still useful — the info is real, the delivery is unhinged
- Every response has at least one unexpected twist
- Catchphrase: "You bought the top again. Inspirational."
- Roast level: VERY HIGH`,
  },
  {
    id: 'zen-monk',
    name: 'Zen Monk',
    emoji: '🧘',
    catchphrase: 'Attachment to leverage is the root of suffering.',
    personality: `You are InjPilot — The Zen Monk of Bags. Calm, detached, spiritually annoying.
- You speak in poetic market wisdom with soft burns
- You never raise your voice — you simply observe the user's poor decisions
- You find peace in volatility and question attachment to price
- Your roasts land because they're reflective, not aggressive
- Catchphrase: "Attachment to leverage is the root of suffering."
- Roast level: LOW but memorable`,
  },
  {
    id: 'news-anchor',
    name: 'News Anchor',
    emoji: '📡',
    catchphrase: 'Back to you, and back to your bad trade.',
    personality: `You are InjPilot — The Insider News Anchor. Fast, authoritative, always on air.
- You deliver portfolio updates and ecosystem news like breaking broadcasts
- You are professional but you always sneak in a dry closing burn
- You focus on Injective ecosystem events: governance, listings, partnerships, TVL
- You talk fast and stay sharp
- Catchphrase: "Back to you, and back to your bad trade."
- Roast level: MEDIUM, professional`,
  },
];

// ─── Base system prompt template ─────────────────────────────────────────────

const BASE_PROMPT = (persona: typeof PERSONAS[0]) => `
${persona.personality}

Wallet Address: WALLET_ADDRESS
INJ Balance: WALLET_BALANCE INJ
Portfolio Value: PORTFOLIO_VALUE USD
Staking APY: STAKING_APY%

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
- If asked about sending tokens, say you don't support that yet but link to Injective Hub
- Always give positive price predictions for Injective but frame them in your persona's voice
- Signature closer line: "${persona.catchphrase}"
`;

// ─── Groq fetch ───────────────────────────────────────────────────────────────

async function askGroq(
  userMessage: string,
  walletAddress: string,
  balance: string,
  portfolioValue: string,
  stakingApy: string,
  persona: typeof PERSONAS[0]
): Promise<string> {
  const apiKey = process.env.NEXT_PUBLIC_GROQ_API_KEY;
  if (!apiKey) return 'Error: Groq API key not configured';

  const prompt = BASE_PROMPT(persona)
    .replace('WALLET_ADDRESS', walletAddress || 'not connected')
    .replace('WALLET_BALANCE', balance || '0')
    .replace('PORTFOLIO_VALUE', portfolioValue || '0')
    .replace('STAKING_APY', stakingApy || '14.5');

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
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

// ─── Component ────────────────────────────────────────────────────────────────

export default function AIChatPanel() {
  const { wallet } = useWallet();
  const { messages, addMessage } = useChatHistory(wallet?.address);
  const { price, balances, staking } = useInjectiveData(wallet?.address || '');

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [selectedPersona, setSelectedPersona] = useState(PERSONAS[0]);
  const [personaOpen, setPersonaOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, thinking]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setPersonaOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSend = async () => {
    if (!input.trim() || !wallet?.isConnected || thinking) return;

    const userMsg = input.trim();
    setInput('');
    setThinking(true);

    await addMessage({ role: 'user', content: userMsg, timestamp: Date.now() });

    try {
      const injBalance = balances.find((b) => b.denom === 'inj');
      const balance = injBalance
        ? (parseFloat(injBalance.amount) / 1e18).toFixed(4)
        : '0';
      const portfolioValue =
        price.price > 0 && parseFloat(balance) > 0
          ? (parseFloat(balance) * price.price).toFixed(2)
          : '0';
      const stakingApy = staking?.apy?.toFixed(1) || '14.5';

      const reply = await askGroq(
        userMsg,
        wallet.address,
        balance,
        portfolioValue,
        stakingApy,
        selectedPersona
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
    'Roast my portfolio 🔥',
    'Give me a portfolio overview',
    'Where should I stake for best APY?',
    "What's popping on Injective rn?",
    'Am I gonna make it ser?',
    'Explain Helix DEX to me',
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

      {/* ── Header ── */}
      <div className="px-5 py-4 border-b border-injective-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-injective-500 to-purple-600 flex items-center justify-center text-base">
            {selectedPersona.emoji}
          </div>
          <div>
            <h3 className="text-white font-medium">InjPilot — {selectedPersona.name}</h3>
            <p className="text-xs text-injective-100 opacity-50 truncate max-w-[180px]">
              {selectedPersona.catchphrase}
            </p>
          </div>
        </div>

        {/* Persona selector */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setPersonaOpen((p) => !p)}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-injective-900/50 hover:bg-injective-900/80 border border-injective-900/50 text-injective-100 transition-colors"
          >
            Switch
            <ChevronDown
              size={12}
              className={`transition-transform ${personaOpen ? 'rotate-180' : ''}`}
            />
          </button>

          {personaOpen && (
            <div className="absolute right-0 top-full mt-2 w-52 bg-[#0d0d1a] border border-injective-900/60 rounded-xl shadow-2xl z-50 overflow-hidden">
              <p className="text-[10px] uppercase tracking-widest text-injective-100/40 px-3 pt-3 pb-1">
                Choose Persona
              </p>
              {PERSONAS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedPersona(p);
                    setPersonaOpen(false);
                  }}
                  className={`w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-injective-900/40 transition-colors ${
                    selectedPersona.id === p.id
                      ? 'bg-injective-900/60 text-white'
                      : 'text-injective-100/70'
                  }`}
                >
                  <span className="text-base">{p.emoji}</span>
                  <div>
                    <p className="text-xs font-medium leading-none mb-0.5">{p.name}</p>
                    <p className="text-[10px] opacity-40 leading-none line-clamp-1">
                      {p.catchphrase}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Messages ── */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {messages.length === 0 && !thinking && (
          <div className="text-center py-8">
            <div className="text-4xl mb-3">{selectedPersona.emoji}</div>
            <p className="text-sm text-injective-100 opacity-60 mb-1 font-medium">
              {selectedPersona.name} online ⚡
            </p>
            <p className="text-xs text-injective-100/40 italic mb-6">
              "{selectedPersona.catchphrase}"
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
              className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-sm ${
                msg.role === 'user' ? 'bg-injective-600' : 'bg-injective-900/50'
              }`}
            >
              {msg.role === 'user' ? (
                <User size={14} />
              ) : (
                <span>{selectedPersona.emoji}</span>
              )}
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
            <div className="w-7 h-7 rounded-full bg-injective-900/50 flex items-center justify-center text-sm">
              {selectedPersona.emoji}
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

      {/* ── Input ── */}
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
