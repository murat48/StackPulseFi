# StackPulseFi 🚀

<div align="center">

![StackPulseFi Logo](https://img.shields.io/badge/StackPulseFi-Next--Gen%20DeFi-purple?style=for-the-badge)
[![License](https://img.shields.io/badge/license-MIT-blue.svg?style=for-the-badge)](LICENSE)
[![Stacks](https://img.shields.io/badge/Stacks-Blockchain-orange?style=for-the-badge)](https://stacks.co)
[![Next.js](https://img.shields.io/badge/Next.js-15.5.3-black?style=for-the-badge&logo=next.js)](https://nextjs.org)

**Next-Generation DeFi Platform on Stacks Blockchain**

[Live Demo](https://stackpulsefi.vercel.app) • [Documentation](#-documentation) • [Features](#-features) • [Getting Started](#-getting-started)

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Architecture](#-architecture)
- [Getting Started](#-getting-started)
- [Smart Contracts](#-smart-contracts)
- [Frontend Application](#-frontend-application)
- [Backend API](#-backend-api)
- [Deployment](#-deployment)
- [Usage Guide](#-usage-guide)
- [API Documentation](#-api-documentation)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

---

## 🌟 Overview

**StackPulseFi** is a comprehensive DeFi (Decentralized Finance) platform built on the Stacks blockchain, bringing Bitcoin-backed financial services with advanced yield optimization strategies. The platform combines traditional DeFi features with AI-powered advisory services to help users make informed investment decisions.

### Key Highlights

- 🏦 **Multiple DeFi Products**: Staking pools, auto-compounding vaults, and future funds
- 🤖 **AI-Powered Advisory**: Integrated OpenAI for intelligent investment recommendations
- ₿ **Bitcoin-Backed**: Leverage Bitcoin's security through Stacks blockchain
- 📱 **Mobile-First Design**: Fully responsive UI optimized for all devices
- 🔒 **Secure & Audited**: Smart contracts written in Clarity for maximum security
- 🎯 **Risk-Adjusted Returns**: Choose from Conservative, Moderate, or Aggressive strategies

---

## ✨ Features

### 1. Staking Pools 🏊‍♂️

Multi-tier staking system with different risk profiles:

- **Conservative Pool** (5% APR, 7-day lock)
  - Low risk, steady returns
  - Perfect for risk-averse investors
  - Minimal volatility exposure

- **Moderate Pool** (8% APR, 14-day lock)
  - Balanced risk/reward ratio
  - Suitable for average DeFi users
  - Moderate growth potential

- **Aggressive Pool** (15% APR, 30-day lock)
  - High risk, high reward
  - For experienced DeFi traders
  - Maximum yield potential

**Features:**
- ✅ Flexible staking amounts
- ✅ Real-time reward calculations
- ✅ Auto-claim functionality
- ✅ Early withdrawal option (with penalty)
- ✅ Lock period protection

### 2. Auto-Compounding Vaults 🏛️

Automated yield optimization through smart contract compounding:

- **Automatic Reinvestment**: Rewards automatically reinvested
- **Gas Optimization**: Batch operations to minimize fees
- **Professional Management**: Set-and-forget strategy
- **Share-Based System**: ERC20-like vault shares
- **Harvest Functionality**: Manual harvest option available

**Benefits:**
- 📈 Exponential growth through compounding
- ⚡ No manual intervention required
- 💰 Higher effective APY than simple staking
- 🔄 Continuous optimization

### 3. FutureFund 🎓💰

Long-term savings products for financial goals:

#### Retirement Funds
- Minimum 5-year lock period
- 8-20% APY based on market conditions
- Tax-efficient structure
- Multiple funds per user allowed
- Early withdrawal with 20% penalty

#### Education Funds
- Guardian-controlled for child safety
- Goal tracking with progress indicators
- Open contributions from anyone
- Unlock-based withdrawal system
- 20% early withdrawal fee

**Features:**
- 🎯 Goal-oriented saving
- 👨‍👩‍👧 Family-friendly structure
- 🔐 Guardian protection
- 📊 Progress tracking
- 💎 Guaranteed yields

### 4. AI DeFi Advisor 🤖

Intelligent investment recommendations powered by OpenAI:

- **Portfolio Analysis**: Analyze your current DeFi positions
- **Risk Assessment**: AI-powered risk scoring
- **Strategy Recommendations**: Personalized investment strategies
- **Protocol Comparisons**: Compare different DeFi protocols
- **Market Insights**: Real-time market analysis

**Capabilities:**
- 💡 Natural language queries
- 📊 Data-driven recommendations
- 🎯 Risk-adjusted strategies
- 🔍 Deep protocol analysis
- 📈 Yield optimization suggestions

### 5. Wallet Integration 👛

Seamless connection with Stacks wallets:

- **Leather Wallet**: Primary wallet integration
- **Hiro Wallet**: Alternative wallet support
- **Real-time Balance**: Live sBTC balance updates
- **Transaction History**: Track all your activities
- **Multi-account Support**: Switch between accounts

---

## 🛠 Technology Stack

### Frontend
```
- Next.js 15.5.3 (React 19.1.0)
- TypeScript
- Tailwind CSS 4.0
- Stacks.js (@stacks/connect, @stacks/transactions)
- Lucide React (Icons)
```

### Backend
```
- Node.js with Express
- OpenAI API (GPT-3.5-turbo)
- RESTful API Architecture
- CORS enabled for cross-origin requests
```

### Smart Contracts
```
- Clarity Language
- Stacks Blockchain
- Clarinet (Testing & Deployment)
- SIP-010 Token Standard (sBTC)
```

### Infrastructure
```
- Vercel (Frontend Hosting)
- Render (Backend Hosting)
- Stacks Testnet
- GitHub Actions (CI/CD)
```

---

## 🏗 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     StackPulseFi Platform                    │
└─────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┼─────────────┐
                │             │             │
        ┌───────▼──────┐ ┌───▼────┐ ┌─────▼──────┐
        │   Frontend   │ │Backend │ │   Stacks   │
        │   Next.js    │ │  API   │ │ Blockchain │
        │              │ │        │ │            │
        │  - UI/UX     │ │ - AI   │ │ - Smart    │
        │  - Wallet    │ │ - Data │ │ Contracts  │
        │  - State     │ │ - API  │ │ - sBTC     │
        └──────────────┘ └────────┘ └────────────┘
                │             │             │
                └─────────────┼─────────────┘
                              │
                    ┌─────────▼─────────┐
                    │  User's Browser   │
                    │  - Leather Wallet │
                    │  - Hiro Wallet    │
                    └───────────────────┘
```

### Smart Contract Architecture

```
┌────────────────────────────────────────────────────┐
│              StackPulseFi Contracts                │
└────────────────────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
┌───────▼──────┐ ┌─────▼──────┐ ┌─────▼──────┐
│ Staking Pool │ │   Vault    │ │ FutureFund │
│              │ │ Compounder │ │            │
│ - Stake      │ │            │ │ - Retire   │
│ - Unstake    │ │ - Deposit  │ │ - Educate  │
│ - Claim      │ │ - Withdraw │ │ - Guardian │
└──────┬───────┘ └─────┬──────┘ └─────┬──────┘
       │               │               │
       └───────────────┼───────────────┘
                       │
              ┌────────▼────────┐
              │  Rewards        │
              │  Distributor    │
              └─────────────────┘
                       │
              ┌────────▼────────┐
              │   sBTC Token    │
              │   (SIP-010)     │
              └─────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18.x or higher
- npm or yarn
- Git
- Leather or Hiro Wallet (browser extension)
- Clarinet CLI (for contract development)

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/murat48/YieldFarming.git
cd YieldFarming
```

2. **Install Frontend Dependencies**
```bash
cd frontend
npm install
```

3. **Install Backend Dependencies**
```bash
cd ../backend
npm install
```

4. **Environment Setup**

Create `.env.local` in the frontend directory:
```env
# Network Configuration
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so

# Contract Addresses (Testnet)
NEXT_PUBLIC_CONTRACT_ADDRESS=ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5
NEXT_PUBLIC_SBTC_TOKEN_CONTRACT=ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betavss
NEXT_PUBLIC_STAKING_POOL_CONTRACT=ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.staking-poolvss
NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT=ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.vault-compoundervss
NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT=ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.rewards-distributorvss
NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT=ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss
NEXT_PUBLIC_EDUCATION_FUND_CONTRACT=ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss

# Backend API
NEXT_PUBLIC_API_URL=https://stackpulsefi-api-latest.onrender.com

# App Configuration
NEXT_PUBLIC_APP_NAME=StackPulseFi
NEXT_PUBLIC_APP_DESCRIPTION=Next-generation DeFi on Stacks
```

Create `.env` in the backend directory:
```env
# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key_here

# Server Configuration
PORT=3001
NODE_ENV=development

# CORS Configuration
ALLOWED_ORIGINS=http://localhost:3000,https://stackpulsefi.vercel.app
```

5. **Run Development Servers**

Terminal 1 - Frontend:
```bash
cd frontend
npm run dev
```

Terminal 2 - Backend:
```bash
cd backend
npm start
```

6. **Access the Application**
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- API Health: http://localhost:3001/api/health

---

## 📝 Smart Contracts

### Contract Overview

#### 1. sBTC Token (`sbtc-token.clar`)
SIP-010 compliant fungible token for testing:
```clarity
;; Mint test tokens
(contract-call? .sbtc-token mint u100000000000 tx-sender)

;; Transfer tokens
(contract-call? .sbtc-token transfer u1000000 tx-sender recipient none)

;; Get balance
(contract-call? .sbtc-token get-balance tx-sender)
```

#### 2. Staking Pool (`staking-pool.clar`)
Multi-tier staking with risk profiles:
```clarity
;; Create pool
(contract-call? .staking-pool create-pool 
  .sbtc-token u1 u500 u0 u1000000000 u200 u1008)

;; Stake tokens
(contract-call? .staking-pool stake u1 u100000000)

;; Claim rewards
(contract-call? .staking-pool claim-rewards u1)

;; Unstake
(contract-call? .staking-pool unstake u1)
```

#### 3. Vault Compounder (`vault-compounder.clar`)
Auto-compounding yield optimizer:
```clarity
;; Create vault
(contract-call? .vault-compounder create-vault u1 u200)

;; Deposit to vault
(contract-call? .vault-compounder deposit u1 u100000000)

;; Harvest rewards
(contract-call? .vault-compounder harvest u1)

;; Withdraw from vault
(contract-call? .vault-compounder withdraw u1 u50000000)
```

#### 4. Retirement Fund (`retirement-fund.clar`)
Long-term savings contract:
```clarity
;; Create retirement fund
(contract-call? .retirement-fund create-fund u7257600) ;; 5 years

;; Contribute
(contract-call? .retirement-fund contribute u1 u100000000)

;; Withdraw (after unlock)
(contract-call? .retirement-fund withdraw u1 u50000000)

;; Early withdraw (penalty)
(contract-call? .retirement-fund withdraw-early u1 u50000000)
```

#### 5. Education Fund (`education-fund.clar`)
Guardian-controlled savings for education:
```clarity
;; Create education fund
(contract-call? .education-fund create-fund 
  'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7 ;; beneficiary
  'SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7 ;; guardian
  u5256000 ;; 10 years
  u100000000000) ;; goal

;; Contribute (anyone can contribute)
(contract-call? .education-fund contribute u1 u10000000)

;; Guardian withdraw (after unlock, no fee)
(contract-call? .education-fund guardian-withdraw u1 u50000000)
```

### Deploying Contracts

1. **Install Clarinet**
```bash
brew install clarinet  # macOS
# or
curl -L https://github.com/hirosystems/clarinet/releases/download/v2.0.0/clarinet-linux-x64.tar.gz | tar xz
```

2. **Test Contracts**
```bash
clarinet test
```

3. **Deploy to Testnet**
```bash
clarinet deploy --testnet
```

4. **Deploy to Mainnet**
```bash
clarinet deploy --mainnet
```

---

## 💻 Frontend Application

### Project Structure

```
frontend/
├── src/
│   ├── app/                    # Next.js 15 App Router
│   │   ├── page.tsx           # Main landing page
│   │   ├── advisor/           # AI Advisor page
│   │   │   └── page.tsx
│   │   ├── layout.tsx         # Root layout
│   │   └── globals.css        # Global styles
│   ├── components/            # React components
│   │   ├── PoolCard.tsx       # Staking pool card
│   │   ├── VaultCard.tsx      # Vault card
│   │   ├── FutureFundCard.tsx # Future fund card
│   │   ├── WalletConnect.tsx  # Wallet integration
│   │   ├── GlobalAIChat.tsx   # AI chat widget
│   │   ├── AdminPanel.tsx     # Admin controls
│   │   └── TransactionModal.tsx
│   ├── lib/                   # Utilities
│   │   └── stacks/           # Stacks integration
│   │       ├── api.ts        # API client
│   │       ├── wallet.ts     # Wallet functions
│   │       └── config.ts     # Configuration
│   └── styles/               # Additional styles
│       └── modern-animations.css
├── public/                    # Static assets
├── package.json
├── next.config.ts
├── tailwind.config.ts
└── tsconfig.json
```

### Key Components

#### PoolCard
Displays staking pool information and actions:
- Pool statistics (APR, TVL, lock period)
- User position (staked amount, rewards)
- Stake/Unstake/Claim buttons
- AI advisor integration

#### VaultCard
Auto-compounding vault interface:
- Vault performance metrics
- Share-based accounting
- Deposit/Withdraw/Harvest actions
- APY calculations

#### FutureFundCard
Long-term savings management:
- Progress tracking
- Unlock countdown
- Contribution history
- Early withdrawal options

#### WalletConnect
Wallet integration component:
- Connect/Disconnect functionality
- Balance display
- Address formatting
- Real-time updates

### Styling System

- **Tailwind CSS 4.0**: Utility-first CSS framework
- **Custom Animations**: Smooth transitions and effects
- **Responsive Design**: Mobile-first approach
- **Dark Theme**: Gradient-based modern UI
- **Glass Morphism**: Backdrop blur effects

### Mobile Optimization

All components are fully responsive:
- Breakpoints: `sm` (640px), `md` (768px), `lg` (1024px), `xl` (1280px)
- Touch-friendly buttons (min 44px)
- Optimized font sizes and spacing
- Horizontal scroll prevention
- Responsive navigation

---

## 🔧 Backend API

### API Endpoints

#### Health Check
```http
GET /api/health
```
Returns API health status and configuration.

#### AI Question
```http
POST /api/ai-question
Content-Type: application/json

{
  "question": "What are the risks of this pool?",
  "protocol": {
    "name": "Pool 1",
    "type": "staking",
    "tvl": 1000000,
    "apy": 15
  },
  "context": "pool-analysis"
}
```

#### Protocol List
```http
GET /api/protocols
```
Returns list of available DeFi protocols.

#### Portfolio Analysis
```http
POST /api/analyze-portfolio
Content-Type: application/json

{
  "portfolioData": {
    "totalValue": 10000,
    "positions": [...]
  }
}
```

#### Protocol Comparison
```http
POST /api/compare-protocols
Content-Type: application/json

{
  "protocols": ["pool-1", "pool-2"]
}
```

### AI Integration

The backend uses OpenAI's GPT-3.5-turbo for:
- Natural language understanding
- Risk analysis
- Strategy recommendations
- Portfolio optimization
- Market insights

**Configuration:**
```javascript
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const completion = await openai.chat.completions.create({
  model: "gpt-3.5-turbo",
  messages: [...],
  temperature: 0.7,
  max_tokens: 500,
});
```

---

## 🌐 Deployment

### Frontend Deployment (Vercel)

1. **Push to GitHub**
```bash
git push origin main
```

2. **Deploy to Vercel**
```bash
cd frontend
vercel --prod
```

3. **Configure Environment Variables**
- Go to Vercel Dashboard
- Project Settings → Environment Variables
- Add all `NEXT_PUBLIC_*` variables
- Redeploy

### Backend Deployment (Render)

1. **Create Render Service**
- Go to Render Dashboard
- New → Web Service
- Connect GitHub repository
- Configure:
  - Build Command: `cd backend && npm install`
  - Start Command: `cd backend && npm start`

2. **Add Environment Variables**
- `OPENAI_API_KEY`
- `PORT` (3001)
- `NODE_ENV` (production)
- `ALLOWED_ORIGINS`

3. **Deploy**
- Render will auto-deploy on push

### Contract Deployment

1. **Prepare Deployment**
```bash
clarinet check
clarinet test
```

2. **Deploy to Testnet**
```bash
clarinet deployments generate --testnet
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

3. **Verify Deployment**
```bash
clarinet console
```

---

## 📖 Usage Guide

### For End Users

#### 1. Connect Wallet
1. Install Leather or Hiro wallet extension
2. Create/Import wallet
3. Switch to Stacks Testnet
4. Click "Connect Wallet" on StackPulseFi
5. Approve connection

#### 2. Get Test sBTC
1. Connect your wallet
2. Click "Test Mint sBTC" button
3. Approve transaction
4. Receive 1,000 sBTC for testing

#### 3. Stake in Pools
1. Navigate to "Staking Pools" tab
2. Choose a risk profile (Conservative/Moderate/Aggressive)
3. Click "Stake" button
4. Enter amount
5. Confirm transaction
6. Wait for confirmation

#### 4. Claim Rewards
1. View "Pending Rewards" in your pool card
2. Click "Claim" button
3. Rewards sent to your wallet

#### 5. Create Future Fund
1. Navigate to "FutureFund" tab
2. Choose Retirement or Education
3. Click "Create Fund"
4. Set parameters:
   - Unlock date
   - Goal amount (education only)
   - Guardian (education only)
5. Confirm transaction

#### 6. Use AI Advisor
1. Click "Ask AI About This Pool" on any pool
2. Type your question
3. Or select quick question
4. Get AI-powered recommendations

### For Developers

#### Contract Integration
```typescript
import { openContractCall } from '@stacks/connect';
import { uintCV, principalCV } from '@stacks/transactions';

const stakeToPool = async (poolId: number, amount: bigint) => {
  const functionArgs = [
    uintCV(poolId),
    uintCV(amount),
  ];

  await openContractCall({
    contract: 'staking-pool',
    functionName: 'stake',
    functionArgs,
    onFinish: (data) => {
      console.log('Transaction:', data.txId);
    },
  });
};
```

#### API Integration
```typescript
const analyzePortfolio = async (portfolio: any) => {
  const response = await fetch('/api/analyze-portfolio', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ portfolioData: portfolio }),
  });
  
  const data = await response.json();
  return data.analysis;
};
```

---

## 🔒 Security

### Smart Contract Security

- ✅ Written in Clarity (decidable language)
- ✅ No reentrancy attacks possible
- ✅ Explicit state management
- ✅ Type-safe operations
- ✅ Comprehensive testing
- ⚠️ Not yet professionally audited

### Frontend Security

- ✅ Client-side wallet signatures
- ✅ No private keys stored
- ✅ HTTPS enforcement
- ✅ Input validation
- ✅ XSS protection

### Backend Security

- ✅ API key protection
- ✅ CORS configuration
- ✅ Rate limiting (planned)
- ✅ Input sanitization
- ✅ Error handling

### Best Practices

1. **Never share private keys**
2. **Always verify contract addresses**
3. **Start with small amounts**
4. **Understand risks before investing**
5. **Keep wallet software updated**

---

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Process

1. **Fork the repository**
2. **Create a feature branch**
```bash
git checkout -b feature/amazing-feature
```

3. **Make your changes**
4. **Test thoroughly**
```bash
npm test
clarinet test
```

5. **Commit with conventional commits**
```bash
git commit -m "feat: add amazing feature"
```

6. **Push to your fork**
```bash
git push origin feature/amazing-feature
```

7. **Open a Pull Request**

### Coding Standards

- **TypeScript**: Use strict type checking
- **Clarity**: Follow Clarity style guide
- **Comments**: Document complex logic
- **Tests**: Write tests for new features
- **Formatting**: Use Prettier/ESLint

### Areas for Contribution

- 🐛 Bug fixes
- ✨ New features
- 📝 Documentation improvements
- 🎨 UI/UX enhancements
- 🔒 Security improvements
- 🧪 Test coverage
- 🌍 Internationalization

---

## 📊 Roadmap

### Phase 1: Foundation (Completed ✅)
- [x] Core smart contracts
- [x] Frontend application
- [x] Wallet integration
- [x] Basic DeFi features
- [x] AI advisor integration

### Phase 2: Enhancement (In Progress 🚧)
- [ ] Professional security audit
- [ ] Mainnet deployment
- [ ] Mobile app (React Native)
- [ ] Advanced analytics
- [ ] Governance token

### Phase 3: Expansion (Planned 📅)
- [ ] Cross-chain bridges
- [ ] NFT integration
- [ ] Lending/Borrowing
- [ ] Options trading
- [ ] Insurance products

### Phase 4: Ecosystem (Future 🔮)
- [ ] Developer SDK
- [ ] Third-party integrations
- [ ] DAO governance
- [ ] Liquidity mining
- [ ] Community rewards

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

```
MIT License

Copyright (c) 2025 StackPulseFi

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 🙏 Acknowledgments

- **Stacks Foundation**: For blockchain infrastructure
- **Hiro**: For developer tools and APIs
- **OpenAI**: For AI capabilities
- **Vercel**: For hosting platform
- **Community**: For feedback and support

---

## 📞 Contact & Support

- **Website**: [stackpulsefi.vercel.app](https://stackpulsefi.vercel.app)
- **GitHub**: [github.com/murat48/YieldFarming](https://github.com/murat48/YieldFarming)
- **Issues**: [GitHub Issues](https://github.com/murat48/YieldFarming/issues)
- **Discussions**: [GitHub Discussions](https://github.com/murat48/YieldFarming/discussions)

---

## ⚠️ Disclaimer

**IMPORTANT**: This software is experimental and for educational/testing purposes only.

- ❌ Not yet audited by professional security firms
- ❌ Not financial advice
- ❌ Use at your own risk
- ❌ Never invest more than you can afford to lose
- ✅ Always do your own research (DYOR)
- ✅ Test thoroughly on testnet first
- ✅ Understand smart contract risks

**The developers are not responsible for any losses incurred through the use of this platform.**

---

<div align="center">

**Built with ❤️ by the StackPulseFi Team**

[⬆ Back to Top](#stackpulsefi-)

</div>
