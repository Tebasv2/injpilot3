# Injective AI Wallet

AI-powered dashboard for your Injective wallet. Ask questions about your portfolio, send tokens, stake, and more — all through a natural language chat interface.

## Features

- **Wallet Connection** — Connect via Keplr Wallet (Injective's native wallet)
- **Live Data Panel** — Real-time INJ price, your balance, staking APY, portfolio summary
- **AI Chat** — Ask anything: "What's my staking reward?", "Send 2 INJ to inj1...", "Best pool to provide liquidity?"
- **Transaction Execution** — AI can send tokens, stake, and bridge via Keplr confirmation
- **Chat History** — Firebase Firestore persists your conversation per wallet address

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **AI:** Anthropic Claude API (via @anthropic/claude-sdk)
- **Blockchain:** Injective SDK (@injectivelabs/sdk-ts)
- **Wallet:** @keplr-wallet/cosmos
- **Database:** Firebase Firestore (chat history per wallet)

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create a `.env.local` file:

```env
# Anthropic Claude API key (https://console.anthropic.com/)
ANTHROPIC_API_KEY=sk-ant-...

# Injective Chain ID (mainnet: injective-1, testnet: injective-888)
NEXT_PUBLIC_INJECTIVE_CHAIN_ID=injective-1

# Optional: Firebase (if using chat history)
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

### 3. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

### 4. Connect your wallet

Click **Connect Wallet** in the header. If Keplr is installed, it'll request approval. Once connected, the left panel populates with your live wallet data.

## AI Commands You Can Try

| Example | What it does |
|---------|-------------|
| "What's my INJ balance?" | Queries your wallet balance |
| "Send 2 INJ to inj1..." | Triggers Keplr confirm → broadcasts tx |
| "Where should I stake for best APY?" | Returns validator APY rankings |
| "Explain my last 5 transactions" | Fetches and summarizes recent txs |
| "Is my portfolio diversified?" | Analyzes your positions |
| "How do I bridge USDT to Injective?" | Bridge instructions via Satellite |

## Project Structure

```
├── app/
│   ├── layout.tsx          # Root layout, fonts, providers
│   ├── page.tsx            # Main dashboard page
│   └── globals.css         # Tailwind imports
├── components/
│   ├── Header.tsx          # Logo + Connect/Disconnect button
│   ├── LiveDataPanel.tsx   # Left panel: price, balance, APY, portfolio
│   ├── AIChatPanel.tsx     # Right panel: chat messages + input
│   └── WalletButton.tsx    # Reusable wallet connect button
├── hooks/
│   ├── useWallet.ts        # Keplr connect/disconnect, address, signer
│   ├── useInjectiveData.ts # Balance, price, staking, portfolio queries
│   └── useChatHistory.ts   # Firebase Firestore read/write
├── lib/
│   ├── claude.ts           # Claude client + system prompt + tools
│   ├── injective.ts        # Injective SDK initialization
│   └── firebase.ts         # Firebase app init
├── types/
│   └── index.ts            # TypeScript types
├── .env.local              # API keys (not committed)
└── package.json
```

## Build

```bash
npm run build
npm start
```

## Disclaimer

This tool interfaces with the Injective blockchain. Always verify transaction details in Keplr before signing. The AI can execute real transactions — use with caution.