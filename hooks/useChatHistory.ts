'use client';

import { useEffect, useState, useCallback } from 'react';
import { saveMessage, loadChatHistory } from '@/lib/firebase';
import type { ChatMessage } from '@/types';

export function useChatHistory(walletAddress: string) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  // Load history on connect
  useEffect(() => {
    if (!walletAddress) return;

    const load = async () => {
      setLoading(true);
      try {
        const history = await loadChatHistory(walletAddress);
        setMessages(history as ChatMessage[]);
      } catch (err) {
        console.error('Failed to load chat history:', err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [walletAddress]);

  const addMessage = useCallback(async (message: Omit<ChatMessage, 'id'>) => {
    const newMsg: ChatMessage = {
      ...message,
      id: `${Date.now()}-${Math.random()}`,
    };

    setMessages((prev) => [...prev, newMsg]);

    // Save to Firebase (fire and forget)
    if (walletAddress) {
      saveMessage(walletAddress, newMsg).catch(console.error);
    }

    return newMsg;
  }, [walletAddress]);

  return { messages, addMessage, loading };
}