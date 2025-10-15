import OpenAI from 'openai';
import dotenv from 'dotenv';

dotenv.config();

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Analyze a DeFi protocol using GPT-4
 * @param {Object} protocolData - Protocol data including TVL, APY, liquidity, etc.
 * @returns {Promise<Object>} Analysis result with risk_score, strategy, and insights
 */
export async function analyzeProtocol(protocolData) {
  try {
    const prompt = `
You are an expert DeFi analyst specializing in the Stacks ecosystem. Analyze the following protocol data and provide a comprehensive risk assessment and investment strategy.

Protocol Data:
${JSON.stringify(protocolData, null, 2)}

Provide your analysis in the following JSON format:
{
  "risk_score": <number between 0-100, where 0 is lowest risk and 100 is highest risk>,
  "risk_level": "<low|moderate|high|very_high>",
  "strategy": "<investment strategy recommendation>",
  "insights": [
    "<insight 1>",
    "<insight 2>",
    "<insight 3>"
  ],
  "strengths": [
    "<strength 1>",
    "<strength 2>"
  ],
  "concerns": [
    "<concern 1>",
    "<concern 2>"
  ],
  "recommended_allocation": "<percentage recommendation for portfolio allocation>"
}

Consider the following factors in your analysis:
1. TVL (Total Value Locked) and its trend
2. APY (Annual Percentage Yield) and sustainability
3. Liquidity depth and trading volume
4. Protocol age and audit status
5. Smart contract risks
6. Market conditions and volatility
7. Token price stability
8. Historical performance

Be honest and balanced in your assessment. Highlight both opportunities and risks.
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional DeFi analyst with expertise in risk assessment and portfolio management for the Stacks blockchain ecosystem. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    return {
      ...analysis,
      timestamp: new Date().toISOString(),
      model_used: response.model
    };
  } catch (error) {
    console.error('Error in AI analysis:', error);

    // Return fallback analysis if AI fails
    return {
      risk_score: 50,
      risk_level: "moderate",
      strategy: "Further analysis required",
      insights: [
        "AI analysis temporarily unavailable",
        "Please review protocol metrics manually",
        "Consider consulting with financial advisor"
      ],
      strengths: ["Data pending"],
      concerns: ["Unable to perform complete analysis"],
      recommended_allocation: "5-10%",
      error: true,
      error_message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Analyze user's DeFi portfolio
 * @param {Array} positions - User's current DeFi positions
 * @param {string} walletAddress - User's wallet address
 * @returns {Promise<Object>} Portfolio analysis with recommendations
 */
export async function analyzeUserPortfolio(positions, walletAddress) {
  try {
    const prompt = `
You are an expert DeFi portfolio advisor for the Stacks ecosystem. Analyze the following user portfolio and provide personalized recommendations.

Wallet Address: ${walletAddress}
Portfolio Positions:
${JSON.stringify(positions, null, 2)}

Provide your analysis in the following JSON format:
{
  "overall_risk_score": <number between 0-100>,
  "portfolio_health": "<excellent|good|fair|poor>",
  "total_value_usd": <estimated total value>,
  "diversification_score": <number between 0-100>,
  "recommendations": [
    "<recommendation 1>",
    "<recommendation 2>",
    "<recommendation 3>"
  ],
  "rebalancing_suggestions": [
    {
      "action": "<buy|sell|hold>",
      "protocol": "<protocol name>",
      "reason": "<explanation>",
      "priority": "<high|medium|low>"
    }
  ],
  "strengths": [
    "<portfolio strength 1>",
    "<portfolio strength 2>"
  ],
  "weaknesses": [
    "<portfolio weakness 1>",
    "<portfolio weakness 2>"
  ],
  "summary": "<overall portfolio summary>"
}

Consider:
1. Diversification across protocols
2. Risk concentration
3. APY optimization opportunities
4. Impermanent loss risks
5. Market timing and trends
6. Entry/exit strategies
7. Gas fees and transaction costs

Provide actionable, personalized advice.
`;

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4-turbo",
      messages: [
        {
          role: "system",
          content: "You are a professional DeFi portfolio advisor with deep knowledge of the Stacks ecosystem. Provide personalized, actionable advice. Always respond with valid JSON only."
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000,
      response_format: { type: "json_object" }
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    return {
      ...analysis,
      timestamp: new Date().toISOString(),
      model_used: response.model
    };
  } catch (error) {
    console.error('Error in portfolio analysis:', error);

    // Return fallback analysis
    return {
      overall_risk_score: 50,
      portfolio_health: "fair",
      total_value_usd: 0,
      diversification_score: 50,
      recommendations: [
        "AI analysis temporarily unavailable",
        "Review your positions manually",
        "Consider diversifying across multiple protocols"
      ],
      rebalancing_suggestions: [],
      strengths: ["Analysis pending"],
      weaknesses: ["Unable to perform complete analysis"],
      summary: "Portfolio analysis temporarily unavailable. Please try again later.",
      error: true,
      error_message: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

/**
 * Get AI-powered insights for general DeFi questions
 * @param {string} question - User's question
 * @param {Object} context - Additional context (optional)
 * @returns {Promise<string>} AI response
 */
export async function getDeFiInsight(question, context = {}) {
  try {
    let prompt = '';
    let systemMessage = '';

    // Check if this is a FutureFund advice request
    if (context.additionalInfo && context.additionalInfo.requestType === 'futurefund-advice') {
      const futureFundInfo = context.additionalInfo.futureFundFeatures;

      systemMessage = "You are an expert financial advisor specializing in long-term savings and retirement planning with Bitcoin-backed assets. Provide personalized advice based on user goals and risk tolerance. Always answer in English and provide practical, actionable recommendations.";

      prompt = `
User Question: ${question}

FutureFund Information:

**Retirement Fund:**
- Minimum lock period: ${futureFundInfo.retirementFund.minLockPeriod}
- APY rates:
  * 5 years: ${futureFundInfo.retirementFund.apyRates['5years']}
  * 10 years: ${futureFundInfo.retirementFund.apyRates['10years']}
  * 15 years: ${futureFundInfo.retirementFund.apyRates['15years']}
  * 20+ years: ${futureFundInfo.retirementFund.apyRates['20years']}
- Early withdrawal fee: ${futureFundInfo.retirementFund.earlyWithdrawalFee}
- Features: ${futureFundInfo.retirementFund.features.join(', ')}

**Education Fund:**
- Minimum lock period: ${futureFundInfo.educationFund.minLockPeriod}
- APY rates:
  * 5 years: ${futureFundInfo.educationFund.apyRates['5years']}
  * 10 years: ${futureFundInfo.educationFund.apyRates['10years']}
  * 15 years: ${futureFundInfo.educationFund.apyRates['15years']}
  * 20+ years: ${futureFundInfo.educationFund.apyRates['20years']}
- Early withdrawal fee: ${futureFundInfo.educationFund.earlyWithdrawalFee}
- Features: ${futureFundInfo.educationFund.features.join(', ')}

**General Information:**
- Token: ${futureFundInfo.generalInfo.token} (Bitcoin-backed)
- Reward calculation: ${futureFundInfo.generalInfo.rewardCalculation}
- Blocks per year: ${futureFundInfo.generalInfo.blocksPerYear}
- Security: ${futureFundInfo.generalInfo.contract}

Please analyze:
1. Which fund type is more suitable for the user's needs
2. Optimal lock duration recommendation
3. Long-term return analysis of APY rates
4. Loss calculation in case of early withdrawal
5. Risk and return balance
6. Practical recommendations and action plan

IMPORTANT: Provide detailed and practical recommendations tailored to the user's situation. Explain with examples.`;
    }
    // Check if this is a pool comparison request
    else if (context.additionalInfo && context.additionalInfo.requestType === 'pool-analysis' && context.additionalInfo.availablePools) {
      const pools = context.additionalInfo.availablePools;

      systemMessage = "You are an expert DeFi advisor specializing in the Stacks ecosystem. Analyze the user's current pools and recommend which pool is better. Answer in English.";

      prompt = `
User Question: ${question}

Available Pools:
${pools.map(pool => `
Pool ${pool.id}:
- TVL: $${pool.tvl?.toLocaleString() || 'N/A'}
- APY: ${pool.apy?.toFixed(2)}%
- Risk Profile: ${pool.risk_profile || 'N/A'}
- Lock Period: ${pool.lock_period || 'N/A'} days
- Fee: ${pool.fee_percent || 'N/A'}%
- Total Staked: $${pool.total_staked?.toLocaleString() || 'N/A'}
- Risk Score: ${pool.risk_analysis?.risk_score || 'N/A'}
- Risk Category: ${pool.risk_analysis?.risk_category || 'N/A'}
`).join('\n')}

Please analyze:
1. Risk-reward profile of each pool
2. TVL and liquidity status
3. APY sustainability
4. Lock period suitability
5. Risk scores and factors

Provide a detailed analysis and recommend which pool is best. Offer different recommendations based on risk tolerance.

IMPORTANT: Only analyze the provided pools, don't give general information. Make specific recommendations for each pool.
`;
    } else {
      // General Stacks and DeFi questions
      systemMessage = "You are a knowledgeable DeFi advisor specializing in the Stacks blockchain and sBTC. Provide accurate, balanced advice that considers both opportunities and risks. Always answer in English.";

      prompt = `
Question: ${question}

${Object.keys(context).length > 0 ? `Context:\n${JSON.stringify(context, null, 2)}` : ''}

Provide a clear, concise, and actionable answer. If you mention specific protocols or strategies, explain the risks and benefits.
`;
    }

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.8,
      max_tokens: 1500
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error getting DeFi insight:', error);
    return "I'm temporarily unable to provide insights. Please try again later or consult the protocol documentation.";
  }
}

