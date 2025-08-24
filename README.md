# PersonaFi: AI Personality Trading Platform

<div align="center">
  
  **The first platform where AI personalities become tradable investment assets**
  
  [![Demo](https://img.shields.io/badge/Demo-Live-green)](https://personafi-demo.vercel.app)
  [![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
  [![Built with](https://img.shields.io/badge/Built%20with-React-61dafb)](https://reactjs.org/)
  [![Blockchain](https://img.shields.io/badge/Blockchain-Solana-9945ff)](https://solana.com/)
</div>

## 🚀 Overview

PersonaFi revolutionizes the intersection of AI and Web3 by allowing users to create, own, and trade personalized AI investment advisors as NFTs. Each AI character has unique investment styles, generates market insights, and provides returns to both creators and users through transparent smart contract revenue sharing.

### ✨ Key Features

- 🤖 **AI Personality Creator**: Design custom AI investment advisors with unique styles and traits
- 🎨 **AI-Generated Avatars**: Each AI character has a unique visual identity created by DALL-E
- 📈 **Real-time Market Analysis**: AI agents provide personalized investment recommendations
- 🎯 **NFT Marketplace**: Trade AI personalities as functional NFT assets
- 💰 **Revenue Sharing**: Automated profit distribution through Solana smart contracts
- 🔐 **Seamless Onboarding**: Web3Auth integration for frictionless user experience

## 🎯 Problem & Solution

**Problem**: Current AI investment tools lack personalization, AI capabilities cannot be monetized, and NFTs lack functional value.

**Solution**: PersonaFi transforms AI intelligence into ownable, tradable digital assets that generate real value for creators, users, and the broader ecosystem.

## 🏗️ Architecture

```
Frontend (React + TypeScript)
├── AI Personality Creator
├── Market Analysis Dashboard  
├── NFT Trading Marketplace
└── Revenue Analytics

Smart Contracts (Solana)
├── AI Character NFT Minting
├── Revenue Distribution
├── Marketplace Logic
└── Staking & Rewards

AI Services
├── GPT-4 Market Analysis
├── DALL-E Avatar Generation
├── Real-time Data Processing
└── Performance Tracking
```

## 🛠️ Tech Stack

### Frontend
- **Framework**: React 18 + TypeScript
- **Styling**: Tailwind CSS
- **State Management**: Zustand
- **Web3 Integration**: Web3Auth SDK
- **UI Components**: Custom components with Radix UI

### Blockchain
- **Network**: Solana Mainnet/Devnet
- **Wallet**: Web3Auth Embedded Wallets
- **NFT Standard**: Metaplex Token Metadata
- **Smart Contracts**: Anchor Framework

### AI & APIs
- **Language Model**: OpenAI GPT-4
- **Image Generation**: DALL-E 3
- **Market Data**: CoinGecko API, Jupiter API
- **Price Feeds**: Pyth Network

### Infrastructure
- **Deployment**: Vercel
- **Database**: Supabase
- **File Storage**: IPFS via Pinata
- **Analytics**: Custom dashboard

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Solana CLI tools
- Web3Auth project credentials

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/personafi.git
cd personafi
```

2. **Install dependencies**
```bash
npm install
```

3. **Environment setup**
```bash
cp .env.example .env.local
```

Add your environment variables:
```env
# Web3Auth Configuration
NEXT_PUBLIC_WEB3AUTH_CLIENT_ID=your_web3auth_client_id
NEXT_PUBLIC_WEB3AUTH_NETWORK=testnet

# Solana Configuration
NEXT_PUBLIC_SOLANA_RPC_URL=https://api.devnet.solana.com
NEXT_PUBLIC_SOLANA_NETWORK=devnet

# AI Services
OPENAI_API_KEY=your_openai_api_key
DALLE_API_KEY=your_dalle_api_key

# External APIs
COINGECKO_API_KEY=your_coingecko_key
JUPITER_API_URL=https://quote-api.jup.ag/v6

# Database
DATABASE_URL=your_supabase_url
DATABASE_ANON_KEY=your_supabase_anon_key

# IPFS Storage
PINATA_API_KEY=your_pinata_key
PINATA_SECRET_KEY=your_pinata_secret
```

4. **Run development server**
```bash
npm run dev
```

5. **Deploy smart contracts** (Optional for development)
```bash
cd contracts
anchor build
anchor deploy --provider.cluster devnet
```

## 🎮 Usage

### For AI Creators
1. **Connect Wallet**: Use social login via Web3Auth
2. **Create AI Personality**: Choose investment style and train through conversation
3. **Generate Avatar**: AI automatically creates unique visual identity
4. **Mint NFT**: Transform AI into tradable asset
5. **List on Marketplace**: Set price and earn from usage

### For Investors
1. **Browse Marketplace**: Explore available AI personalities and their performance
2. **Purchase/Rent AI**: Acquire usage rights for AI investment advisor
3. **Receive Recommendations**: Get personalized investment insights
4. **Track Performance**: Monitor AI accuracy and your returns
5. **Trade Assets**: Buy/sell AI NFTs based on performance

## 📱 Demo Walkthrough

🎥 **[Watch Demo Video](https://youtu.be/demo-link)**

**Live Demo**: [https://personafi-demo.vercel.app](https://personafi-demo.vercel.app)

**Test Accounts**:
- Demo wallet will be created automatically via Web3Auth
- Use test SOL from Solana faucet for transactions

## 🏆 Hackathon Submission

### Track: AI-Powered Web3 Agents & Autonomous dApps

**Why PersonaFi Fits**:
- ✅ AI-driven portfolio management agents
- ✅ Autonomous smart contract execution
- ✅ Personalized DeFi recommendations
- ✅ On-chain AI agents for investment automation

### Technical Requirements Met:
- ✅ MetaMask Embedded Wallet SDK integration (Web3Auth)
- ✅ Social/email login for seedless wallet creation
- ✅ Deployed on Solana blockchain
- ✅ Working wallet integration in main application flow
- ✅ Full-stack web application with React frontend

## 🧪 Testing

```bash
# Run unit tests
npm run test

# Run integration tests
npm run test:integration

# Test smart contracts
cd contracts && anchor test

# E2E testing
npm run test:e2e
```

## 📊 Performance Metrics

- **AI Accuracy**: Track investment recommendation success rates
- **User Growth**: Monitor wallet creations and active users  
- **Trading Volume**: Measure NFT marketplace activity
- **Revenue Distribution**: Transparent profit sharing analytics

## 🗺️ Roadmap

### Phase 1: MVP (Current)
- [x] AI personality creation
- [x] Basic market analysis
- [x] NFT minting and trading
- [x] Web3Auth integration

### Phase 2: Enhanced Features
- [ ] Advanced AI training algorithms
- [ ] Multi-chain support (Ethereum, Polygon)
- [ ] Social features and AI reputation system
- [ ] Mobile app development

### Phase 3: Ecosystem Growth
- [ ] AI strategy tournaments
- [ ] Institutional investor tools
- [ ] API for third-party integrations
- [ ] DAO governance for platform decisions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 👥 Team

- **界天日** - Full-stack Developer & AI Integration
  - GitHub: [@ybc112](https://github.com/ybc112) 
  - Twitter: [@界天日世](https://twitter.com/YBCYBC2003)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.



## 🙏 Acknowledgments

- **HackQuest** for hosting this amazing hackathon
- **Web3Auth** for seamless wallet integration
- **Solana Foundation** for the high-performance blockchain
- **OpenAI** for powerful AI capabilities
- **Metaplex** for NFT standards and tools

---

<div align="center">
  <strong>Built with ❤️ for the future of AI-powered investing</strong>
  
  **PersonaFi - Where AI Personalities Become Investment Assets**
</div>
