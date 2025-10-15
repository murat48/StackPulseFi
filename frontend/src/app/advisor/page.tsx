'use client';

import React, { useState, useEffect } from 'react';
import { Search, TrendingUp, Shield, Sparkles, Loader2, AlertCircle, BarChart3, Calculator, ExternalLink, Info } from 'lucide-react';
import { ComposedChart, Area, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, PieChart, Pie, Cell } from 'recharts';
import ProtocolCard from '@/components/ProtocolCard';
import WalletConnect from '@/components/WalletConnect';
import { getUserAddress } from '@/lib/stacks/wallet';

interface RiskAnalysis {
  risk_score: number;
  risk_category: string;
  risk_factors: string[];
  warnings: string[];
  recommendations: string[];
}

interface Protocol {
  id: string;
  name: string;
  protocol: string;
  type: string;
  tvl: number;
  apy: number;
  liquidity: number;
  token: string;
  is_active: boolean;
  url: string;
  audit_status: string;
  chain: string;
  volume_24h?: number;
  risk_analysis?: RiskAnalysis;
  ai_analysis?: any;
}

interface PortfolioAnalysis {
  overall_risk_score: number;
  portfolio_health: string;
  total_value_usd: number;
  diversification_score: number;
  recommendations: string[];
  summary: string;
}

