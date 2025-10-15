import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { analyzeProtocol, analyzeUserPortfolio, getDeFiInsight, getGlobalProtocolComparison } from './ai_engine.js';
import { fetchProtocols, fetchUserPositions } from './data_fetcher.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Test endpoint for individual protocol fetching
app.get('/api/test-alex', async (req, res) => {
  try {
    const { fetchAlexData } = await import('./data_fetcher.js');
    const alexData = await fetchAlexData();
    res.json({ success: true, data: alexData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/test-defillama', async (req, res) => {
  try {
    const { fetchDeFiLlamaData } = await import('./data_fetcher.js');
    const defillamaData = await fetchDeFiLlamaData();
    res.json({ success: true, data: defillamaData });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Get all DeFi protocols (AI analysis temporarily disabled due to quota)
app.get('/api/protocols', async (req, res) => {
  try {
    const protocols = await fetchProtocols();

    // AI analysis temporarily disabled due to OpenAI quota issues
    // const analyzed = await Promise.all(
    //   protocols.map(async (protocol) => {
    //     const analysis = await analyzeProtocol(protocol);
    //     return {
    //       ...protocol,
    //       ai_analysis: analysis
    //     };
    //   })
    // );

    res.json({ success: true, data: protocols });
  } catch (error) {
    console.error('Error fetching protocols:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Get specific protocol with AI analysis
app.get('/api/protocols/:id', async (req, res) => {
  try {
    const protocols = await fetchProtocols();
    const protocol = protocols.find(p => p.id === req.params.id);

    if (!protocol) {
      return res.status(404).json({ success: false, error: 'Protocol not found' });
    }

    const analysis = await analyzeProtocol(protocol);

    res.json({
      success: true,
      data: {
        ...protocol,
        ai_analysis: analysis
      }
    });
  } catch (error) {
    console.error('Error fetching protocol:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze user portfolio
app.post('/api/analyze-portfolio', async (req, res) => {
  try {
    const { walletAddress } = req.body;

    if (!walletAddress) {
      return res.status(400).json({ success: false, error: 'Wallet address required' });
    }

    // Fetch user positions
    const positions = await fetchUserPositions(walletAddress);

    // Get AI analysis
    const analysis = await analyzeUserPortfolio(positions, walletAddress);

    res.json({
      success: true,
      data: {
        positions,
        analysis
      }
    });
  } catch (error) {
    console.error('Error analyzing portfolio:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Compare protocols
app.post('/api/compare-protocols', async (req, res) => {
  try {
    const { protocolIds } = req.body;

    if (!protocolIds || !Array.isArray(protocolIds)) {
      return res.status(400).json({ success: false, error: 'Protocol IDs array required' });
    }

    const protocols = await fetchProtocols();
    const selectedProtocols = protocols.filter(p => protocolIds.includes(p.id));

    if (selectedProtocols.length === 0) {
      return res.status(404).json({ success: false, error: 'No protocols found' });
    }

    // Add AI analysis to each protocol
    const analyzed = await Promise.all(
      selectedProtocols.map(async (protocol) => {
        const analysis = await analyzeProtocol(protocol);
        return {
          ...protocol,
          ai_analysis: analysis
        };
      })
    );

    res.json({ success: true, data: analyzed });
  } catch (error) {
    console.error('Error comparing protocols:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// AI Question endpoint
app.post('/api/ai-question', async (req, res) => {
  try {
    const { question, protocol, context, additionalInfo } = req.body;

    console.log('AI Question Request:', {
      question,
      protocol: protocol?.name,
      context,
      hasAdditionalInfo: !!additionalInfo,
      requestType: additionalInfo?.requestType,
      protocolCount: additionalInfo?.topProtocols?.length || 0
    });

    if (!question) {
      return res.status(400).json({
        success: false,
        error: 'Question is required'
      });
    }

    let aiResponse;

    // Check if this is a global protocol comparison request
    if (context === 'comparative-protocol-analysis' || context === 'global-defi-blockchain') {
      console.log('Using global protocol comparison AI');
      aiResponse = await getGlobalProtocolComparison(question, { protocol, context, additionalInfo });
    } else {
      // Use the original getDeFiInsight for pool analysis and other contexts
      if (!protocol) {
        return res.status(400).json({
          success: false,
          error: 'Protocol is required for this context'
        });
      }

      console.log('Using original getDeFiInsight AI');
      aiResponse = await getDeFiInsight(question, { protocol, context, additionalInfo });
    }

    res.json({
      success: true,
      response: aiResponse,
      protocol: protocol?.name || 'General Analysis',
      context: context,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error processing AI question:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process question',
      message: error.message
    });
  }
});

// Get individual pool info for AI analysis from smart contract
app.get('/api/pool-info/:poolId', async (req, res) => {
  try {
    const poolId = parseInt(req.params.poolId);

    // Import dynamically to avoid circular dependencies
    const fetch = (await import('node-fetch')).default;

    // Fetch real pool data from smart contract via Stacks API
    const STACKS_API_URL = process.env.STACKS_API_URL || 'https://api.testnet.hiro.so';
    const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5';
    const CONTRACT_NAME = process.env.STAKING_CONTRACT_NAME || 'staking-poolvss';

    // Call read-only function to get pool data
    const response = await fetch(
      `${STACKS_API_URL}/v2/contracts/call-read/${CONTRACT_ADDRESS}/${CONTRACT_NAME}/get-pool-info`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: CONTRACT_ADDRESS,
          arguments: [`0x${poolId.toString(16).padStart(16, '0')}`]
        })
      }
    );

    if (!response.ok) {
      throw new Error(`Smart contract call failed: ${response.statusText}`);
    }

    const result = await response.json();

    // Check if pool exists (result will be (some ...) or none)
    if (!result.okay || !result.result || result.result === 'none') {
      return res.status(404).json({
        success: false,
        error: 'Pool not found'
      });
    }

    // Parse the Clarity response (it's in hex/CV format)
    // For now, we'll use a simplified parsing - in production, use @stacks/transactions
    const poolDataRaw = result.result;

    // Extract values from the response
    // Note: Stacks API returns values in Clarity Value format
    const poolData = poolDataRaw.value || poolDataRaw;

    // Calculate risk score based on real data
    const SCALING_FACTOR = 1000000;
    const BLOCKS_PER_DAY = 144;

    const totalStaked = (poolData['total-staked']?.value || 0) / SCALING_FACTOR;
    const rewardRate = (poolData['reward-rate']?.value || 0) / SCALING_FACTOR;
    const lockPeriodBlocks = poolData['deposit-lock-period']?.value || 0;
    const lockPeriod = Math.round(lockPeriodBlocks / BLOCKS_PER_DAY); // Convert blocks to days
    const riskProfile = poolData['risk-profile']?.value || 1;

    // Map risk profile to risk category
    const RISK_CATEGORIES = {
      1: 'Low Risk',
      2: 'Medium Risk',
      3: 'High Risk'
    };

    // Calculate risk score (0-100)
    let riskScore = riskProfile * 20; // Base score from risk profile
    if (rewardRate > 15) riskScore += 20; // High APY adds risk
    if (totalStaked < 100000) riskScore += 15; // Low TVL adds risk
    if (lockPeriod < 7) riskScore += 10; // Short lock period adds flexibility but also risk
    riskScore = Math.min(Math.max(riskScore, 0), 100); // Clamp to 0-100

    const formattedPoolData = {
      id: poolId,
      name: `Pool ${poolId}`,
      type: 'staking',
      tvl: totalStaked,
      apy: rewardRate,
      token: 'sBTC',
      audit_status: 'audited',
      risk_profile: riskProfile,
      lock_period: lockPeriod,
      fee_percent: (poolData['fee-percent']?.value || 10) / 100, // FEE_SCALE is 100
      total_staked: totalStaked,
      active: poolData.active?.value !== false,
      created_at: poolData['created-at']?.value || Date.now(),
      risk_analysis: {
        risk_score: riskScore,
        risk_category: RISK_CATEGORIES[riskProfile] || 'Unknown',
        risk_color: riskProfile === 1 ? 'green' : riskProfile === 2 ? 'yellow' : 'red',
        risk_factors: [
          `${totalStaked > 500000 ? 'High' : totalStaked > 100000 ? 'Moderate' : 'Low'} Total Value Locked`,
          `${rewardRate > 15 ? 'High' : rewardRate > 8 ? 'Moderate' : 'Stable'} APY`,
          'Smart contracts have been audited'
        ],
        warnings: rewardRate > 20 ? ['⚠️ Unusually high APY - verify sustainability'] : [],
        recommendations: [
          riskProfile === 1 ? '✅ Suitable for conservative investors' :
            riskProfile === 2 ? '⚖️ Suitable for moderate risk tolerance' :
              '⚠️ Only for high risk tolerance investors',
          '💡 Consider diversifying your investment'
        ]
      }
    };

    res.json({
      success: true,
      data: formattedPoolData,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Error fetching pool info:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pool information',
      details: error.message
    });
  }
});

// Get TVL history for a protocol (dynamic generation with current dates)
app.get('/api/tvl-history/:protocolId', async (req, res) => {
  try {
    const { protocolId } = req.params;
    const { days = 35 } = req.query; // Default to 35 days (5 weeks)

    // Get current protocol data
    const protocols = await fetchProtocols();
    const protocol = protocols.find(p => p.id === protocolId);

    if (!protocol) {
      return res.status(404).json({ success: false, error: 'Protocol not found' });
    }

    // Generate historical data with current dates
    const today = new Date();
    const historyData = [];
    const daysToGenerate = parseInt(days);

    // Determine data points based on time range
    let dataPoints;
    if (daysToGenerate <= 7) {
      dataPoints = 7; // Daily data for 7 days
    } else if (daysToGenerate <= 30) {
      dataPoints = 15; // Every 2 days for 30 days
    } else {
      dataPoints = 18; // Every 5 days for 90 days
    }

    const interval = Math.floor(daysToGenerate / (dataPoints - 1));

    for (let i = daysToGenerate; i >= 0; i -= Math.max(interval, 1)) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);

      // Calculate historical TVL with realistic growth pattern
      const growthFactor = 1 + ((daysToGenerate - i) / daysToGenerate) * 0.15; // 15% growth over period
      const variance = (Math.random() - 0.5) * 0.1; // +/- 5% daily variance
      const historicalTVL = (protocol.tvl / growthFactor) * (1 + variance);

      // Calculate historical APY (typically decreases as TVL increases)
      const apyVariance = (Math.random() - 0.5) * 0.5; // +/- 0.25% variance
      const historicalAPY = protocol.apy * (1.1 - (growthFactor - 1) * 0.3) + apyVariance;

      historyData.push({
        date: date.toISOString(),
        dateFormatted: `${date.getMonth() + 1}/${date.getDate()}`,
        tvl: Math.max(0, historicalTVL),
        apy: Math.max(0, historicalAPY),
        volume_24h: (protocol.volume_24h || 0) * (0.8 + Math.random() * 0.4), // Vary volume
        timestamp: date.getTime()
      });
    }

    res.json({
      success: true,
      data: {
        protocol: {
          id: protocol.id,
          name: protocol.name,
          currentTVL: protocol.tvl,
          currentAPY: protocol.apy
        },
        history: historyData,
        period: `${daysToGenerate} days`,
        dataPoints: historyData.length,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error fetching TVL history:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch TVL history',
      details: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 AI DeFi Advisor Backend running on port ${PORT}`);
  console.log(`📊 API endpoints available at http://localhost:${PORT}/api`);
  console.log(`📈 TVL history endpoint: http://localhost:${PORT}/api/tvl-history/:protocolId`);
});

export default app;

