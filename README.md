# GasGuru - Transaction Batching & Scheduling Protocol for Shardeum

![GasGuru Logo](https://img.shields.io/badge/GasGuru-Shardeum%20Optimization-blue)

GasGuru is the first transaction batching and scheduling protocol built specifically for Shardeum, helping developers optimize gas usage for microtransaction-heavy dApps. By intelligently batching multiple transactions together, GasGuru can reduce gas costs by up to 70% while maintaining the speed and efficiency that Shardeum offers.

## 🚀 Features

### 🔁 **Transaction Batching**
- Combine multiple microtransactions into single batches
- Save up to 70% on gas costs through intelligent optimization
- Support for both native SHM and ERC-20 token transfers

### 🕒 **Scheduled Execution**
- Schedule transactions for optimal execution times
- Support for recurring batches (daily, weekly, monthly)
- User signs once, transaction executes later automatically

### 📊 **Gas Analytics**
- Real-time monitoring of gas savings and batch performance
- Detailed analytics dashboard with performance metrics
- Network health monitoring and optimization suggestions

### 🔧 **Developer SDK**
- Easy-to-integrate TypeScript SDK
- React hooks for seamless dApp integration
- Automatic batching with intelligent timing

### 🌐 **Shardeum Native**
- Built specifically for Shardeum's architecture
- Leverages Shardeum's ultra-low fees and linear scalability
- Uses only official Shardeum JSON-RPC API methods

## 🏗️ Architecture

GasGuru is built as a **Web2 service** (since Shardeum doesn't support smart contracts yet) that uses:

- **Frontend**: Next.js 15 with TypeScript and Tailwind CSS
- **Backend**: Next.js API routes with PostgreSQL database
- **Blockchain Integration**: Direct interaction with Shardeum via JSON-RPC API
- **Analytics**: Real-time metrics and performance tracking

## 📋 Prerequisites

- Node.js 18+ and npm
- PostgreSQL 12+
- Access to Shardeum network (mainnet or testnet)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/gasguru.git
cd gasguru/app
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

```bash
# Install PostgreSQL (macOS)
brew install postgresql
brew services start postgresql

# Create database
createdb gasguru

# Create user (optional)
psql gasguru
CREATE USER gasguru WITH PASSWORD 'password';
GRANT ALL PRIVILEGES ON DATABASE gasguru TO gasguru;
```

### 4. Environment Configuration

```bash
# Copy environment template
cp env.example .env.local

# Edit environment variables
nano .env.local
```

Required environment variables:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=gasguru
DB_USER=postgres
DB_PASSWORD=your_password
SHARDEUM_RPC_URL=https://api.shardeum.org
```

### 5. Initialize Database Schema

The database schema will be automatically created when you first run the application.

### 6. Start Development Server

```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) to see GasGuru in action!

## 🎯 Usage Guide

### Web Interface

1. **Dashboard**: Monitor gas savings, network health, and batch statistics
2. **Batch Transactions**: Add transactions to the batching queue
3. **Analytics**: View detailed performance metrics and optimization suggestions

### Developer SDK Integration

```typescript
import { useGasGuru, GasGuruUtils } from './lib/gasguru-sdk';

function MyDApp() {
  const gasGuru = useGasGuru({
    dappId: 'my-dapp',
    batchSize: 10,
    minBatchWait: 5 // minutes
  });

  const handleTransfer = async () => {
    const result = await gasGuru.addToBatch({
      from: '0x...',
      to: '0x...',
      amount: GasGuruUtils.ethToWei('0.1'),
    });

    if (result.success) {
      console.log('Added to batch:', result.batchId);
    }
  };

  return (
    <button onClick={handleTransfer}>
      Send with Gas Optimization
    </button>
  );
}
```

### API Endpoints

#### Batch Management
```bash
# Add transaction to batch
POST /api/batch
{
  "userAddress": "0x...",
  "toAddress": "0x...",
  "amount": "1000000000000000000",
  "tokenAddress": "0x..." // optional
}

# Check batch status
GET /api/batch?batchId=batch_123...
```

#### Analytics
```bash
# Get dApp analytics
GET /api/analytics?dappId=my-dapp

# Get network information
GET /api/shardeum?action=network-health
GET /api/shardeum?action=gas-price
```

## 📊 Shardeum JSON-RPC Integration

GasGuru uses the official Shardeum JSON-RPC API methods:

- `eth_gasPrice` - Current gas price estimation
- `eth_estimateGas` - Transaction gas estimation
- `eth_getBalance` - Account balance checking
- `shardeum_getNodeList` - Network node information
- `shardeum_getNetworkAccount` - Network parameters
- `shardeum_getCycleInfo` - Consensus cycle data

## 🔄 Batching Logic

### How Batching Works

1. **Transaction Queue**: Users submit transactions to the batching queue
2. **Intelligent Grouping**: Similar transactions (same recipient, token) are grouped
3. **Timing Optimization**: Batches execute at optimal times based on network conditions
4. **Gas Optimization**: Multiple transactions combined into single batch execution

### Optimization Strategies

- **Recipient Grouping**: Transactions to the same address are batched together
- **Token Grouping**: Similar token transfers are combined
- **Time-based Batching**: Scheduled execution during low-gas periods
- **Size Optimization**: Optimal batch sizes based on gas price analysis

## 📈 Analytics & Monitoring

### Key Metrics

- **Total Gas Saved**: Cumulative gas savings across all batches
- **Batch Efficiency**: Average transactions per batch
- **Savings Percentage**: Gas cost reduction compared to individual transactions
- **Network Health**: Real-time Shardeum network status

### Performance Tracking

- Real-time batch execution monitoring
- Gas price trend analysis
- Network congestion indicators
- Optimization recommendations

## 🔒 Security Considerations

- **No Private Keys**: GasGuru never handles private keys
- **Simulation Only**: Gas estimation and batching logic only
- **User Control**: Users maintain full control over transaction signing
- **Transparent Operations**: All batching logic is open and auditable

## 🌟 Benefits for Developers

### For Gaming dApps
```typescript
// Batch multiple in-game purchases
const items = [item1, item2, item3];
const batchResult = await gasGuru.autoBatch(
  items.map(item => ({
    from: playerAddress,
    to: gameContract,
    amount: item.price
  }))
);
```

### For Tipping Platforms
```typescript
// Batch multiple tips to creators
const tips = creators.map(creator => ({
  from: fanAddress,
  to: creator.address,
  amount: tipAmount
}));
await gasGuru.autoBatch(tips);
```

### For Subscription Services
```typescript
// Schedule recurring payments
await gasGuru.createScheduledBatch('monthly', subscriptionDate);
```

## 🚀 Deployment

### Production Setup

1. **Environment Variables**: Set production environment variables
2. **Database**: Use managed PostgreSQL service (AWS RDS, etc.)
3. **Monitoring**: Set up application monitoring and logging
4. **SSL**: Configure HTTPS for secure communication

### Docker Deployment

```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

## 📚 API Documentation

### SDK Methods

| Method | Description | Parameters |
|--------|-------------|------------|
| `addToBatch()` | Add transaction to batch queue | TransactionRequest |
| `getBatchStatus()` | Check batch execution status | batchId |
| `getGasOptimization()` | Get gas optimization suggestions | - |
| `estimateBatchSavings()` | Estimate savings for multiple transactions | TransactionRequest[] |
| `autoBatch()` | Automatically batch transactions | TransactionRequest[] |

### Utility Functions

| Function | Description | Example |
|----------|-------------|---------|
| `ethToWei()` | Convert ETH to Wei | `GasGuruUtils.ethToWei('1.0')` |
| `weiToEth()` | Convert Wei to ETH | `GasGuruUtils.weiToEth('1000000000000000000')` |
| `formatAddress()` | Format address for display | `GasGuruUtils.formatAddress('0x123...')` |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Live Demo**: [https://gasguru.app](https://gasguru.app)
- **Documentation**: [https://docs.gasguru.app](https://docs.gasguru.app)
- **Shardeum Network**: [https://shardeum.org](https://shardeum.org)
- **Discord Community**: [https://discord.gg/gasguru](https://discord.gg/gasguru)

## 🙏 Acknowledgments

- Shardeum team for providing the innovative blockchain platform
- Community developers for feedback and contributions
- Open source libraries that made this project possible

---

**Built with ❤️ for the Shardeum ecosystem**

*GasGuru - Making microtransactions affordable on Shardeum*
