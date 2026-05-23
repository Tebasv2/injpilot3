'use client';

import WalletButton from './WalletButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b border-900/50 glass">
      <div className="flex items-center gap-3">
        <img
        src="../injlogo.png"
        alt="injogo"
        className='w-8 h-8 object-contain'
        />

        
        <div>
          <h1 className="text-lg font-bold text-white">Injective AI</h1>
          <p className="text-xs text-injective-100 opacity-50">Wallet Assistant</p>
        </div>
      </div>

      <WalletButton />
    </header>
  );
}