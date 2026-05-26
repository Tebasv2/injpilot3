'use client';
import WalletButton from './WalletButton';

export default function Header() {
  return (
    <header className="flex items-center justify-between px-4 py-3 border-b border-injective-900/50 glass">
      <div className="flex items-center gap-2">
        <img src="../injlogo.png" alt="injlogo" className="w-7 h-7 object-contain" />
        <div>
          <h1 className="text-sm font-bold text-white leading-tight">InjPilot</h1>
          <p className="text-xs text-injective-100 opacity-40 leading-tight">AI Copilot</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <a
          href="https://t.me/InjpulseBot"
          target="_blank"
          rel="noopener noreferrer"
          title="Join on Telegram"
          className="text-injective-100/50 hover:text-injective-400 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.447 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.12L7.16 13.67l-2.966-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.994.889z" />
          </svg>
        </a>
        <WalletButton />
      </div>
    </header>
  );
}