export default function AIAdvisorDashboard() {
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [filteredProtocols, setFilteredProtocols] = useState<Protocol[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [sortBy, setSortBy] = useState('tvl');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isClient, setIsClient] = useState(false);

  const userAddress = getUserAddress();

  // Deposit Calculator State
  const [depositAmount, setDepositAmount] = useState(1000);
  const [duration, setDuration] = useState(90);
  const [compoundFreq, setCompoundFreq] = useState('Daily');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);
  const [activeTab, setActiveTab] = useState<'protocol' | 'router'>('protocol');
  const [calculatorMode, setCalculatorMode] = useState<'protocol' | 'investment' | 'liquidity'>('investment');
  const [selectedPool, setSelectedPool] = useState<any | null>(null);
  const [selectedLiquidityPool, setSelectedLiquidityPool] = useState<any | null>(null);
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [chatHistory, setChatHistory] = useState<{ question: string, answer: string, timestamp: Date }[]>([]);
  const [portfolioAnalysis, setPortfolioAnalysis] = useState<PortfolioAnalysis | null>(null);
  const [analyzingPortfolio, setAnalyzingPortfolio] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedForCompare, setSelectedForCompare] = useState<string[]>([]);

  // Global AI Chat States
  const [globalAIChatOpen, setGlobalAIChatOpen] = useState(false);
  const [globalAIQuestion, setGlobalAIQuestion] = useState('');
  const [globalAIResponse, setGlobalAIResponse] = useState('');
  const [isGlobalAIAsking, setIsGlobalAIAsking] = useState(false);
  const [globalChatHistory, setGlobalChatHistory] = useState<{ question: string, answer: string, timestamp: Date }[]>([]);

  // Router Mode States
  const [routerEnabled, setRouterEnabled] = useState(false);
  const [routerAmount, setRouterAmount] = useState(10000);
  const [routerRiskTolerance, setRouterRiskTolerance] = useState<'low' | 'medium' | 'high'>('medium');
  const [routerAllocation, setRouterAllocation] = useState<any[]>([]);
  const [isCalculatingRoute, setIsCalculatingRoute] = useState(false);

  // AI Chat kapatma fonksiyonu - geçmişi temizler
  const closeAIChat = () => {
    setShowAIChat(false);
    setChatHistory([]);
    setAiQuestion('');
    setAiResponse('');
  };

  // Risk factors data
  const riskFactors = [
    {
      name: 'Liquidity Risk',
      description: 'Risk of insufficient liquidity for withdrawals',
      percentage: 5,
      bgColor: 'bg-purple-100',
      progressColor: 'bg-purple-500',
      icon: <AlertCircle className="w-4 h-4 text-purple-600" />
    },
    {
      name: 'Stability Risk',
      description: 'Risk of protocol instability or bugs',
      percentage: 55,
      bgColor: 'bg-orange-100',
      progressColor: 'bg-orange-500',
      icon: <TrendingUp className="w-4 h-4 text-orange-600" />
    },
    {
      name: 'Market Risk',
      description: 'Risk from market volatility',
      percentage: 100,
      bgColor: 'bg-red-100',
      progressColor: 'bg-red-500',
      icon: <BarChart3 className="w-4 h-4 text-red-600" />
    },
    {
      name: 'Smart Contract Risk',
      description: 'Risk from smart contract vulnerabilities',
      percentage: 0,
      bgColor: 'bg-green-100',
      progressColor: 'bg-green-500',
      icon: <Shield className="w-4 h-4 text-green-600" />
    },
    {
      name: 'Regulatory Risk',
      description: 'Risk from regulatory changes',
      percentage: 0,
      bgColor: 'bg-blue-100',
      progressColor: 'bg-blue-500',
      icon: <Info className="w-4 h-4 text-blue-600" />
    }
  ];

  // State for historical chart data
  const [chartData, setChartData] = useState<any[]>([]);
  const [loadingChart, setLoadingChart] = useState(false);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');

  // State for circle chart metrics (average values for selected time range)
  const [circleMetrics, setCircleMetrics] = useState({
    tvl: 0,
    volume: 0,
    liquidity: 0
  });

  // Fetch TVL history from backend
  const fetchChartData = async (protocolId: string, range: '7d' | '30d' | '90d' = '7d') => {
    try {
      setLoadingChart(true);
      const days = range === '7d' ? 7 : range === '30d' ? 30 : 90;
      const response = await fetch(`https://stackpulsefi-api-latest.onrender.com/api/tvl-history/${protocolId}?days=${days}`);
      const data = await response.json();

      if (data.success) {
        // Transform data for chart
        const transformed = data.data.history.map((item: any) => ({
          date: item.dateFormatted,
          tvl: item.tvl / 1000000, // Convert to millions
          apr: item.apy / 100, // Convert to decimal
          volume: item.volume_24h / 1000000 // Convert to millions
        }));
        setChartData(transformed);

        // Calculate average metrics for circle chart
        if (data.data.history.length > 0) {
          const avgTvl = data.data.history.reduce((sum: number, item: any) => sum + item.tvl, 0) / data.data.history.length;
          const avgVolume = data.data.history.reduce((sum: number, item: any) => sum + item.volume_24h, 0) / data.data.history.length;
          const avgLiquidity = avgTvl * 1.2; // Estimate liquidity as 120% of TVL

          setCircleMetrics({
            tvl: avgTvl,
            volume: avgVolume > 0 ? avgVolume : avgTvl * 0.05,
            liquidity: avgLiquidity
          });
        }
      }
    } catch (error) {
      console.error('Error fetching chart data:', error);
      // Fallback to generated data
      const fallbackData = generateFallbackChartData();
      setChartData(fallbackData);

      // Calculate fallback circle metrics
      if (selectedProtocol) {
        setCircleMetrics({
          tvl: selectedProtocol.tvl,
          volume: selectedProtocol.volume_24h && selectedProtocol.volume_24h > 0 ? selectedProtocol.volume_24h : selectedProtocol.tvl * 0.05,
          liquidity: selectedProtocol.liquidity || selectedProtocol.tvl * 1.2
        });
      }
    } finally {
      setLoadingChart(false);
    }
  };

  // Fallback chart data generator (used if API fails)
  const generateFallbackChartData = () => {
    const today = new Date();
    const dates = [];

    // Generate last 5 weeks of data with actual dates
    for (let i = 4; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - (i * 7)); // Go back 7 days at a time
      dates.push({
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        fullDate: date.toISOString()
      });
    }

    // Use selected protocol's data if available
    const baseTVL = selectedProtocol?.tvl || 4;
    const baseAPY = selectedProtocol?.apy || 2.27;

    return dates.map((dateObj, index) => {
      // Create realistic growth trend
      const growthFactor = 1 + (index * 0.05); // 5% growth per week
      const variance = (Math.random() - 0.5) * 0.1; // +/- 5% variance

      return {
        date: dateObj.date,
        tvl: (baseTVL / 1000000) * growthFactor * (1 + variance), // Convert to millions
        apr: (baseAPY / 100) * (1 + variance * 0.5),
        volume: (selectedProtocol?.volume_24h || 0) / 1000000 * (0.5 + Math.random() * 0.5)
      };
    });
  };

  // Generate chart data
  const generateChartData = () => {
    return chartData.length > 0 ? chartData : generateFallbackChartData();
  };

  // Generate projection data with dynamic dates
  const generateProjectionData = () => {
    const today = new Date();
    const periods = [];

    // Generate projections for the next 90 days (11 points)
    for (let i = 0; i <= 10; i++) {
      const days = i * 9; // Every 9 days
      const date = new Date(today);
      date.setDate(date.getDate() + days);
      periods.push({
        period: `${days}d`,
        date: `${date.getMonth() + 1}/${date.getDate()}`,
        fullDate: date.toISOString()
      });
    }

    // Calculate projection based on selected protocol
    const baseValue = depositAmount;
    const apy = calculateAPY();
    const dailyRate = apy / 36500; // APY to daily rate

    return periods.map((periodObj, index) => {
      const days = index * 9;
      const projectedValue = baseValue * Math.pow(1 + dailyRate, days);

      return {
        period: periodObj.period,
        date: periodObj.date,
        value: (projectedValue - baseValue) / 1000 // Convert to thousands for display
      };
    });
  };

  // Calculator functions
  const calculateSimpleReturn = () => {
    // Mode'a göre APY belirle
    let apy = 0;
    if (calculatorMode === 'investment' && selectedPool) {
      apy = selectedPool.apy || 0;
    } else if (calculatorMode === 'liquidity' && selectedLiquidityPool) {
      apy = selectedLiquidityPool.apy || 0;
    } else if (calculatorMode === 'protocol' && selectedProtocol) {
      apy = selectedProtocol.apy || 0;
    }

    if (apy === 0) return 0;
    const annualRate = apy / 100; // Convert APY percentage to decimal
    return depositAmount * annualRate * (duration / 365);
  };

  const calculateCompoundReturn = () => {
    // Mode'a göre APY belirle
    let apy = 0;
    if (calculatorMode === 'investment' && selectedPool) {
      apy = selectedPool.apy || 0;
    } else if (calculatorMode === 'liquidity' && selectedLiquidityPool) {
      apy = selectedLiquidityPool.apy || 0;
    } else if (calculatorMode === 'protocol' && selectedProtocol) {
      apy = selectedProtocol.apy || 0;
    }

    if (apy === 0) return 0;
    const annualRate = apy / 100; // Convert APY percentage to decimal
    const periodsPerYear = compoundFreq === 'Daily' ? 365 :
      compoundFreq === 'Weekly' ? 52 :
        compoundFreq === 'Monthly' ? 12 :
          compoundFreq === 'Quarterly' ? 4 : 1;

    const periods = (duration / 365) * periodsPerYear;
    const ratePerPeriod = annualRate / periodsPerYear;

    return depositAmount * Math.pow(1 + ratePerPeriod, periods) - depositAmount;
  };

  // Router optimization function
  const calculateOptimalRoute = async () => {
    setIsCalculatingRoute(true);
    try {
      // Filter protocols based on risk tolerance
      const riskFiltered = protocols.filter(p => {
        if (routerRiskTolerance === 'low') {
          return p.risk_analysis && p.risk_analysis.risk_score < 40;
        } else if (routerRiskTolerance === 'medium') {
          return p.risk_analysis && p.risk_analysis.risk_score < 70;
        }
        return true; // High risk tolerance accepts all
      });

      // Sort by APY
      const sorted = [...riskFiltered].sort((a, b) => b.apy - a.apy);

      // Calculate allocation (simple strategy: split among top 3-5 protocols)
      const topProtocols = sorted.slice(0, 5);
      const totalAPY = topProtocols.reduce((sum, p) => sum + p.apy, 0);

      // Weighted allocation based on APY
      const allocations = topProtocols.map(p => {
        const weight = p.apy / totalAPY;
        const allocation = routerAmount * weight;
        const projectedYield = (allocation * p.apy) / 100;

        return {
          protocol: p,
          allocation: allocation,
          percentage: weight * 100,
          projectedYield: projectedYield,
          apy: p.apy
        };
      });

      setRouterAllocation(allocations);
      setRouterEnabled(true);
    } catch (error) {
      console.error('Error calculating optimal route:', error);
    } finally {
      setIsCalculatingRoute(false);
    }
  };

  const calculateAPY = () => {
    // Mode'a göre APY belirle
    if (calculatorMode === 'investment' && selectedPool) {
      return selectedPool.apy || 2.27;
    } else if (calculatorMode === 'liquidity' && selectedLiquidityPool) {
      return selectedLiquidityPool.apy || 2.27;
    } else if (calculatorMode === 'protocol' && selectedProtocol) {
      return selectedProtocol.apy || 2.27;
    }
    return 2.27; // Default fallback
  };

  const askAI = async () => {
    if (!aiQuestion.trim()) {
      return;
    }

    const currentQuestion = aiQuestion.trim();
    setAiQuestion(''); // Input'u hemen temizle
    setIsAskingAI(true);

    try {
      // Mode'a göre context oluştur
      let contextType = 'defi-analysis';
      let enhancedQuestion = currentQuestion;

      if (calculatorMode === 'investment') {
        contextType = 'investment-pool-analysis';
        const tvl = selectedProtocol?.tvl || 0;
        const liquidity = selectedProtocol?.liquidity || 0;
        const apy = selectedProtocol?.apy || 0;
        enhancedQuestion = `[Investment Pool Analysis] ${currentQuestion}\n\nPool Details:\n- TVL: $${(tvl / 1000000).toFixed(2)}M\n- Liquidity: $${(liquidity / 1000000).toFixed(2)}M\n- APY: ${apy}%\n\nProvide investment-focused analysis considering capital efficiency, liquidity depth, and staking rewards.`;
      } else if (calculatorMode === 'liquidity') {
        contextType = 'liquidity-pool-analysis';
        const liquidity = selectedProtocol?.liquidity || 0;
        const volume = selectedProtocol?.volume_24h || 0;
        const tvl = selectedProtocol?.tvl || 0;
        const apy = selectedProtocol?.apy || 0;
        const avgVolume = (volume || liquidity * 0.1) / 1000000;
        enhancedQuestion = `[Liquidity Pool Analysis] ${currentQuestion}\n\nPool Metrics:\n- Total Liquidity: $${(liquidity / 1000000).toFixed(2)}M\n- Avg Volume: $${avgVolume.toFixed(2)}M\n- TVL: $${(tvl / 1000000).toFixed(2)}M\n- APY: ${apy}%\n\nProvide liquidity provider analysis covering impermanent loss risks, trading fees, volume/liquidity ratio, and LP token mechanics.`;
      }

      const response = await fetch('https://stackpulsefi-api-latest.onrender.com/api/ai-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: enhancedQuestion,
          protocol: selectedProtocol || {
            name: calculatorMode === 'investment' ? 'Investment Pool' : calculatorMode === 'liquidity' ? 'Liquidity Pool' : 'General DeFi',
            type: calculatorMode
          },
          context: contextType,
          additionalInfo: {
            mode: calculatorMode,
            metrics: {
              tvl: selectedProtocol?.tvl || 0,
              liquidity: selectedProtocol?.liquidity || 0,
              apy: selectedProtocol?.apy || 0,
              volume: selectedProtocol?.volume_24h || 0
            }
          }
        }),
      });

      const data = await response.json();
      const answer = data.success ? data.response : 'Sorry, I could not process your question at the moment. Please try again.';

      // Geçmişe ekle (en yeni en üstte)
      setChatHistory(prev => [{
        question: currentQuestion,
        answer: answer,
        timestamp: new Date()
      }, ...prev]);

      setAiResponse(answer);
    } catch (error) {
      console.error('Error asking AI:', error);
      const errorMsg = 'Sorry, there was an error connecting to the AI service. Please ensure the backend server is running on port 3001.';

      setChatHistory(prev => [{
        question: currentQuestion,
        answer: errorMsg,
        timestamp: new Date()
      }, ...prev]);

      setAiResponse(errorMsg);
    } finally {
      setIsAskingAI(false);
    }
  };

  // Global AI Chat fonksiyonu
  const askGlobalAI = async () => {
    if (!globalAIQuestion.trim()) {
      return;
    }

    const currentQuestion = globalAIQuestion.trim();
    setGlobalAIQuestion('');
    setIsGlobalAIAsking(true);

    try {
      let enhancedQuestion = currentQuestion;

      // TÜM protokolleri al (seçili dahil)
      const allProtocols = protocols;

      // Soruda spesifik protokol isimleri var mı kontrol et
      const mentionedProtocols: Protocol[] = [];
      allProtocols.forEach(p => {
        const protocolNamePattern = new RegExp(`\\b${p.name}\\b`, 'i');
        if (protocolNamePattern.test(currentQuestion)) {
          mentionedProtocols.push(p);
        }
      });

      // Protokol seçimi: Soruda belirtilmişse sadece onları, yoksa top 10'u al
      let selectedProtocolsForAnalysis: Protocol[];
      if (mentionedProtocols.length > 0 && mentionedProtocols.length <= 5) {
        // Soruda 1-5 arası protokol belirtilmişse sadece onları kullan
        selectedProtocolsForAnalysis = mentionedProtocols;
        console.log(`User mentioned ${mentionedProtocols.length} specific protocols:`, mentionedProtocols.map(p => p.name));
      } else {
        // Belirtilmemişse veya çok fazla varsa, en iyi 10'u al
        selectedProtocolsForAnalysis = [...allProtocols]
          .sort((a, b) => b.tvl - a.tvl)
          .slice(0, 10);
      }

      // Protokol listesi oluştur
      const protocolsList = selectedProtocolsForAnalysis.map((p, index) =>
        `${index + 1}. ${p.name} (${p.type})
   - TVL: $${(p.tvl / 1000000).toFixed(2)}M
   - APY: ${p.apy.toFixed(2)}%
   - Liquidity: $${(p.liquidity / 1000000).toFixed(2)}M
   - Risk Score: ${p.risk_analysis?.risk_score || 'N/A'}/100 (${p.risk_analysis?.risk_category || 'Unknown'})
   - Chain: ${p.chain}`
      ).join('\n\n');

      let contextInfo = {
        blockchain: 'Stacks',
        totalProtocols: allProtocols.length,
        analyzingProtocols: selectedProtocolsForAnalysis.length,
        specificProtocolsRequested: mentionedProtocols.length > 0,
        topProtocols: selectedProtocolsForAnalysis.map(p => ({
          name: p.name,
          type: p.type,
          tvl: p.tvl,
          apy: p.apy,
          liquidity: p.liquidity,
          risk_score: p.risk_analysis?.risk_score,
          risk_category: p.risk_analysis?.risk_category,
          chain: p.chain
        })),
        currentlyViewing: selectedProtocol ? selectedProtocol.name : null
      };

      // Sorunun türünü analiz et
      const isGeneralQuestion = /stacks.*info|blockchain.*info|what.*stacks|explain.*stacks|how.*stacks|stacks.*work|blockchain.*work|defi.*work|smart.*contract/i.test(currentQuestion);
      const isComparisonQuestion = /which.*protocol|compare|better|safest|invest|recommend|which.*better|best.*protocol|highest|lowest|vs|versus/i.test(currentQuestion);

      // Genel DeFi analiz sorusu oluştur
      if (isGeneralQuestion && !isComparisonQuestion) {
        // Sadece genel blockchain bilgisi iste
        enhancedQuestion = `User Question: ${currentQuestion}

${selectedProtocol ? `Context: User is currently viewing ${selectedProtocol.name} protocol in the Stacks DeFi ecosystem.\n\n` : 'Context: User is exploring the Stacks DeFi ecosystem.\n\n'}Please provide a clear, educational answer about Stacks blockchain, DeFi concepts, or related technology. Focus on explaining concepts rather than comparing protocols.`;
      } else {
        // Protokol karşılaştırması iste
        enhancedQuestion = `[Stacks DeFi Analysis - Protocol Comparison]

User Question: ${currentQuestion}

Available Protocols (Top 10 by TVL):
${protocolsList}

${selectedProtocol ? `Currently Viewing: ${selectedProtocol.name} (${selectedProtocol.type}) - TVL: $${(selectedProtocol.tvl / 1000000).toFixed(2)}M, APY: ${selectedProtocol.apy}%

` : ''}Please provide a comprehensive analysis of DeFi protocols on Stacks blockchain. Focus on:
1. Safety & Risk Analysis - compare protocols by risk scores and security
2. Investment Recommendations - best protocols for different risk profiles and investment amounts
3. Liquidity Analysis - compare liquidity depth and trading volumes
4. APY vs Risk Comparison - evaluate risk-adjusted returns
5. Portfolio Strategy - diversification and allocation recommendations
6. Blockchain Context - Stacks ecosystem insights and DeFi trends

Answer the user's question with specific, data-driven recommendations. Compare all available protocols objectively.`;
      }

      console.log('Sending global AI request:', {
        question: currentQuestion,
        protocolCount: selectedProtocolsForAnalysis.length,
        specificProtocols: mentionedProtocols.length > 0,
        context: 'comparative-protocol-analysis'
      });

      const response = await fetch('https://stackpulsefi-api-latest.onrender.com/api/ai-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: enhancedQuestion,
          protocol: { name: 'DeFi Comparison Assistant', type: 'comparative-analysis' },
          context: 'comparative-protocol-analysis',
          additionalInfo: contextInfo
        }),
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('AI Response received:', {
        success: data.success,
        responseLength: data.response?.length || 0
      });

      const answer = data.success ? data.response : 'Sorry, I could not process your question at the moment. Please try again.';

      setGlobalChatHistory(prev => [{
        question: currentQuestion,
        answer: answer,
        timestamp: new Date()
      }, ...prev]);

      setGlobalAIResponse(answer);
    } catch (error) {
      console.error('Error asking global AI:', error);
      const errorMsg = 'Sorry, there was an error connecting to the AI service. Please ensure the backend server is running on port 3001.';

      setGlobalChatHistory(prev => [{
        question: currentQuestion,
        answer: errorMsg,
        timestamp: new Date()
      }, ...prev]);

      setGlobalAIResponse(errorMsg);
    } finally {
      setIsGlobalAIAsking(false);
    }
  };

  // Client-side only flag
  useEffect(() => {
    setIsClient(true);
  }, []);

  // Fetch protocols on mount
  useEffect(() => {
    fetchProtocols();
  }, []);

  // Fetch chart data when selected protocol or time range changes
  useEffect(() => {
    if (selectedProtocol) {
      fetchChartData(selectedProtocol.id, timeRange);
    }
  }, [selectedProtocol, timeRange]);

  // ESC tuşu ile modal kapatma
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && showAIChat) {
        closeAIChat();
      }
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [showAIChat]);

  // Filter protocols when search or filter changes
  useEffect(() => {
    let filtered = protocols;

    if (searchQuery) {
      filtered = filtered.filter(protocol =>
        protocol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.token.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType !== 'all') {
      filtered = filtered.filter(protocol => protocol.type === filterType);
    }

    // Sort protocols
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'tvl':
          return b.tvl - a.tvl;
        case 'apy':
          return b.apy - a.apy;
        case 'risk':
          return (a.risk_analysis?.risk_score || 50) - (b.risk_analysis?.risk_score || 50);
        default:
          return 0;
      }
    });

    setFilteredProtocols(filtered);
  }, [protocols, searchQuery, filterType, sortBy]);

  const fetchProtocols = async () => {
    try {
      setLoading(true);
      const response = await fetch('https://stackpulsefi-api-latest.onrender.com/api/protocols');
      const data = await response.json();

      if (data.success) {
        setProtocols(data.data);
        // Otomatik olarak ilk protokolü seç (TVL'ye göre sıralı)
        if (data.data.length > 0 && !selectedProtocol) {
          const sortedByTvl = [...data.data].sort((a, b) => b.tvl - a.tvl);
          setSelectedProtocol(sortedByTvl[0]);
        }
      } else {
        setError('Failed to fetch protocols');
      }
    } catch (err) {
      console.error('Error fetching protocols:', err);
      setError('Unable to connect to backend. Please ensure the backend server is running.');
    } finally {
      setLoading(false);
    }
  };

  const analyzePortfolio = async (walletAddress: string) => {
    try {
      setAnalyzingPortfolio(true);

      const response = await fetch('https://stackpulsefi-api-latest.onrender.com/api/analyze-portfolio', {
        method: 'POST',
        headers: {
          'Content-Type': 'applic1tion/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      const data = await response.json();

      if (data.success) {
        setPortfolioAnalysis(data.data.analysis);
      }
    } catch (err) {
      console.error('Error analyzing portfolio:', err);
    } finally {
      setAnalyzingPortfolio(false);
    }
  };

  const handleCompareToggle = (protocolId: string) => {
    setSelectedForCompare(prev => {
      if (prev.includes(protocolId)) {
        return prev.filter(id => id !== protocolId);
      } else if (prev.length < 4) {
        return [...prev, protocolId];
      }
      return prev;
    });
  };

  const getPortfolioHealthColor = (health: string) => {
    switch (health?.toLowerCase()) {
      case 'excellent':
        return 'text-green-600 bg-green-50';
      case 'good':
        return 'text-blue-600 bg-blue-50';
      case 'fair':
        return 'text-yellow-600 bg-yellow-50';
      case 'poor':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const protocolTypes = Array.from(new Set(protocols.map(p => p.type)));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-500 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">F</span>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">Stacks DeFi Advisor</h1>
                <p className="text-sm text-gray-600">Stacks</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <a href="/" className="flex items-center gap-1 sm:gap-2 px-2 py-1.5 sm:px-3 md:px-4 sm:py-2 text-xs sm:text-sm md:text-base bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white rounded-lg transition-all duration-300 hover:scale-105 font-medium shadow-lg">
                <TrendingUp size={18} />
                StackPulseFi DeFi Hub
              </a>
              {isClient && <WalletConnect />}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto px-4 py-8">
        {/* Protocol Selection */}
        <div className="mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-900">Select Protocol for Analysis</h2>
              {loading && (
                <div className="flex items-center gap-2 text-gray-600">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-sm">Loading protocols...</span>
                </div>
              )}
            </div>

            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse"></div>
                ))}
              </div>
            ) : protocols.length > 0 ? (
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {protocols.map(protocol => (
                  <button
                    key={protocol.id}
                    onClick={() => setSelectedProtocol(protocol)}
                    className={`p-3 rounded-lg text-left transition-all ${selectedProtocol?.id === protocol.id
                      ? 'bg-orange-500 text-white shadow-lg scale-105'
                      : 'bg-gray-50 hover:bg-gray-100 border border-gray-200'
                      }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${selectedProtocol?.id === protocol.id
                        ? 'bg-white/20'
                        : 'bg-gradient-to-br from-orange-400 to-orange-600'
                        }`}>
                        <span className={`text-xs font-bold ${selectedProtocol?.id === protocol.id ? 'text-white' : 'text-white'
                          }`}>
                          {protocol.token?.substring(0, 2).toUpperCase() || '??'}
                        </span>
                      </div>
                    </div>
                    <div className={`font-semibold text-sm mb-1 truncate ${selectedProtocol?.id === protocol.id ? 'text-white' : 'text-gray-900'
                      }`}>
                      {protocol.name}
                    </div>
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${selectedProtocol?.id === protocol.id ? 'text-white/80' : 'text-gray-500'
                        }`}>
                        {protocol.token}
                      </span>
                      <span className={`text-xs font-semibold ${selectedProtocol?.id === protocol.id ? 'text-white' : 'text-orange-600'
                        }`}>
                        {protocol.apy > 0 ? `${protocol.apy.toFixed(1)}%` : 'Token'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm font-semibold mb-1">No protocols available</p>
                <p className="text-xs">Please check your backend connection</p>
              </div>
            )}

            {selectedProtocol && (
              <div className="mt-4 p-4 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        {selectedProtocol.token?.substring(0, 2).toUpperCase() || '??'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold text-orange-900">{selectedProtocol.name}</h3>
                      <p className="text-sm text-orange-700">
                        <span className="font-semibold">{selectedProtocol.token}</span> |
                        TVL: ${(selectedProtocol.tvl / 1000000).toFixed(2)}M |
                        {selectedProtocol.apy > 0 ? `APY: ${selectedProtocol.apy.toFixed(2)}%` : 'Token'} |
                        Type: {selectedProtocol.type}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedProtocol(null)}
                    className="text-orange-600 hover:text-orange-800 text-xl font-bold"
                  >
                    ✕
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Stacks DeFi Dashboard */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          {/* Left Panel - Main Chart and Risk Analysis */}
          <div className="lg:col-span-2 space-y-6">
            {/* TVL/APR/Volume Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              {/* Time Range Selector */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Protocol Performance</h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setTimeRange('7d')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${timeRange === '7d'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    7 Days
                  </button>
                  <button
                    onClick={() => setTimeRange('30d')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${timeRange === '30d'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    30 Days
                  </button>
                  <button
                    onClick={() => setTimeRange('90d')}
                    className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${timeRange === '90d'
                      ? 'bg-purple-600 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    90 Days
                  </button>
                </div>
              </div>

              {/* Chart Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Chart - 2/3 width */}
                <div className="md:col-span-2">
                  {loadingChart ? (
                    <div className="flex items-center justify-center h-[300px]">
                      <Loader2 className="w-8 h-8 text-purple-600 animate-spin" />
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={300}>
                      <ComposedChart data={generateChartData()}>
                        <defs>
                          <linearGradient id="colorTvl" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                            <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0.1} />
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis
                          dataKey="date"
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                        />
                        <YAxis
                          yAxisId="left"
                          orientation="left"
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                          label={{ value: 'TVL ($M)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                        />
                        <YAxis
                          yAxisId="right"
                          orientation="right"
                          tick={{ fontSize: 12, fill: '#6b7280' }}
                          axisLine={{ stroke: '#d1d5db' }}
                          label={{ value: 'APR (%)', angle: 90, position: 'insideRight', style: { textAnchor: 'middle', fill: '#6b7280' } }}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'white',
                            border: '1px solid #e5e7eb',
                            borderRadius: '12px',
                            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                          }}
                        />
                        <Legend />
                        <Area
                          yAxisId="left"
                          type="monotone"
                          dataKey="tvl"
                          fill="url(#colorTvl)"
                          stroke="#8b5cf6"
                          strokeWidth={3}
                          name="TVL"
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="apr"
                          stroke="#ec4899"
                          strokeWidth={3}
                          dot={{ fill: '#ec4899', r: 4 }}
                          name="APR"
                        />
                        <Bar
                          yAxisId="left"
                          dataKey="volume"
                          fill="#06b6d4"
                          name="Volume"
                          radius={[6, 6, 0, 0]}
                        />
                      </ComposedChart>
                    </ResponsiveContainer>
                  )}
                </div>

                {/* Circular Chart - 1/3 width */}
                <div className="flex flex-col items-center justify-center">
                  {selectedProtocol ? (
                    <>
                      <ResponsiveContainer width="100%" height={200} key={`${timeRange}-${selectedProtocol.id}`}>
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'TVL', value: circleMetrics.tvl > 0 ? circleMetrics.tvl : selectedProtocol.tvl },
                              { name: 'Volume', value: circleMetrics.volume > 0 ? circleMetrics.volume : ((selectedProtocol.volume_24h && selectedProtocol.volume_24h > 0) ? selectedProtocol.volume_24h : selectedProtocol.tvl * 0.05) },
                              { name: 'Liquidity', value: circleMetrics.liquidity > 0 ? circleMetrics.liquidity : (selectedProtocol.liquidity || selectedProtocol.tvl * 1.2) }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={40}
                            outerRadius={80}
                            paddingAngle={5}
                            dataKey="value"
                            animationBegin={0}
                            animationDuration={800}
                            animationEasing="ease-out"
                            isAnimationActive={true}
                          >
                            <Cell fill="#8b5cf6" />
                            <Cell fill="#ec4899" />
                            <Cell fill="#06b6d4" />
                          </Pie>
                          <Tooltip
                            formatter={(value: any) => `$${(value / 1000000).toFixed(2)}M`}
                            contentStyle={{
                              backgroundColor: 'white',
                              border: '1px solid #e5e7eb',
                              borderRadius: '12px',
                              boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      <div className="mt-4 space-y-2 w-full">
                        <div className="flex items-center justify-between text-xs transition-all duration-500 ease-out">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-purple-600 animate-pulse"></div>
                            <span className="text-gray-700">Avg TVL</span>
                          </div>
                          <span className="font-semibold text-gray-900 transition-all duration-500">
                            ${((circleMetrics.tvl > 0 ? circleMetrics.tvl : selectedProtocol.tvl) / 1000000).toFixed(2)}M
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs transition-all duration-500 ease-out">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-pink-600 animate-pulse"></div>
                            <span className="text-gray-700">Avg Vol</span>
                          </div>
                          <span className="font-semibold text-gray-900 transition-all duration-500">
                            ${((circleMetrics.volume > 0 ? circleMetrics.volume : (selectedProtocol.volume_24h || selectedProtocol.tvl * 0.05)) / 1000000).toFixed(2)}M
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-xs transition-all duration-500 ease-out">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded-full bg-cyan-600 animate-pulse"></div>
                            <span className="text-gray-700">Avg Liq</span>
                          </div>
                          <span className="font-semibold text-gray-900 transition-all duration-500">
                            ${((circleMetrics.liquidity > 0 ? circleMetrics.liquidity : selectedProtocol.liquidity) / 1000000).toFixed(2)}M
                          </span>
                        </div>
                        <div className="text-center mt-2 pt-2 border-t border-gray-200">
                          <span className="text-[10px] text-gray-500 font-medium">📊 Based on {timeRange === '7d' ? '7' : timeRange === '30d' ? '30' : '90'} days</span>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-[300px] text-gray-400">
                      <BarChart3 className="w-16 h-16 mb-2" />
                      <p className="text-sm">Select a protocol</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Value Projection Cards - Dynamic */}
            {(() => {
              // Mode'a göre APY ve visibility kontrolü
              let currentAPY = 0;
              let showProjections = false;

              if (calculatorMode === 'investment' && selectedPool) {
                currentAPY = selectedPool.apy || 0;
                showProjections = currentAPY > 0;
              } else if (calculatorMode === 'liquidity' && selectedLiquidityPool) {
                currentAPY = selectedLiquidityPool.apy || 0;
                showProjections = currentAPY > 0;
              } else if (calculatorMode === 'protocol' && selectedProtocol) {
                currentAPY = selectedProtocol.apy || 0;
                showProjections = currentAPY > 0;
              }

              return showProjections ? (
                <div className="grid grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-purple-50 to-white rounded-lg shadow-lg p-4 text-center border border-purple-100">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-purple-600" />
                      <span className="text-sm font-semibold text-gray-700">VALUE PROJECTION</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">7 Days</div>
                    <div className="text-lg sm:text-xl md:text-2xl font-bold text-purple-600">
                      ${(depositAmount * (1 + (currentAPY / 100) * (7 / 365))).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      +${(depositAmount * (currentAPY / 100) * (7 / 365)).toFixed(2)} profit
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-pink-50 to-white rounded-lg shadow-lg p-4 text-center border border-pink-100">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-pink-600" />
                      <span className="text-sm font-semibold text-gray-700">VALUE PROJECTION</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">30 Days</div>
                    <div className="text-2xl font-bold text-pink-600">
                      ${(depositAmount * (1 + (currentAPY / 100) * (30 / 365))).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      +${(depositAmount * (currentAPY / 100) * (30 / 365)).toFixed(2)} profit
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50 to-white rounded-lg shadow-lg p-4 text-center border border-cyan-100">
                    <div className="flex items-center justify-center gap-2 mb-2">
                      <BarChart3 className="w-4 h-4 text-cyan-600" />
                      <span className="text-sm font-semibold text-gray-700">VALUE PROJECTION</span>
                    </div>
                    <div className="text-lg font-bold text-gray-900">90 Days</div>
                    <div className="text-2xl font-bold text-cyan-600">
                      ${(depositAmount * (1 + (currentAPY / 100) * (90 / 365))).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      +${(depositAmount * (currentAPY / 100) * (90 / 365)).toFixed(2)} profit
                    </div>
                  </div>
                </div>
              ) : null;
            })()}

            {/* Risk Analysis */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <Shield className="w-6 h-6 text-orange-500" />
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Risk Analysis</h3>
                    <p className="text-sm text-gray-600">Multi-factor risk assessment based on protocol metrics.</p>
                  </div>
                </div>
                {selectedProtocol && (
                  <div className="text-right">
                    <div className={`text-2xl font-bold ${(selectedProtocol.risk_analysis?.risk_score || 0) < 30 ? 'text-green-600' :
                      (selectedProtocol.risk_analysis?.risk_score || 0) < 50 ? 'text-yellow-600' :
                        (selectedProtocol.risk_analysis?.risk_score || 0) < 70 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                      {selectedProtocol.risk_analysis?.risk_score || 0}/100
                    </div>
                    <div className={`text-sm font-semibold ${(selectedProtocol.risk_analysis?.risk_score || 0) < 30 ? 'text-green-600' :
                      (selectedProtocol.risk_analysis?.risk_score || 0) < 50 ? 'text-yellow-600' :
                        (selectedProtocol.risk_analysis?.risk_score || 0) < 70 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                      {selectedProtocol.risk_analysis?.risk_category || 'Unknown'}
                    </div>
                  </div>
                )}
              </div>

              {selectedProtocol ? (
                <div className="space-y-4">
                  {selectedProtocol.risk_analysis?.risk_factors?.map((factor, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-orange-100">
                          <Shield className="w-4 h-4 text-orange-600" />
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900">Risk Factor {index + 1}</div>
                          <div className="text-sm text-gray-600">{factor}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2">
                          <div
                            className="h-2 rounded-full bg-orange-500"
                            style={{ width: `${Math.min(100, Math.max(0, selectedProtocol.risk_analysis?.risk_score || 0))}%` }}
                          ></div>
                        </div>
                        <span className="text-sm font-semibold text-gray-700 w-8">{selectedProtocol.risk_analysis?.risk_score || 0}%</span>
                      </div>
                    </div>
                  )) || []}

                  {selectedProtocol.risk_analysis?.warnings && selectedProtocol.risk_analysis.warnings.length > 0 && (
                    <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                      <h4 className="font-semibold text-red-900 mb-2">⚠️ Warnings</h4>
                      {selectedProtocol.risk_analysis.warnings.map((warning, index) => (
                        <p key={index} className="text-sm text-red-800 mb-1">{warning}</p>
                      ))}
                    </div>
                  )}

                  {selectedProtocol.risk_analysis?.recommendations && selectedProtocol.risk_analysis.recommendations.length > 0 && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-blue-900 mb-2">💡 Recommendations</h4>
                      {selectedProtocol.risk_analysis.recommendations.map((rec, index) => (
                        <p key={index} className="text-sm text-blue-800 mb-1">{rec}</p>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>Select a protocol to view detailed risk analysis</p>
                </div>
              )}

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-start gap-2">
                  <Info className="w-5 h-5 text-blue-600 mt-0.5" />
                  <p className="text-sm text-blue-900">
                    Risk scores are derived from real series: TVL volatility/drawdown, APR/APY volatility, liquidity turnover, volume concentration and recent momentum. Lower scores indicate lower risk.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel - Deposit Calculator and Value Projection */}
          <div className="space-y-6">
            {/* Deposit Calculator - Modern Design */}
            <div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 rounded-2xl shadow-2xl p-6 border border-purple-200/50 backdrop-blur-sm">
              {/* Header with Gradient */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-pink-500 rounded-xl shadow-lg flex items-center justify-center transform hover:scale-110 transition-transform">
                    <Calculator className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-extrabold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                      Smart Calculator
                    </h3>
                    {selectedProtocol && (
                      <p className="text-xs text-gray-600 font-medium">{selectedProtocol.name}</p>
                    )}
                  </div>
                </div>
                {/* AI Badge - More Prominent */}
                <button
                  onClick={() => setShowAIChat(true)}
                  className="group relative px-2 py-1.5 sm:px-3 md:px-4 sm:py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-full text-xs sm:text-sm font-bold shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300 flex items-center gap-1 sm:gap-2 animate-pulse hover:animate-none"
                >
                  <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <span>AI Advisor</span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-400 rounded-full animate-ping"></span>
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-green-500 rounded-full"></span>
                </button>
              </div>

              <div className="space-y-5">
                {/* Mode Selector - 3 Options: Investment (Default), Protocol, Liquidity Pool */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/80 backdrop-blur-sm rounded-xl shadow-lg border border-purple-200">
                  <button
                    onClick={() => setCalculatorMode('investment')}
                    className={`px-3 py-3 rounded-lg font-bold text-xs transition-all duration-300 flex flex-col items-center justify-center gap-1 ${calculatorMode === 'investment'
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                    <span>Investment</span>
                  </button>

                  <button
                    onClick={() => setCalculatorMode('liquidity')}
                    className={`px-3 py-3 rounded-lg font-bold text-xs transition-all duration-300 flex flex-col items-center justify-center gap-1 ${calculatorMode === 'liquidity'
                      ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                    </svg>
                    <span>Liquidity</span>
                  </button> <button
                    onClick={() => setCalculatorMode('protocol')}
                    className={`px-3 py-3 rounded-lg font-bold text-xs transition-all duration-300 flex flex-col items-center justify-center gap-1 ${calculatorMode === 'protocol'
                      ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:text-gray-900 hover:bg-white/50'
                      }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                    <span>Protocol</span>
                  </button>
                </div>

                {/* Modern Tabs with Glassmorphism - 3 Options */}
                <div className="grid grid-cols-3 gap-2 p-1.5 bg-white/60 backdrop-blur-sm rounded-xl shadow-inner">
                  <button
                    onClick={() => setActiveTab('protocol')}
                    className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1 ${activeTab === 'protocol'
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <span>{calculatorMode === 'investment' ? 'Investment' : calculatorMode === 'liquidity' ? 'Liquidity' : 'Protocol'}</span>
                  </button>
                  <button
                    onClick={() => setActiveTab('router')}
                    className={`px-3 py-2.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1 ${activeTab === 'router'
                      ? 'bg-gradient-to-r from-orange-500 to-pink-500 text-white shadow-lg transform scale-105'
                      : 'text-gray-600 hover:bg-white/80 hover:text-gray-900'
                      }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span>Router</span>
                  </button>
                </div>

                {/* Tab Content */}
                {activeTab === 'protocol' ? (
                  <>
                    {/* 3-Way Mode Selection Content */}
                    {calculatorMode === 'protocol' ? (
                      <>
                        {/* Protocol Selection Dropdown */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-blue-200 shadow-inner">
                          <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                            </svg>
                            Select Protocol
                          </label>
                          <select
                            value={selectedProtocol?.id || ''}
                            onChange={(e) => {
                              const protocol = protocols.find(p => p.id === e.target.value);
                              setSelectedProtocol(protocol || null);
                            }}
                            className="w-full px-4 py-3 bg-white border-2 border-blue-300 rounded-xl focus:ring-4 focus:ring-blue-400/50 focus:border-blue-500 font-semibold text-gray-800 transition-all"
                          >
                            <option value="">Choose a protocol...</option>
                            {protocols.map((protocol) => (
                              <option key={protocol.id} value={protocol.id}>
                                {protocol.name} - {protocol.apy.toFixed(2)}% APY
                              </option>
                            ))}
                          </select>
                        </div>
                      </>
                    ) : calculatorMode === 'investment' ? (
                      <>
                        {/* Investment Pool Selection */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-purple-200 shadow-inner">
                          <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4\" />
                            </svg>
                            Select Investment Pool
                          </label>
                          <select
                            value={selectedPool?.id || ''}
                            onChange={(e) => {
                              const pool = protocols.find(p => p.id === e.target.value);
                              setSelectedPool(pool || null);
                              if (pool) setSelectedProtocol(pool); // Pool se\u00e7ildi\u011finde hesaplama i\u00e7in protocol olarak da set et
                            }}
                            className="w-full px-4 py-3 bg-white border-2 border-purple-300 rounded-xl focus:ring-4 focus:ring-purple-400/50 focus:border-purple-500 font-semibold text-gray-800 transition-all"
                          >
                            <option value="">Choose a pool...</option>
                            {protocols.length === 0 ? (
                              <option disabled>Loading pools...</option>
                            ) : (
                              protocols.map((pool) => (
                                <option key={pool.id} value={pool.id}>
                                  {pool.name} - {pool.apy.toFixed(2)}% APY - ${(pool.tvl / 1000000).toFixed(2)}M TVL - {pool.type}
                                </option>
                              ))
                            )}
                          </select>
                          {selectedPool && (
                            <div className="mt-3 p-3 bg-purple-50 rounded-lg border border-purple-200">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">Pool TVL:</span>
                                <span className="font-bold text-purple-700">${(selectedPool.tvl / 1000000).toFixed(2)}M</span>
                              </div>
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span className="text-gray-600 font-medium">Liquidity:</span>
                                <span className="font-bold text-purple-700">${(selectedPool.liquidity / 1000000).toFixed(2)}M</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        {/* Liquidity Pool Selection */}
                        <div className="bg-white/70 backdrop-blur-sm rounded-xl p-4 border border-green-200 shadow-inner">
                          <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                            <svg className="w-4 h-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                            Select Liquidity Pool
                          </label>
                          <select
                            value={selectedLiquidityPool?.id || ''}
                            onChange={(e) => {
                              const pool = protocols.find(p => p.id === e.target.value);
                              setSelectedLiquidityPool(pool || null);
                              if (pool) setSelectedProtocol(pool);
                            }}
                            className="w-full px-4 py-3 bg-white border-2 border-green-300 rounded-xl focus:ring-4 focus:ring-green-400/50 focus:border-green-500 font-semibold text-gray-800 transition-all"
                          >
                            <option value="">Choose a liquidity pool...</option>
                            {protocols.length === 0 ? (
                              <option disabled>Loading pools...</option>
                            ) : (
                              protocols.map((pool) => (
                                <option key={pool.id} value={pool.id}>
                                  {pool.name} - {pool.apy.toFixed(2)}% APY - ${(pool.liquidity / 1000000).toFixed(2)}M Liquidity
                                </option>
                              ))
                            )}
                          </select>
                          {selectedLiquidityPool && (
                            <div className="mt-3 p-3 bg-green-50 rounded-lg border border-green-200">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-gray-600 font-medium">Total Liquidity:</span>
                                <span className="font-bold text-green-700">${(selectedLiquidityPool.liquidity / 1000000).toFixed(2)}M</span>
                              </div>
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span className="text-gray-600 font-medium">Avg Volume:</span>
                                <span className="font-bold text-green-700">
                                  ${(((selectedLiquidityPool.volume_24h || selectedLiquidityPool.liquidity * 0.1) / 1000000).toFixed(2))}M
                                </span>
                              </div>
                              <div className="flex items-center justify-between text-xs mt-1">
                                <span className="text-gray-600 font-medium">TVL:</span>
                                <span className="font-bold text-green-700">${(selectedLiquidityPool.tvl / 1000000).toFixed(2)}M</span>
                              </div>
                            </div>
                          )}
                        </div>
                      </>
                    )}

                    {/* Amount Input - Modern Glassmorphism Style */}
                    <div className="relative">
                      <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Investment Amount
                      </label>
                      <div className="relative group">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold text-purple-600 group-focus-within:text-pink-600 transition-colors">$</span>
                        <input
                          type="number"
                          value={depositAmount}
                          onChange={(e) => setDepositAmount(Number(e.target.value))}
                          className="w-full pl-8 sm:pl-10 pr-3 sm:pr-4 py-2.5 sm:py-3 md:py-4 text-base sm:text-lg md:text-xl font-bold bg-white/80 backdrop-blur-sm border-2 border-purple-200 rounded-xl focus:ring-4 focus:ring-purple-300/50 focus:border-purple-500 transition-all shadow-inner hover:shadow-lg"
                          placeholder="1000"
                        />
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500 bg-purple-50 px-2 py-1 rounded-md">
                          USD
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mt-2 flex items-center gap-1">
                        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                        Your principal investment amount
                      </p>
                    </div>

                    {/* Quick Select Buttons - Animated Cards */}
                    <div className="grid grid-cols-4 gap-2">
                      {[100, 200, 500, 1000].map((amount) => (
                        <button
                          key={amount}
                          onClick={() => setDepositAmount(amount)}
                          className={`px-3 py-3 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-110 hover:shadow-lg ${depositAmount === amount
                            ? 'bg-gradient-to-br from-purple-500 to-pink-500 text-white shadow-lg scale-105'
                            : 'bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-gradient-to-br hover:from-purple-100 hover:to-pink-100 border border-purple-200'
                            }`}
                        >
                          ${amount}
                        </button>
                      ))}
                    </div>

                    {/* Duration Slider - Modern Design */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-purple-100 shadow-inner">
                      <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Investment Duration
                      </label>
                      <div className="flex items-center gap-3 mb-3">
                        <span className="text-xs font-semibold text-purple-600 bg-purple-50 px-2 py-1 rounded-md">1d</span>
                        <input
                          type="range"
                          min="1"
                          max="365"
                          value={duration}
                          onChange={(e) => setDuration(Number(e.target.value))}
                          className="flex-1 h-2 bg-gradient-to-r from-purple-200 to-pink-200 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:bg-gradient-to-br [&::-webkit-slider-thumb]:from-purple-500 [&::-webkit-slider-thumb]:to-pink-500 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-lg hover:[&::-webkit-slider-thumb]:scale-110 [&::-webkit-slider-thumb]:transition-transform"
                        />
                        <span className="text-xs font-semibold text-pink-600 bg-pink-50 px-2 py-1 rounded-md">365d</span>
                      </div>
                      <div className="text-center">
                        <span className="inline-block bg-gradient-to-r from-purple-600 to-pink-600 text-white px-6 py-2 rounded-full text-lg font-bold shadow-lg">
                          {duration} days
                        </span>
                      </div>
                    </div>

                    {/* Compound Frequency - Modern Pills */}
                    <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 border border-purple-100 shadow-inner">
                      <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                        <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                        Compound Frequency
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        {['Daily', 'Weekly', 'Monthly', 'Quarterly', 'Annually'].map((freq) => (
                          <button
                            key={freq}
                            onClick={() => setCompoundFreq(freq)}
                            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all duration-300 transform hover:scale-105 ${compoundFreq === freq
                              ? 'bg-gradient-to-br from-orange-500 to-pink-500 text-white shadow-lg scale-105'
                              : 'bg-white/80 text-gray-700 hover:bg-gradient-to-br hover:from-orange-100 hover:to-pink-100 border border-orange-200 hover:shadow-md'
                              }`}
                          >
                            {freq}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Results - Modern Card with Animation */}
                    {(() => {
                      // Mode'a göre visibility kontrolü
                      if (calculatorMode === 'investment' && selectedPool && selectedPool.apy > 0) return true;
                      if (calculatorMode === 'liquidity' && selectedLiquidityPool && selectedLiquidityPool.apy > 0) return true;
                      if (calculatorMode === 'protocol' && selectedProtocol && selectedProtocol.apy > 0) return true;
                      return false;
                    })() ? (
                      <div className="relative overflow-hidden bg-gradient-to-br from-purple-600 via-pink-600 to-orange-500 rounded-2xl p-1 shadow-2xl animate-gradient">
                        <div className="bg-white/95 backdrop-blur-xl rounded-xl p-5 space-y-4">
                          {/* Header */}
                          <div className="flex items-center justify-between pb-3 border-b-2 border-purple-100">
                            <h4 className="text-lg font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent flex items-center gap-2">
                              <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                              </svg>
                              Profit Calculation
                            </h4>
                          </div>

                          {/* Metrics Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-3 border border-gray-200">
                              <div className="text-xs font-semibold text-gray-500 mb-1">Initial Deposit</div>
                              <div className="text-lg font-bold text-gray-900">${depositAmount.toFixed(2)}</div>
                            </div>
                            <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-3 border border-purple-200">
                              <div className="text-xs font-semibold text-purple-600 mb-1">Simple Return</div>
                              <div className="text-lg font-bold text-purple-700">+${calculateSimpleReturn().toFixed(2)}</div>
                            </div>
                            <div className="bg-gradient-to-br from-pink-50 to-pink-100 rounded-xl p-3 border border-pink-200">
                              <div className="text-xs font-semibold text-pink-600 mb-1">Compound Return</div>
                              <div className="text-lg font-bold text-pink-700">+${calculateCompoundReturn().toFixed(2)}</div>
                            </div>
                            <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-3 border border-orange-200">
                              <div className="text-xs font-semibold text-orange-600 mb-1">
                                {calculatorMode === 'investment' ? 'Pool APY' : calculatorMode === 'liquidity' ? 'LP APY' : 'Protocol APY'}
                              </div>
                              <div className="text-lg font-bold text-orange-700">{calculateAPY().toFixed(2)}%</div>
                            </div>
                          </div>

                          {/* Total Result - Featured */}
                          <div className="bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl p-5 shadow-lg transform hover:scale-105 transition-transform">
                            <div className="flex items-center justify-between text-white">
                              <div>
                                <div className="text-sm font-semibold opacity-90 mb-1">Final Amount</div>
                                <div className="text-3xl font-extrabold drop-shadow-lg">
                                  ${(depositAmount + calculateCompoundReturn()).toFixed(2)}
                                </div>
                              </div>
                              <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                                <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                                  <path d="M8.433 7.418c.155-.103.346-.196.567-.267v1.698a2.305 2.305 0 01-.567-.267C8.07 8.34 8 8.114 8 8c0-.114.07-.34.433-.582zM11 12.849v-1.698c.22.071.412.164.567.267.364.243.433.468.433.582 0 .114-.07.34-.433.582a2.305 2.305 0 01-.567.267z" />
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-13a1 1 0 10-2 0v.092a4.535 4.535 0 00-1.676.662C6.602 6.234 6 7.009 6 8c0 .99.602 1.765 1.324 2.246.48.32 1.054.545 1.676.662v1.941c-.391-.127-.68-.317-.843-.504a1 1 0 10-1.51 1.31c.562.649 1.413 1.076 2.353 1.253V15a1 1 0 102 0v-.092a4.535 4.535 0 001.676-.662C13.398 13.766 14 12.991 14 12c0-.99-.602-1.765-1.324-2.246A4.535 4.535 0 0011 9.092V7.151c.391.127.68.317.843.504a1 1 0 101.511-1.31c-.563-.649-1.413-1.076-2.354-1.253V5z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                            <div className="mt-3 text-xs text-white/80 font-medium">
                              Net Profit: +${calculateCompoundReturn().toFixed(2)} ({((calculateCompoundReturn() / depositAmount) * 100).toFixed(2)}%)
                            </div>
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl p-8 text-center border-2 border-dashed border-gray-300">
                        <div className="w-16 h-16 bg-gradient-to-br from-gray-300 to-gray-400 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Calculator className="w-8 h-8 text-white" />
                        </div>
                        <p className="text-sm font-semibold text-gray-600 mb-1">
                          {calculatorMode === 'protocol' ? 'No Protocol Selected' : calculatorMode === 'investment' ? 'No Investment Pool Selected' : 'No Liquidity Pool Selected'}
                        </p>
                        <p className="text-xs text-gray-500">
                          Select {calculatorMode === 'protocol' ? 'a protocol' : calculatorMode === 'investment' ? 'an investment pool' : 'a liquidity pool'} with APY to calculate returns
                        </p>
                      </div>
                    )}

                    {/* Action Button - Modern with Animation */}
                    {selectedProtocol && (
                      <div className="space-y-3">
                        <button
                          onClick={() => window.open(selectedProtocol.url, '_blank')}
                          className="group relative w-full bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 hover:from-purple-700 hover:via-pink-700 hover:to-orange-600 text-white font-bold py-4 px-6 rounded-xl flex items-center justify-center gap-3 shadow-2xl hover:shadow-purple-500/50 transition-all duration-300 transform hover:scale-105 overflow-hidden"
                        >
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                          <svg className="w-5 h-5 group-hover:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          <span className="relative">
                            {calculatorMode === 'protocol'
                              ? `Launch Protocol: ${selectedProtocol.name}`
                              : calculatorMode === 'investment'
                                ? `Join Investment Pool: ${selectedProtocol.name}`
                                : `Add Liquidity: ${selectedProtocol.name}`
                            }
                          </span>
                          <ExternalLink className="w-5 h-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                        </button>

                        <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-start gap-2">
                          <svg className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                          </svg>
                          <div>
                            <p className="text-xs font-bold text-green-900 mb-0.5">Secure & Non-Custodial</p>
                            <p className="text-xs text-green-700">
                              You'll be redirected to {selectedProtocol.name}. Your funds remain in your wallet.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <>
                    {/* Router Content */}
                    {!routerEnabled ? (
                      <div className="py-6">
                        <div className="text-center mb-6">
                          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-2">Smart Router Configuration</h3>
                          <p className="text-sm text-gray-600">
                            Automatically distribute your investment across multiple protocols for optimal returns
                          </p>
                        </div>                          {/* Investment Amount */}
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Investment Amount (USD)
                          </label>
                          <input
                            type="number"
                            value={routerAmount}
                            onChange={(e) => setRouterAmount(Number(e.target.value))}
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            min="100"
                            step="100"
                          />
                        </div>

                        {/* Risk Tolerance */}
                        <div className="mb-6">
                          <label className="block text-sm font-semibold text-gray-700 mb-3">
                            Risk Tolerance
                          </label>
                          <div className="grid grid-cols-3 gap-3">
                            <button
                              onClick={() => setRouterRiskTolerance('low')}
                              className={`p-3 rounded-lg border-2 transition-all ${routerRiskTolerance === 'low'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              <Shield className="w-5 h-5 mx-auto mb-1" />
                              <div className="text-xs font-semibold">Low Risk</div>
                            </button>
                            <button
                              onClick={() => setRouterRiskTolerance('medium')}
                              className={`p-3 rounded-lg border-2 transition-all ${routerRiskTolerance === 'medium'
                                ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              <TrendingUp className="w-5 h-5 mx-auto mb-1" />
                              <div className="text-xs font-semibold">Medium Risk</div>
                            </button>
                            <button
                              onClick={() => setRouterRiskTolerance('high')}
                              className={`p-3 rounded-lg border-2 transition-all ${routerRiskTolerance === 'high'
                                ? 'border-red-500 bg-red-50 text-red-700'
                                : 'border-gray-200 hover:border-gray-300'
                                }`}
                            >
                              <Sparkles className="w-5 h-5 mx-auto mb-1" />
                              <div className="text-xs font-semibold">High Risk</div>
                            </button>
                          </div>
                        </div>

                        {/* Info Box */}
                        <div className="bg-blue-50 rounded-lg p-4 mb-6">
                          <div className="text-sm text-blue-800">
                            <strong>Smart Routing:</strong> AI will automatically select and allocate your investment across the best performing protocols based on your risk tolerance.
                          </div>
                        </div>

                        {/* Calculate Button */}
                        <button
                          onClick={calculateOptimalRoute}
                          disabled={isCalculatingRoute || protocols.length === 0}
                          className="w-full bg-blue-500 hover:bg-blue-600 disabled:bg-gray-300 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2"
                        >
                          {isCalculatingRoute ? (
                            <>
                              <Loader2 className="w-5 h-5 animate-spin" />
                              Calculating Optimal Route...
                            </>
                          ) : (
                            <>
                              Calculate Optimal Route
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                            </>
                          )}
                        </button>
                      </div>
                    ) : (
                      /* Router Results */
                      <div className="py-6">
                        <div className="flex items-center justify-between mb-6">
                          <h3 className="text-lg font-semibold text-gray-900">Optimal Allocation Strategy</h3>
                          <button
                            onClick={() => setRouterEnabled(false)}
                            className="text-sm text-blue-600 hover:text-blue-700 font-semibold"
                          >
                            Reconfigure
                          </button>
                        </div>

                        {/* Summary Stats */}
                        <div className="grid grid-cols-3 gap-4 mb-6">
                          <div className="bg-gray-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Total Investment</div>
                            <div className="text-lg font-bold text-gray-900">
                              ${routerAmount.toLocaleString()}
                            </div>
                          </div>
                          <div className="bg-green-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Protocols</div>
                            <div className="text-lg font-bold text-green-600">
                              {routerAllocation.length}
                            </div>
                          </div>
                          <div className="bg-blue-50 rounded-lg p-3">
                            <div className="text-xs text-gray-600 mb-1">Est. Yearly Yield</div>
                            <div className="text-lg font-bold text-blue-600">
                              ${routerAllocation.reduce((sum, a) => sum + a.projectedYield, 0).toFixed(2)}
                            </div>
                          </div>
                        </div>

                        {/* Allocation List */}
                        <div className="space-y-3">
                          {routerAllocation.map((allocation, index) => (
                            <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                              <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-3">
                                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                    {index + 1}
                                  </div>
                                  <div>
                                    <div className="font-semibold text-gray-900">{allocation.protocol.name}</div>
                                    <div className="text-xs text-gray-500">{allocation.protocol.type}</div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <div className="text-sm font-bold text-green-600">{allocation.apy.toFixed(2)}% APY</div>
                                  <div className="text-xs text-gray-500">{allocation.percentage.toFixed(1)}%</div>
                                </div>
                              </div>

                              {/* Allocation Bar */}
                              <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                                <div
                                  className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full"
                                  style={{ width: `${allocation.percentage}%` }}
                                ></div>
                              </div>

                              <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Allocation: ${allocation.allocation.toFixed(2)}</span>
                                <span className="text-green-600 font-semibold">Yield: ${allocation.projectedYield.toFixed(2)}/year</span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Action Buttons */}
                        <div className="mt-6 grid grid-cols-2 gap-3">
                          <button className="bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            Execute Strategy
                          </button>
                          <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            Share Strategy
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </  div>
            </div>

            {/* AI Chat Modal - Popup Design */}
            {showAIChat && (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn" onClick={closeAIChat}>
                <div className="relative bg-gradient-to-br from-purple-900 via-indigo-900 to-blue-900 rounded-2xl shadow-2xl p-1 overflow-hidden max-w-3xl w-full max-h-[90vh] animate-fadeIn" onClick={(e) => e.stopPropagation()}>
                  {/* Animated Background */}
                  <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNC0xLjc5IDQtNCA0LTQtMS43OS00LTR6bTAgNGMwLTIuMjEgMS43OS00IDQtNHM0IDEuNzkgNCA0LTEuNzkgNC00IDQtNC0xLjc5LTQtNHoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20 animate-pulse"></div>

                  <div className="relative bg-gradient-to-br from-white via-purple-50 to-indigo-50 rounded-xl p-6 backdrop-blur-xl max-h-[85vh] overflow-y-auto">
                    {/* Header - Futuristic */}
                    <div className="flex items-center justify-between mb-6 pb-4 border-b-2 border-purple-200">
                      <div className="flex items-center gap-4">
                        <div className="relative">
                          <div className="w-14 h-14 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 rounded-2xl flex items-center justify-center shadow-xl transform hover:rotate-12 transition-transform">
                            <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-ping"></span>
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></span>
                        </div>
                        <div>
                          <h3 className="text-2xl font-black bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                            AI Advisor
                          </h3>
                          <p className="text-xs font-semibold text-gray-600 flex items-center gap-1">
                            <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                            Powered by Advanced ML
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={closeAIChat}
                        className="w-10 h-10 bg-gradient-to-br from-gray-100 to-gray-200 hover:from-red-100 hover:to-red-200 rounded-xl flex items-center justify-center text-gray-600 hover:text-red-600 font-bold text-xl transition-all transform hover:scale-110 hover:rotate-90 shadow-md"
                      >
                        ✕
                      </button>
                    </div>

                    <div className="space-y-5">
                      {/* Question Input - Futuristic Design */}
                      <div>
                        <label className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Ask about {selectedProtocol?.name || 'DeFi protocols'}
                        </label>
                        <div className="relative">
                          <textarea
                            value={aiQuestion}
                            onChange={(e) => setAiQuestion(e.target.value)}
                            placeholder="e.g., What are the risks? How does the protocol work? Is it safe to invest?"
                            className="w-full p-4 pr-20 border-2 border-purple-200 rounded-2xl focus:ring-4 focus:ring-purple-300/50 focus:border-purple-500 transition-all resize-none h-24 bg-white/80 backdrop-blur-sm shadow-inner"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                askAI();
                              }
                            }}
                          />
                          <button
                            onClick={askAI}
                            disabled={!aiQuestion.trim() || isAskingAI}
                            className="absolute right-2 bottom-2 p-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white font-bold rounded-xl flex items-center gap-2 shadow-lg hover:shadow-xl disabled:shadow-none transition-all transform hover:scale-105 disabled:scale-100"
                          >
                            {isAskingAI ? (
                              <>
                                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                <span className="hidden sm:inline">Thinking...</span>
                              </>
                            ) : (
                              <>
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                                <span className="hidden sm:inline">Ask AI</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>

                      {/* Chat History - Soru-Cevap Geçmişi */}
                      {chatHistory.length > 0 && (
                        <div className="space-y-4 max-h-96 overflow-y-auto">
                          {chatHistory.map((chat, index) => (
                            <div key={index} className="space-y-3 animate-fadeIn">
                              {/* Kullanıcı Sorusu */}
                              <div className="flex justify-end">
                                <div className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-5 py-3 max-w-[80%] shadow-lg">
                                  <p className="text-sm font-medium leading-relaxed">{chat.question}</p>
                                  <p className="text-xs opacity-75 mt-1">{chat.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</p>
                                </div>
                              </div>

                              {/* AI Cevabı */}
                              <div className="flex justify-start">
                                <div className="bg-white rounded-2xl rounded-tl-sm px-5 py-4 max-w-[85%] shadow-lg border border-purple-100">
                                  <div className="flex items-center gap-2 mb-2">
                                    <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                                      <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                      </svg>
                                    </div>
                                    <span className="text-xs font-bold text-purple-700">AI Advisor</span>
                                    <span className="ml-auto text-xs text-gray-500">{chat.timestamp.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}</span>
                                  </div>
                                  <p className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{chat.answer}</p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* AI Response - Modern Message Bubble (Eski, silinecek ama şu an gizli) */}
                      {false && aiResponse && (
                        <div className="relative bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl p-1 shadow-xl animate-fadeIn">
                          <div className="bg-white/95 backdrop-blur-sm rounded-xl p-5">
                            <div className="flex items-start gap-4">
                              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0 shadow-lg">
                                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                                </svg>
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-3">
                                  <h4 className="font-bold text-gray-900 text-lg">AI Analysis</h4>
                                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">Verified</span>
                                </div>
                                <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{aiResponse}</p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Quick Questions - Modern Pills - Mode-Specific */}
                      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-200">
                        <p className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                          <svg className="w-4 h-4 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          Quick Questions
                        </p>
                        <div className="grid grid-cols-1 gap-2">
                          {(calculatorMode === 'investment' ? [
                            { q: "What's the capital efficiency of this pool?", icon: "📊" },
                            { q: "How deep is the liquidity?", icon: "💎" },
                            { q: "What are staking rewards and how are they distributed?", icon: "🎁" },
                            { q: "What's the expected APY breakdown?", icon: "💰" }
                          ] : calculatorMode === 'liquidity' ? [
                            { q: "What's my impermanent loss risk?", icon: "⚠️" },
                            { q: "How are LP fees calculated and distributed?", icon: "💸" },
                            { q: "What's the volume to liquidity ratio?", icon: "📈" },
                            { q: "How do LP token mechanics work?", icon: "🔧" }
                          ] : [
                            { q: "What are the main risks?", icon: "⚠️" },
                            { q: "How does this protocol work?", icon: "🔧" },
                            { q: "Is it safe to invest?", icon: "🛡️" },
                            { q: "What's the expected return?", icon: "💰" }
                          ]).map((item, index) => (
                            <button
                              key={index}
                              onClick={() => setAiQuestion(item.q)}
                              className="group text-left px-4 py-3 bg-white hover:bg-gradient-to-r hover:from-purple-50 hover:to-indigo-50 rounded-xl text-sm font-semibold text-gray-700 hover:text-purple-700 border border-gray-200 hover:border-purple-300 transition-all transform hover:scale-105 hover:shadow-md flex items-center gap-3"
                            >
                              <span className="text-xl group-hover:scale-125 transition-transform">{item.icon}</span>
                              <span>{item.q}</span>
                              <svg className="w-4 h-4 ml-auto opacity-0 group-hover:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                              </svg>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Value Projection Chart */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <BarChart3 className="w-6 h-6 text-orange-500" />
                <h3 className="text-lg font-bold text-gray-900">Value Projection</h3>
              </div>

              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={generateProjectionData()}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="period"
                    tick={{ fontSize: 10, fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: '#666' }}
                    axisLine={{ stroke: '#e0e0e0' }}
                    label={{ value: 'Value ($K)', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle', fill: '#666' } }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
                    }}
                  />
                  <Bar dataKey="value" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Popular Tokens */}
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center gap-3 mb-4">
                <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <h3 className="text-lg font-bold text-gray-900">Popular Tokens</h3>
              </div>

              <div className="space-y-3">
                {protocols
                  .filter(p => p.type === 'token')
                  .slice(0, 6)
                  .map((token) => (
                    <div
                      key={token.id}
                      className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={() => setSelectedProtocol(token)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">
                            {token.token?.substring(0, 2) || '??'}
                          </span>
                        </div>
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">{token.token}</div>
                          <div className="text-xs text-gray-500">{token.name}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900 text-sm">
                          ${(token.tvl / 1000000).toFixed(1)}M
                        </div>
                        <div className="text-xs text-gray-500">TVL</div>
                      </div>
                    </div>
                  ))}

                {protocols.filter(p => p.type === 'token').length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <svg className="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-sm">No token data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Global AI Assistant - Fixed Bottom Right */}
      <div className="fixed bottom-6 right-6 z-50">
        {!globalAIChatOpen ? (
          <button
            onClick={() => setGlobalAIChatOpen(true)}
            className="group relative w-16 h-16 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-700 hover:via-indigo-700 hover:to-blue-700 rounded-full shadow-2xl hover:shadow-purple-500/50 flex items-center justify-center transition-all duration-300 transform hover:scale-110 animate-bounce hover:animate-none"
          >
            {/* Pulse animation */}
            <span className="absolute inset-0 rounded-full bg-purple-400 animate-ping opacity-75"></span>
            <span className="absolute inset-0 rounded-full bg-gradient-to-br from-purple-600 to-blue-600"></span>

            {/* AI Icon */}
            <svg className="relative w-8 h-8 text-white group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>

            {/* Tooltip */}
            <div className="absolute bottom-full right-0 mb-2 px-3 py-1 bg-gray-900 text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
              AI Assistant
            </div>

            {/* Notification badge */}
            {globalChatHistory.length > 0 && (
              <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                {globalChatHistory.length}
              </span>
            )}
          </button>
        ) : (
          <div className="w-[95vw] sm:w-[450px] h-[85vh] sm:h-[700px] max-w-[500px] bg-white rounded-2xl shadow-2xl overflow-hidden border border-purple-200 flex flex-col animate-fadeIn">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-white">AI Assistant</h3>
                  <p className="text-xs text-white/80">Stacks DeFi Expert</p>
                </div>
              </div>
              <button
                onClick={() => setGlobalAIChatOpen(false)}
                className="w-8 h-8 bg-white/20 hover:bg-white/30 rounded-lg flex items-center justify-center text-white transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Protocol Context Banner */}
            <div className="bg-gradient-to-r from-purple-50 via-indigo-50 to-blue-50 px-4 py-2 border-b border-purple-200">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-purple-900">General DeFi Assistant</p>
                  <p className="text-xs text-gray-700">
                    Analyzing {protocols.length} protocols{selectedProtocol ? ` • Viewing: ${selectedProtocol.name}` : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-4">
              {/* Welcome Message */}
              {globalChatHistory.length === 0 && (
                <div className="text-center py-6 px-2">
                  <div className="w-16 h-16 bg-gradient-to-br from-purple-100 to-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                    </svg>
                  </div>
                  <h4 className="font-bold text-gray-900 mb-2">Welcome to DeFi Advisor!</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Analyze and compare all {protocols.length} DeFi protocols on Stacks
                  </p>

                  <div className="space-y-2 text-left max-w-sm mx-auto">
                    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
                      <p className="text-xs font-bold text-green-900 mb-1">🎯 Example Questions:</p>
                      <div className="space-y-1 text-xs text-gray-700">
                        <button
                          onClick={() => setGlobalAIQuestion("Which protocol is the safest to invest in?")}
                          className="block w-full text-left hover:text-green-800 hover:font-semibold transition-all cursor-pointer"
                        >
                          • "Which protocol is the safest to invest in?"
                        </button>
                        <button
                          onClick={() => setGlobalAIQuestion("Compare protocols by risk score")}
                          className="block w-full text-left hover:text-green-800 hover:font-semibold transition-all cursor-pointer"
                        >
                          • "Compare protocols by risk score"
                        </button>
                        <button
                          onClick={() => setGlobalAIQuestion("Which has better liquidity?")}
                          className="block w-full text-left hover:text-green-800 hover:font-semibold transition-all cursor-pointer"
                        >
                          • "Which has better liquidity?"
                        </button>
                        <button
                          onClick={() => setGlobalAIQuestion("Best protocol for $10k investment?")}
                          className="block w-full text-left hover:text-green-800 hover:font-semibold transition-all cursor-pointer"
                        >
                          • "Best protocol for $10k investment?"
                        </button>
                      </div>
                    </div>

                    <button
                      onClick={() => setGlobalAIQuestion("Tell me about safety and risk analysis for these protocols")}
                      className="w-full bg-white rounded-lg p-2 text-sm text-gray-700 border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer text-left"
                    >
                      🛡️ Safety & Risk Analysis
                    </button>
                    <button
                      onClick={() => setGlobalAIQuestion("What are your investment recommendations?")}
                      className="w-full bg-white rounded-lg p-2 text-sm text-gray-700 border border-indigo-100 hover:border-indigo-300 hover:bg-indigo-50 transition-all cursor-pointer text-left"
                    >
                      💎 Investment Recommendations
                    </button>
                    <button
                      onClick={() => setGlobalAIQuestion("Compare all protocols for me")}
                      className="w-full bg-white rounded-lg p-2 text-sm text-gray-700 border border-blue-100 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer text-left"
                    >
                      📊 Protocol Comparisons
                    </button>
                    <button
                      onClick={() => setGlobalAIQuestion("Tell me about Stacks blockchain")}
                      className="w-full bg-white rounded-lg p-2 text-sm text-gray-700 border border-purple-100 hover:border-purple-300 hover:bg-purple-50 transition-all cursor-pointer text-left"
                    >
                      🔗 Stacks Blockchain Info
                    </button>
                  </div>
                </div>
              )}

              {/* Chat History */}
              {globalChatHistory.map((chat, index) => (
                <div key={index} className="space-y-3">
                  {/* User Question */}
                  <div className="flex justify-end">
                    <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-4 py-2 max-w-[80%] shadow-lg">
                      <p className="text-sm">{chat.question}</p>
                      <p className="text-xs text-white/70 mt-1">
                        {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>

                  {/* AI Response */}
                  <div className="flex justify-start">
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-2 max-w-[80%] shadow-lg border border-gray-200">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="w-5 h-5 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-full flex items-center justify-center">
                          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        </div>
                        <span className="text-xs font-semibold text-gray-900">AI Assistant</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{chat.answer}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {chat.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {/* Loading State */}
              {isGlobalAIAsking && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-lg border border-gray-200">
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-purple-600" />
                      <span className="text-sm text-gray-600">AI is thinking...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Input Area */}
            <div className="p-4 bg-white border-t border-gray-200">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={globalAIQuestion}
                  onChange={(e) => setGlobalAIQuestion(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && !isGlobalAIAsking && askGlobalAI()}
                  placeholder="Ask anything about DeFi..."
                  disabled={isGlobalAIAsking}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500 text-sm disabled:bg-gray-100"
                />
                <button
                  onClick={askGlobalAI}
                  disabled={isGlobalAIAsking || !globalAIQuestion.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 disabled:from-gray-300 disabled:to-gray-400 text-white rounded-lg transition-all transform hover:scale-105 disabled:transform-none disabled:cursor-not-allowed"
                >
                  {isGlobalAIAsking ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Powered by AI • Stacks Blockchain Expert
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}