# Injective AI Wallet

AI-powered dashboard for your Injective wallet. Ask questions about your portfolio, send tokens, stake, and more — all through a natural language chat interface.

## Features

- **Wallet Connection** — Connect via Keplr Wallet (Injective's native wallet)
- **Live Data Panel** — Real-time INJ price, your balance, staking APY, portfolio summary
- **Roast portfolio** — Get Pilot to roast you based on your portfolio
- **Personality** — Get response based on tone set during interaction
- **AI Chat** — Ask anything: "What's my staking reward?", "Send 2 INJ to inj1...", "Best pool to provide liquidity?"
- **Chat History** — Firebase Firestore persists your conversation per wallet address
- **Track porfoltio** - Telegram bot that tracks injective based wallet easily
- **Get ecosystem link** - Telegram bot that sends ecosystem links(e.g, Talis, Helix, Choice, Merlinmarkets)

## Tech Stack

- **Frontend:** Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **AI:** Anthropic Claude API (via @anthropic/claude-sdk)
- **Blockchain:** Injective SDK (@injectivelabs/sdk-ts)
- **Wallet:** @keplr-wallet/cosmos
- **Database:** Firebase Firestore


# Injective Chain ID (mainnet: injective-1, testnet: injective-888)
NEXT_PUBLIC_INJECTIVE_CHAIN_ID=injective-1


## AI Commands You Can Try

| Example | What it does |
|---------|-------------|
| "What's my INJ balance?" | Queries your wallet balance |
| "Roast my portfolio" | Triggers pilot to cook you |
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
├── .env.local              # API keys
└── package.json