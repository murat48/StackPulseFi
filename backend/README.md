# AI DeFi Advisor Backend

AI-powered backend service for analyzing DeFi protocols on the Stacks blockchain using GPT-4.

## 🚀 Quick Start

### Prerequisites

- Node.js >= 18.0.0
- OpenAI API Key
- Stacks wallet for testing

### Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the root directory:
```bash
cp ../env.example .env
```

3. Configure your environment variables in `.env`:
```env
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4-turbo
PORT=3001
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=your_contract_address
STAKING_CONTRACT_NAME=staking-pool
```

### Running the Server

Development mode:
```bash
npm run dev
```

Production mode:
```bash
npm start
```

The server will start on `http://localhost:3001`

## 📚 API Endpoints

### Health Check
```
GET /api/health
```
Returns the health status of the API.

### Get All Protocols
```
GET /api/protocols
```
Returns all DeFi protocols with AI analysis.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "own-pool-0",
      "name": "sBTC Yield Pool #0",
      "protocol": "YieldFarm V9",
      "type": "staking",
      "tvl": 1000000,
      "apy": 12.5,
      "ai_analysis": {
        "risk_score": 45,
        "risk_level": "moderate",
        "strategy": "Conservative yield farming",
        "insights": [...],
        "strengths": [...],
        "concerns": [...]
      }
    }
  ]
}
```

### Get Single Protocol
```
GET /api/protocols/:id
```
Returns a specific protocol with AI analysis.

### Analyze User Portfolio
```
POST /api/analyze-portfolio
Content-Type: application/json

{
  "walletAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
}
```

Returns AI-powered analysis of the user's DeFi portfolio.

**Response:**
```json
{
  "success": true,
  "data": {
    "positions": [...],
    "analysis": {
      "overall_risk_score": 55,
      "portfolio_health": "good",
      "total_value_usd": 5000,
      "diversification_score": 70,
      "recommendations": [...],
      "summary": "..."
    }
  }
}
```

### Compare Protocols
```
POST /api/compare-protocols
Content-Type: application/json

{
  "protocolIds": ["own-pool-0", "alex", "arkadiko"]
}
```

Returns comparison data for multiple protocols with AI analysis.

## 🧠 AI Engine

The AI engine uses OpenAI's GPT-4 to analyze:

- **Protocol Risk Assessment**: Evaluates TVL, APY, liquidity, and audit status
- **Investment Strategies**: Provides personalized recommendations
- **Portfolio Analysis**: Analyzes user positions across multiple protocols
- **Market Insights**: Identifies trends and opportunities

### Customizing AI Prompts

Edit `ai_engine.js` to customize the prompts and analysis parameters:

```javascript
// In ai_engine.js
export async function analyzeProtocol(protocolData) {
  const prompt = `
    Your custom prompt here...
    ${JSON.stringify(protocolData, null, 2)}
  `;
  // ... rest of the code
}
```

## 📊 Data Fetcher

The data fetcher connects to:

1. **Your Staking Contracts**: Fetches pool data from deployed contracts
2. **External DeFi Protocols**: ALEX, Arkadiko, Velar, etc.
3. **Price APIs**: CoinGecko for real-time prices

### Adding New Protocol Sources

Edit `data_fetcher.js` to add new protocol data sources:

```javascript
async function fetchNewProtocol() {
  try {
    // Fetch protocol data
    const response = await fetch('https://api.newprotocol.io/stats');
    const data = await response.json();
    
    return {
      id: 'new-protocol',
      name: 'New Protocol',
      // ... map the data
    };
  } catch (error) {
    console.error('Error fetching new protocol:', error);
    return null;
  }
}

// Add to fetchProtocols()
const newProtocolData = await fetchNewProtocol();
if (newProtocolData) protocols.push(newProtocolData);
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | Required |
| `OPENAI_MODEL` | OpenAI model to use | `gpt-4-turbo` |
| `PORT` | Server port | `3001` |
| `STACKS_NETWORK` | Stacks network (testnet/mainnet) | `testnet` |
| `CONTRACT_ADDRESS` | Your contract address | Required |
| `STAKING_CONTRACT_NAME` | Contract name | `staking-pool` |

## 🧪 Testing

Test the API endpoints:

```bash
# Health check
curl http://localhost:3001/api/health

# Get protocols
curl http://localhost:3001/api/protocols

# Analyze portfolio
curl -X POST http://localhost:3001/api/analyze-portfolio \
  -H "Content-Type: application/json" \
  -d '{"walletAddress": "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"}'
```

## 📝 Notes

- The backend uses ES modules (`type: "module"`)
- AI analysis results are cached for 5 minutes to reduce API costs
- Fallback responses are provided if OpenAI API is unavailable
- All endpoints support CORS for frontend integration

## 🚨 Error Handling

The backend includes comprehensive error handling:

- Invalid requests return 400 status
- Missing resources return 404 status
- Server errors return 500 status with error messages
- AI failures gracefully fallback to default responses

## 📈 Rate Limiting

Consider implementing rate limiting for production:

```javascript
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

## 🔐 Security

For production deployment:

1. Use environment variables for all sensitive data
2. Implement API authentication
3. Add rate limiting
4. Use HTTPS
5. Validate and sanitize all inputs
6. Keep dependencies updated

## 📄 License

MIT