/**
 * Get comparative protocol analysis for global AI chat
 * @param {string} question - User's question
 * @param {Object} context - Context with protocol comparisons
 * @returns {Promise<string>} AI response
 */
export async function getGlobalProtocolComparison(question, context = {}) {
  try {
    // Sorunun genel blockchain bilgisi mi yoksa protokol karşılaştırması mı olduğunu kontrol et
    const generalKeywords = /stacks.*info|blockchain.*info|what.*stacks|explain.*stacks|how.*stacks|stacks.*work|blockchain.*work|bitcoin.*layer|smart.*contract|consensus|proof.*transfer|clarity|sbtc|pox/i.test(question);
    const comparisonKeywords = /which.*protocol|compare.*protocol|better|safest|invest|recommend.*protocol|which.*better|which.*safe|best.*protocol|highest.*apy|lowest.*risk|vs|versus/i.test(question);

    const isGeneralBlockchainQuestion = generalKeywords && !comparisonKeywords;

    console.log('Question analysis:', {
      question: question.substring(0, 100),
      generalKeywords: generalKeywords,
      comparisonKeywords: comparisonKeywords,
      isGeneralBlockchainQuestion: isGeneralBlockchainQuestion
    });

    let systemMessage, prompt;

    if (isGeneralBlockchainQuestion) {
      // Genel blockchain/Stacks bilgisi için
      systemMessage = `You are a blockchain expert and educator specializing in the Stacks blockchain ecosystem and Bitcoin layers.

Your role is to:
- Explain blockchain concepts clearly and accurately
- Provide information about Stacks blockchain architecture and features
- Explain Bitcoin layers, sBTC, and how Stacks works with Bitcoin
- Discuss DeFi concepts, smart contracts, and decentralized applications
- Answer technical questions about consensus mechanisms, security, and scalability

Always answer in English. Be educational, clear, and comprehensive. Use analogies when helpful. Focus on explaining concepts rather than comparing specific protocols.`;

      prompt = `User Question: ${question}

${context.additionalInfo ? `Context: The user is exploring the Stacks blockchain ecosystem which currently has ${context.additionalInfo.totalProtocols || 'several'} DeFi protocols.\n` : ''}

Please provide a comprehensive, educational answer that:
1. Directly addresses the user's question about blockchain/Stacks/DeFi concepts
2. Explains technical concepts in an accessible way
3. Provides context about how Stacks works with Bitcoin
4. Discusses relevant features like smart contracts, sBTC, Clarity language
5. Explains security, consensus mechanisms if relevant
6. Gives practical examples to illustrate concepts

Format your response in clear paragraphs. Use analogies and examples. Focus on education rather than investment advice.`;

    } else {
      // Protokol karşılaştırması için
      systemMessage = `You are an expert DeFi analyst and investment advisor specializing in the Stacks blockchain ecosystem. 

Your role is to:
- Compare multiple DeFi protocols objectively
- Provide data-driven investment recommendations
- Assess risk factors and safety scores
- Suggest portfolio diversification strategies
- Explain complex DeFi concepts clearly

Always answer in English. Be concise but comprehensive. Use specific numbers and data from the protocols provided.`;

      let protocolsInfo = '';

      if (context.additionalInfo && context.additionalInfo.topProtocols) {
        const protocols = context.additionalInfo.topProtocols;
        const isSpecificRequest = context.additionalInfo.specificProtocolsRequested;
        const analyzingCount = context.additionalInfo.analyzingProtocols || protocols.length;

        protocolsInfo = `
${isSpecificRequest ? 'User Requested Specific Protocols' : 'Available Protocols'} for Analysis (${analyzingCount} protocol${analyzingCount > 1 ? 's' : ''}):

${protocols.map((p, idx) => `
${idx + 1}. ${p.name}
   - Type: ${p.type}
   - TVL: $${(p.tvl / 1000000).toFixed(2)}M
   - APY: ${p.apy.toFixed(2)}%
   - Liquidity: $${(p.liquidity / 1000000).toFixed(2)}M
   - Risk Score: ${p.risk_score || 'N/A'}/100
   - Risk Category: ${p.risk_category || 'Unknown'}
   - Chain: ${p.chain}
`).join('\n')}

${context.additionalInfo.currentlyViewing ? `User is currently viewing: ${context.additionalInfo.currentlyViewing}\n` : ''}${isSpecificRequest ? `\nIMPORTANT: User specifically asked about ${protocols.map(p => p.name).join(' and ')}. Focus your analysis ONLY on these ${analyzingCount} protocol${analyzingCount > 1 ? 's' : ''}. Do NOT mention other protocols.\n` : `Total Protocols in Ecosystem: ${context.additionalInfo.totalProtocols || protocols.length}\n`}
Blockchain: ${context.additionalInfo.blockchain || 'Stacks'}
`;
      }

      prompt = `${protocolsInfo}

User Question: ${question}

Please provide a comprehensive, data-driven answer that:
1. Directly addresses the user's question
2. ${context.additionalInfo?.specificProtocolsRequested ? 'Focus ONLY on the protocols mentioned by the user' : 'Compares relevant protocols using specific metrics'}
3. Considers risk-adjusted returns (APY vs Risk Score)
4. Evaluates liquidity and TVL for investment safety
5. Provides actionable recommendations
6. Explains any technical concepts clearly

${context.additionalInfo?.specificProtocolsRequested ? 'CRITICAL: Analyze ONLY the protocols explicitly mentioned in the user\'s question. Do not discuss other protocols.' : 'Format your response in clear paragraphs. Use bullet points for comparisons. Be specific with numbers and protocol names.'}`;
    }

    const response = await client.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: systemMessage
        },
        {
          role: "user",
          content: prompt
        }
      ],
      temperature: 0.7,
      max_tokens: 2000
    });

    return response.choices[0].message.content;
  } catch (error) {
    console.error('Error in global protocol comparison:', error);

    // Better error message
    if (error.message.includes('rate_limit')) {
      return "I'm experiencing high demand right now. Please wait a moment and try again.";
    } else if (error.message.includes('api_key')) {
      return "AI service configuration issue. Please contact support.";
    }

    return "I'm temporarily unable to provide analysis. Please try again in a moment. If the issue persists, check that the backend server has a valid OpenAI API key configured.";
  }
}

export default {
  analyzeProtocol,
  analyzeUserPortfolio,
  getDeFiInsight,
  getGlobalProtocolComparison
};

