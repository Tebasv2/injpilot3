'use client';
import WalletButton from './WalletButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-injective-900/50 glass">
      {/* Logo */}
      <div className="flex items-center gap-2">
        <img
          src="../injlogo.png"
          alt="injlogo"
          className="w-7 h-7 object-contain"
        />
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">InjPilot</h1>
          <p className="text-xs text-injective-100 opacity-40 leading-tight">AI Copilot</p>
        </div>
      </div>

      {/* Wallet */}
      <WalletButton />
    </header>
  );
}