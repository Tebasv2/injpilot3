'use client';

import { useState, useRef, useEffect } from 'react';
import { useWallet } from '@/hooks/useWallet';
import { useChatHistory } from '@/hooks/useChatHistory';
import { sendToClaude } from '@/lib/claude';
import { buildAndBroadcastSendTx } from '@/lib/injective';
import { getBalance, getStakingInfo } from '@/lib/injective';
import { Send, Loader2, User, Bot, AlertCircle } from 'lucide-react';
import type { ChatMessage } from '@/types';

export default function AIChatPanel() {
  const { wallet } = useWallet();
  const { messages, addMessage, loading: historyLoading } = useChatHistory(wallet.address);

  const [input, setInput] = useState('');
  const [thinking, setThinking] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [txError, setTxError] = useState('');
  const [pendingTx, setPendingTx] = useState<{ to: string; amount: string; denom: string } | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, thinking]);

  // Handle AI tool calls locally
  const handleToolCall = async (name: string, inputArgs: Record<string, unknown>): Promise<string> => {
    switch (name) {
      case 'get_wallet_balance': {
        const bals = await getBalance(wallet.address);
        const injBal = bals.find((b) => b.denom === 'inj');
        return `Your wallet balance:\n${injBal ? `INJ: ${(parseFloat(injBal.amount) / 1e18).toFixed(4)}` : 'No INJ'}`;
      }
      case 'get_staking_info': {
        const info = await getStakingInfo(wallet.address);
        return `Staking Info:\nAPY: ${info.apy}%\nTotal Rewards: ${(parseFloat(info.totalRewards) / 1e18).toFixed(4)} INJ\nDelegations: ${info.delegations.length}`;
      }
      case 'get_transaction_history': {
        // In production, call injective indexer API
        return 'Transaction history:\n(No transactions found for this demo)';
      }
      case 'send_token': {
        // Show confirmation UI
        const toAddress = inputArgs.to_address as string;
        const amount = inputArgs.amount as string;
        const denom = inputArgs.denom as string;
        setPendingTx({ to: toAddress, amount, denom });
        return `⏳ Transaction pending: Sending ${amount} ${denom} to ${toAddress.slice(0, 10)}...\n\nCheck Keplr to confirm.`;
      }
      default:
        return `Unknown tool: ${name}`;
    }
  };

  const handleConfirmTx = async () => {
    if (!pendingTx || !window.keplr) return;

    setTxError('');
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

      setTxHash(result.txHash);
      await addMessage({
        role: 'assistant',
        content: `✅ Transaction confirmed!\n\n**${pendingTx.amount} ${pendingTx.denom}** sent to \`${pendingTx.to}\`\n\nTx Hash: \`${result.txHash}\``,
        timestamp: Date.now(),
      });
    } catch (err: any) {
      setTxError(err.message || 'Transaction failed');
      await addMessage({
        role: 'assistant',
        content: `❌ Transaction failed: ${err.message || 'Unknown error'}`,
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
    setTxHash('');
    setTxError('');

    // Add user message
    await addMessage({ role: 'user', content: userMsg, timestamp: Date.now() });

    try {
      // Get AI response
      const response = await sendToClaude({
        messages: [...messages, { id: 'temp', role: 'user', content: userMsg, timestamp: Date.now() }],
        walletAddress: wallet.address,
        onToolCall: handleToolCall,
      });

      await addMessage({ role: 'assistant', content: response, timestamp: Date.now() });
    } catch (err: any) {
      await addMessage({
        role: 'assistant',
        content: `⚠️ Error: ${err.message || 'Failed to get response from AI'}`,
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

  if (!wallet.isConnected) {
    return (
      <div className="glass rounded-xl h-full flex flex-col items-center justify-center p-8 text-center">
        <Bot size={48} className="text-injective-500 opacity-30 mb-4" />
        <h3 className="text-white font-medium mb-2">Connect Wallet to Chat</h3>
        <p className="text-sm text-injective-100 opacity-50 max-w-xs">
          Your AI wallet assistant will be ready once you connect your Keplr wallet.
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
          <h3 className="text-white font-medium">AI Assistant</h3>
          <p className="text-xs text-injective-100 opacity-50">Powered by Claude</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {historyLoading && messages.length === 0 && (
          <div className="flex justify-center py-8">
            <Loader2 size={24} className="animate-spin text-injective-500" />
          </div>
        )}

        {messages.length === 0 && !thinking && (
          <div className="text-center py-8">
            <div className="inline-flex flex-col items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-injective-900/30 flex items-center justify-center">
                <Bot size={24} className="text-injective-500" />
              </div>
              <p className="text-injective-100 opacity-60 text-sm">
                Ask me anything about your Injective wallet
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-sm">
                {['Where should I stake for best APY?', 'Explain my last 5 transactions', 'Send 2 INJ to inj1...'].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="text-xs px-3 py-1.5 rounded-full bg-injective-900/40 hover:bg-injective-900/60 text-injective-100 transition-colors"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center ${
              msg.role === 'user' ? 'bg-injective-600' : 'bg-injective-900/50'
            }`}>
              {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`px-4 py-3 rounded-xl max-w-[80%] ${
              msg.role === 'user'
                ? 'bg-injective-600 text-white rounded-tr-none'
                : 'bg-injective-900/40 text-injective-50 rounded-tl-none'
            }`}>
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
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-injective-500 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-injective-500 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-injective-500 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        {messagesEndRef.current}
      </div>

      {/* Transaction Confirmation Modal */}
      {pendingTx && (
        <div className="px-5 py-4 border-t border-injective-900/50 bg-injective-900/30">
          <div className="flex items-start gap-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
            <AlertCircle size={20} className="text-yellow-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-400 font-medium mb-2">Confirm Transaction</p>
              <p className="text-xs text-injective-100 opacity-70 mb-3">
                You are about to send <span className="text-white font-medium">{pendingTx.amount} {pendingTx.denom}</span> to <span className="font-mono text-white">{pendingTx.to}</span>
              </p>
              {txError && <p className="text-xs text-red-400 mb-2">{txError}</p>}
              <div className="flex gap-2">
                <button
                  onClick={handleConfirmTx}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs py-2 rounded-lg font-medium transition-colors"
                >
                  Confirm in Keplr
                </button>
                <button
                  onClick={() => setPendingTx(null)}
                  className="flex-1 bg-injective-900/50 hover:bg-injective-900/70 text-injective-100 text-xs py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
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
            placeholder="Ask about your wallet, send tokens, find DeFi opportunities..."
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
        <p className="text-xs text-injective-100/40 mt-2 text-center">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}