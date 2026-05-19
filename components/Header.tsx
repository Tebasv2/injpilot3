'use client';

import WalletButton from './WalletButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-injective-900/50 glass">
      <div className="flex items-center gap-3">
        {/* Injective Logo SVG */}
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-injective-500 to-purple-600 flex items-center justify-center">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" opacity="0.9"/>
            <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round"/>
            <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeLinecap="round" opacity="0.6"/>
          </svg>
        </div>
        <div>
          <h1 className="text-lg font-bold text-white">Injective AI</h1>
          <p className="text-xs text-injective-100 opacity-50">Wallet Assistant</p>
        </div>
      </div>

      <WalletButton />
    </header>
  );
}