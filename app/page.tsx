'use client';

import Header from '@/components/Header';
import LiveDataPanel from '@/components/LiveDataPanel';
import AIChatPanel from '@/components/AIChatPanel';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#070d24] to-[#0f1a3d] flex flex-col">
      <Header />

      <main className="flex-1 p-4 md:p-6">
        <div className="max-w-[1600px] mx-auto h-full grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-4 md:gap-6">
          {/* Left Panel — Live Data */}
          <div className="lg:h-[calc(100vh-120px)]">
            <LiveDataPanel />
          </div>

          {/* Right Panel — AI Chat */}
          <div className="lg:h-[calc(100vh-120px)]">
            <AIChatPanel />
          </div>
        </div>
      </main>
    </div>
  );
}