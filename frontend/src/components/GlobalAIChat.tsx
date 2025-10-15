'use client';

import { useState, useEffect } from 'react';
import { Bot, Send, X, MessageCircle, Sparkles, TrendingUp, HelpCircle, Plus, Rocket, Clock } from 'lucide-react';
import { stacksApi } from '@/lib/stacks/api';
import { SCALING_FACTOR, RISK_PROFILE_NAMES, parseSBTC } from '@/lib/stacks/config';
import { createStakingPool, createVault } from '@/lib/stacks/wallet';

interface GlobalAIChatProps {
  poolCount: number;
  vaultCount: number;
  futureFundCount?: number;
}

export default function GlobalAIChat({ poolCount, vaultCount, futureFundCount = 0 }: GlobalAIChatProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [askedQuestion, setAskedQuestion] = useState('');
  const [response, setResponse] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [activeTab, setActiveTab] = useState<'pool' | 'vault' | 'general' | 'actions' | 'futurefund'>('pool');

  // Actions tab states
  const [showPoolCreator, setShowPoolCreator] = useState(false);
  const [showVaultCreator, setShowVaultCreator] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [availablePools, setAvailablePools] = useState<number[]>([]);

  // Load available pools when component mounts
  useEffect(() => {
    const loadPools = async () => {
      try {
        const count = await stacksApi.getPoolCount();
        // Only show pools 1, 2, 3 (Conservative, Moderate, Aggressive)
        const pools = Array.from({ length: Math.min(count, 3) }, (_, i) => i + 1);
        setAvailablePools(pools);
      } catch (error) {
        console.error('Error loading pools:', error);
        // Fallback to default 3 pools
        setAvailablePools([1, 2, 3]);
      }
    };

    loadPools();
  }, []);


  const poolQuestions = [
    "Analyze my current pools",
    "Which pool is better?",
    "What is the safest pool?",
    "Which pool for high returns?",
    "Perform risk analysis"
  ];

  const vaultQuestions = [
    "Show all vaults",
    "Which vault has best returns?",
    "What is auto-compounding?",
    "Explain vault fees",
    "Compare vault performance"
  ];

  const generalQuestions = [
    "What is Stacks?",
    "How does sBTC work?",
    "What is yield farming?",
    "What are DeFi risks?",
    "What is staking?"
  ];

  const actionQuestions = [
    "How do I create a pool?",
    "What parameters for safe pool?",
    "Create conservative pool",
    "Create high-yield vault",
    "Suggest pool parameters"
  ];

  const futureFundQuestions = [
    "What is FutureFund?",
    "Retirement vs Education fund?",
    "How do APY rates work?",
    "When can I withdraw?",
    "What is early withdrawal fee?",
    "Should I create retirement fund?",
    "Best lock duration for me?",
    "How to maximize FutureFund returns?"
  ];

  const askAI = async (questionText?: string, isSpecificQuestion = false) => {
    const finalQuestion = questionText || question;
    if (!finalQuestion.trim()) return;

    // Soruyu kaydet ve input'u temizle
    setAskedQuestion(finalQuestion);
    setQuestion('');
    setIsAsking(true);

    try {
      let poolData = [];
      let vaultData = [];
      let requestType = 'general';

      // Vault analizi için gerçek veri çek
      if (isSpecificQuestion && activeTab === 'vault') {
        const actualVaultCount = Math.max(vaultCount, 1);
        console.log('Fetching vault data for analysis:', actualVaultCount);

        for (let i = 1; i <= actualVaultCount; i++) {
          try {
            const vaultInfo = await stacksApi.getVaultInfo(i);

            if (vaultInfo && vaultInfo !== null) {
              const performance = await stacksApi.getVaultPerformance(i);
              const harvestReady = await stacksApi.isHarvestReady(i);

              vaultData.push({
                id: i,
                name: vaultInfo.name,
                type: 'auto-compound',
                totalAssets: vaultInfo['total-assets'] / SCALING_FACTOR,
                totalShares: vaultInfo['total-shares'],
                minDeposit: vaultInfo['min-deposit'] / SCALING_FACTOR,
                managementFee: vaultInfo['management-fee'] / 10000,
                performanceFee: vaultInfo['performance-fee'] / 10000,
                active: vaultInfo.active,
                harvestReady: harvestReady,
                performance: performance ? {
                  totalHarvests: performance['total-harvests'],
                  totalRewardsCompounded: performance['total-rewards-compounded'] / SCALING_FACTOR,
                  totalFeesCollected: performance['total-fees-collected'] / SCALING_FACTOR,
                } : null
              });
              console.log(`Vault ${i} data from smart contract:`, vaultData[vaultData.length - 1]);
            }
          } catch (error) {
            console.warn(`Failed to fetch vault ${i} data:`, error);
          }
        }
        console.log('Total vault data collected:', vaultData);
        requestType = 'vault-analysis';
      }

      // Pool analizi için gerçek veri çek - PoolCard ile aynı metodu kullan
      else if (isSpecificQuestion && activeTab === 'pool') {
        const actualPoolCount = Math.max(poolCount, 3);
        console.log('Fetching pool data for analysis:', actualPoolCount);

        for (let i = 1; i <= actualPoolCount; i++) {
          try {
            // Smart contract'tan direkt pool bilgisini çek (PoolCard gibi)
            const poolInfo = await stacksApi.getPoolInfo(i);

            if (poolInfo && poolInfo !== null) {
              // Lock period'u blocks'tan günlere çevir
              const BLOCKS_PER_DAY = 144;
              const lockPeriodDays = Math.round(poolInfo['deposit-lock-period'] / BLOCKS_PER_DAY);

              poolData.push({
                id: i,
                name: `Pool ${i}`,
                type: 'staking',
                tvl: poolInfo['total-staked'] / SCALING_FACTOR,
                apy: poolInfo['reward-rate'] / SCALING_FACTOR,
                token: 'sBTC',
                audit_status: 'audited',
                risk_profile: poolInfo['risk-profile'],
                lock_period: lockPeriodDays,
                fee_percent: poolInfo['fee-percent'] / 100,
                total_staked: poolInfo['total-staked'] / SCALING_FACTOR,
                active: poolInfo.active,
                created_at: poolInfo['created-at'],
                risk_analysis: {
                  risk_score: poolInfo['risk-profile'] * 20, // 1-5 to 0-100
                  risk_category: RISK_PROFILE_NAMES[poolInfo['risk-profile'] as keyof typeof RISK_PROFILE_NAMES] || 'Unknown',
                  risk_color: poolInfo['risk-profile'] === 1 ? 'green' : poolInfo['risk-profile'] === 2 ? 'yellow' : 'red',
                  risk_factors: [
                    `${poolInfo['total-staked'] / SCALING_FACTOR > 500000 ? 'High' : poolInfo['total-staked'] / SCALING_FACTOR > 100000 ? 'Moderate' : 'Low'} Total Value Locked`,
                    `${poolInfo['reward-rate'] / SCALING_FACTOR > 15 ? 'High' : poolInfo['reward-rate'] / SCALING_FACTOR > 8 ? 'Moderate' : 'Stable'} APY`,
                    'Smart contracts have been audited'
                  ],
                  warnings: [],
                  recommendations: []
                }
              });
              console.log(`Pool ${i} data from smart contract:`, poolData[poolData.length - 1]);
            }
          } catch (error) {
            console.warn(`Failed to fetch pool ${i} data:`, error);
          }
        }
        console.log('Total pool data collected:', poolData);
        requestType = 'pool-analysis';
      }

      // FutureFund analizi için context hazırla
      else if (isSpecificQuestion && activeTab === 'futurefund') {
        console.log('Preparing FutureFund context for AI');
        requestType = 'futurefund-advice';
      }

      const response = await fetch('https://stackpulsefi-api-latest.onrender.com/api/ai-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: finalQuestion,
          protocol: {
            name: requestType === 'vault-analysis' ? 'Vault Comparison Analysis' : requestType === 'pool-analysis' ? 'Pool Comparison Analysis' : requestType === 'futurefund-advice' ? 'FutureFund Advisor' : 'General DeFi Advisor',
            type: requestType === 'vault-analysis' ? 'vault-comparison' : requestType === 'pool-analysis' ? 'comparison' : requestType === 'futurefund-advice' ? 'futurefund' : 'advisor',
            tvl: 0,
            apy: 0,
            token: 'sBTC',
            audit_status: 'audited',
            risk_analysis: {
              risk_score: 0,
              risk_category: requestType === 'vault-analysis' ? 'Vault Analysis' : requestType === 'pool-analysis' ? 'Analysis' : requestType === 'futurefund-advice' ? 'FutureFund' : 'General'
            }
          },
          context: requestType === 'vault-analysis' ? 'vault-comparison' : requestType === 'pool-analysis' ? 'pool-comparison' : requestType === 'futurefund-advice' ? 'futurefund-advice' : 'general-advice',
          additionalInfo: requestType === 'vault-analysis' ? {
            poolCount,
            vaultCount,
            availableVaults: vaultData,
            requestType: 'vault-analysis'
          } : requestType === 'pool-analysis' ? {
            poolCount,
            vaultCount,
            availablePools: poolData,
            requestType: 'pool-analysis'
          } : requestType === 'futurefund-advice' ? {
            futureFundCount,
            futureFundFeatures: {
              retirementFund: {
                minLockPeriod: '5 years',
                apyRates: {
                  '5years': '8%',
                  '10years': '12%',
                  '15years': '16%',
                  '20years': '20%'
                },
                earlyWithdrawalFee: '20%',
                features: ['Long-term savings', 'Multiple funds allowed', 'Claim rewards anytime', 'Early withdrawal with 20% penalty']
              },
              educationFund: {
                minLockPeriod: '5 years',
                apyRates: {
                  '5years': '8%',
                  '10years': '12%',
                  '15years': '16%',
                  '20years': '20%'
                },
                earlyWithdrawalFee: '20%',
                features: ['Guardian-controlled', 'Goal tracking', 'Anyone can contribute', 'Early withdrawal with 20% penalty']
              },
              generalInfo: {
                token: 'sBTC',
                rewardCalculation: 'Reward = Balance * APY * (Time Passed / Year)',
                blocksPerYear: 52560,
                contract: 'Smart contract secured'
              }
            },
            requestType: 'futurefund-advice'
          } : {}
        }),
      });

      const data = await response.json();
      if (data.success) {
        setResponse(data.response);
      } else {
        setResponse('Sorry, I could not process your question at the moment. Please try again.');
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      setResponse('Sorry, there was an error connecting to the AI service. Please try again.');
    } finally {
      setIsAsking(false);
    }
  };

  const handleQuickQuestion = (quickQuestion: string, isSpecificQuestion = false) => {
    // Direkt soruyu gönder, input'a yazmaya gerek yok
    askAI(quickQuestion, isSpecificQuestion);
  };

  const handleCreatePool = async (params: {
    tokenContract: string;
    riskProfile: number;
    rewardRate: string;
    minStake: string;
    maxStake: string;
    feePercent: string;
    lockDays: string;
  }) => {
    setIsCreating(true);
    try {
      const BLOCKS_PER_DAY = 144;
      await createStakingPool(
        params.tokenContract,
        params.riskProfile,
        BigInt(Math.floor(parseFloat(params.rewardRate) * 100000000)), // APY to scaled number
        parseSBTC(params.minStake),
        parseSBTC(params.maxStake),
        BigInt(Math.floor(parseFloat(params.feePercent) * 10000)), // Fee to scaled
        BigInt(parseInt(params.lockDays) * BLOCKS_PER_DAY),
        (data) => {
          setResponse(`✅ Pool created successfully! Transaction: ${data.txId}`);
          setIsCreating(false);
          setShowPoolCreator(false);
        },
        () => {
          setResponse(`❌ Pool creation cancelled`);
          setIsCreating(false);
        }
      );
    } catch (error: any) {
      setResponse(`❌ Error creating pool: ${error.message}`);
      setIsCreating(false);
    }
  };

  const handleCreateVault = async (params: {
    name: string;
    underlyingPoolId: number;
    tokenContract: string;
    minDeposit: string;
    managementFee: string;
    performanceFee: string;
    harvestReward: string;
  }) => {
    setIsCreating(true);
    try {
      await createVault(
        params.name,
        params.underlyingPoolId,
        params.tokenContract,
        parseSBTC(params.minDeposit),
        BigInt(Math.floor(parseFloat(params.managementFee) * 10000)), // Fee to scaled
        BigInt(Math.floor(parseFloat(params.performanceFee) * 10000)), // Fee to scaled
        parseSBTC(params.harvestReward),
        (data) => {
          setResponse(`✅ Vault created successfully! Transaction: ${data.txId}`);
          setIsCreating(false);
          setShowVaultCreator(false);
        },
        () => {
          setResponse(`❌ Vault creation cancelled`);
          setIsCreating(false);
        }
      );
    } catch (error: any) {
      setResponse(`❌ Error creating vault: ${error.message}`);
      setIsCreating(false);
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <div className="fixed bottom-6 right-6 z-[9999]">
        <button
          onClick={() => setIsOpen(true)}
          className="group relative bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-full p-4 shadow-2xl transition-all duration-300 hover:scale-110 hover:shadow-purple-500/25 border-2 border-white"
        >
          <Bot size={24} className="group-hover:animate-bounce" />
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-green-400 rounded-full flex items-center justify-center animate-pulse">
            <Sparkles size={12} className="text-white" />
          </div>

          {/* Tooltip */}
          <div className="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 whitespace-nowrap">
            AI DeFi Advisor
            <div className="absolute top-full right-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900"></div>
          </div>
        </button>
      </div>

      {/* Chat Modal */}
      {isOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-end justify-end z-[9999] p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg h-[82vh] max-h-[850px] flex flex-col animate-slide-in">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg">
                  <Bot size={20} className="text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">AI DeFi Advisor</h3>
                  <p className="text-sm text-gray-500">Pool & Vault Analysis</p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X size={20} className="text-gray-500" />
              </button>
            </div>

            {/* Chat Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Tab Navigation */}
              <div className="flex gap-1.5 p-3 border-b border-gray-100 overflow-x-auto">
                <button
                  onClick={() => setActiveTab('actions')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'actions'
                    ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <Rocket size={15} />
                  <span className="text-xs font-semibold">Create</span>
                </button>
                <button
                  onClick={() => setActiveTab('pool')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'pool'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <TrendingUp size={15} />
                  <span className="text-xs font-semibold">Pools</span>
                </button>
                <button
                  onClick={() => setActiveTab('vault')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'vault'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <Sparkles size={15} />
                  <span className="text-xs font-semibold">Vaults</span>
                </button>
                <button
                  onClick={() => setActiveTab('futurefund')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'futurefund'
                    ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <Clock size={15} />
                  <span className="text-xs font-semibold">Future</span>
                </button>
                <button
                  onClick={() => setActiveTab('general')}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg transition-all whitespace-nowrap ${activeTab === 'general'
                    ? 'bg-gradient-to-r from-purple-500 to-blue-500 text-white shadow-lg'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  <HelpCircle size={15} />
                  <span className="text-xs font-semibold">General</span>
                </button>
              </div>

              {/* Quick Questions or Actions */}
              {activeTab !== 'actions' ? (
                <div className="p-4 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">
                    {activeTab === 'pool' ? 'Pool Questions:' : activeTab === 'vault' ? 'Vault Questions:' : activeTab === 'futurefund' ? 'FutureFund Questions:' : 'General Questions:'}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {(activeTab === 'pool' ? poolQuestions : activeTab === 'vault' ? vaultQuestions : activeTab === 'futurefund' ? futureFundQuestions : generalQuestions).map((q, index) => (
                      <button
                        key={index}
                        onClick={() => handleQuickQuestion(q, activeTab === 'pool' || activeTab === 'vault' || activeTab === 'futurefund')}
                        disabled={isAsking}
                        className="px-3 py-1 text-xs bg-blue-50 text-blue-700 rounded-full hover:bg-blue-100 transition-colors disabled:opacity-50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="p-4 border-b border-gray-100">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">AI-Powered Creation:(Only Admin)</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setShowPoolCreator(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-blue-500 to-cyan-500 text-white rounded-lg hover:from-blue-600 hover:to-cyan-600 transition-all"
                    >
                      <Plus size={16} />
                      <span className="text-sm font-semibold">Create Pool</span>
                    </button>
                    <button
                      onClick={() => setShowVaultCreator(true)}
                      className="flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-lg hover:from-purple-600 hover:to-pink-600 transition-all"
                    >
                      <Plus size={16} />
                      <span className="text-sm font-semibold">Create Vault</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Response Area */}
              <div className="flex-1 p-4 overflow-y-auto space-y-4">
                {/* Pool Creator Form */}
                {showPoolCreator && (
                  <div className="bg-white rounded-lg p-4 border-2 border-blue-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Create New Pool</h3>
                      <button
                        onClick={() => setShowPoolCreator(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleCreatePool({
                        tokenContract: formData.get('tokenContract') as string,
                        riskProfile: parseInt(formData.get('riskProfile') as string),
                        rewardRate: formData.get('rewardRate') as string,
                        minStake: formData.get('minStake') as string,
                        maxStake: formData.get('maxStake') as string,
                        feePercent: formData.get('feePercent') as string,
                        lockDays: formData.get('lockDays') as string,
                      });
                    }} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Token Contract</label>
                        <input hidden
                          name="tokenContract"
                          type="text"
                          defaultValue="ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betavs"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Risk Profile</label>
                        <select name="riskProfile" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required>
                          <option value="1">Conservative (Low Risk)</option>
                          <option value="2">Moderate (Medium Risk)</option>
                          <option value="3">Aggressive (High Risk)</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">APY %</label>
                          <input name="rewardRate" type="number" step="0.01" defaultValue="10" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Fee %</label>
                          <input name="feePercent" type="number" step="0.01" defaultValue="5" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Min Stake (sBTC)</label>
                          <input name="minStake" type="number" step="0.01" defaultValue="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Max Stake (sBTC)</label>
                          <input name="maxStake" type="number" step="0.01" defaultValue="100" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Lock Period (days)</label>
                        <input name="lockDays" type="number" defaultValue="7" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                      </div>

                      <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full bg-gradient-to-r from-blue-500 to-cyan-500 text-white font-semibold py-3 rounded-lg hover:from-blue-600 hover:to-cyan-600 disabled:opacity-50"
                      >
                        {isCreating ? 'Creating...' : 'Create Pool'}
                      </button>
                    </form>
                  </div>
                )}

                {/* Vault Creator Form */}
                {showVaultCreator && (
                  <div className="bg-white rounded-lg p-4 border-2 border-purple-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-900">Create New Vault</h3>
                      <button
                        onClick={() => setShowVaultCreator(false)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        <X size={20} />
                      </button>
                    </div>

                    <form onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.currentTarget);
                      handleCreateVault({
                        name: formData.get('name') as string,
                        underlyingPoolId: parseInt(formData.get('underlyingPoolId') as string),
                        tokenContract: formData.get('tokenContract') as string,
                        minDeposit: formData.get('minDeposit') as string,
                        managementFee: formData.get('managementFee') as string,
                        performanceFee: formData.get('performanceFee') as string,
                        harvestReward: formData.get('harvestReward') as string,
                      });
                    }} className="space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Vault Name</label>
                        <input
                          name="name"
                          type="text"
                          defaultValue="BTC Yield Vault"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Underlying Pool</label>
                        <select
                          name="underlyingPoolId"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                        >
                          {availablePools.map(poolId => {
                            const riskNames = ['Conservative Pool', 'Moderate Pool', 'Aggressive Pool'];
                            const displayName = riskNames[poolId - 1];
                            return (
                              <option key={poolId} value={poolId}>
                                {displayName}
                              </option>
                            );
                          })}
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Token Contract</label>
                        <input hidden
                          name="tokenContract"
                          type="text"
                          defaultValue="ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betavs"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Min Deposit (sBTC)</label>
                        <input
                          name="minDeposit"
                          type="number"
                          step="0.01"
                          defaultValue="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Management Fee %</label>
                          <input name="managementFee" type="number" step="0.01" defaultValue="1" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-gray-700 mb-1">Performance Fee %</label>
                          <input name="performanceFee" type="number" step="0.01" defaultValue="2" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" required />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-gray-700 mb-1">Harvest Reward (sBTC)</label>
                        <input
                          name="harvestReward"
                          type="number"
                          step="0.01"
                          defaultValue="0.1"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                          required
                        />
                      </div>

                      <button
                        type="submit"
                        disabled={isCreating}
                        className="w-full bg-gradient-to-r from-purple-500 to-pink-500 text-white font-semibold py-3 rounded-lg hover:from-purple-600 hover:to-pink-600 disabled:opacity-50"
                      >
                        {isCreating ? 'Creating...' : 'Create Vault'}
                      </button>
                    </form>
                  </div>
                )}

                {response ? (
                  <>
                    {/* User Question */}
                    {askedQuestion && (
                      <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                        <div className="flex items-start gap-3">
                          <div className="p-2 bg-blue-500 rounded-lg flex-shrink-0">
                            <MessageCircle size={16} className="text-white" />
                          </div>
                          <div className="flex-1">
                            <p className="text-sm font-semibold text-blue-900 mb-1">Your Question:</p>
                            <p className="text-gray-800 text-sm leading-relaxed break-words">
                              {askedQuestion}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* AI Response */}
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-gradient-to-r from-purple-500 to-blue-500 rounded-lg flex-shrink-0">
                          <Bot size={16} className="text-white" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-purple-900 mb-2">AI Response:</p>
                          <p className="text-gray-800 text-sm leading-relaxed whitespace-pre-wrap break-words">
                            {response}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : !showPoolCreator && !showVaultCreator && (
                  <div className="text-center text-gray-500 py-8">
                    <MessageCircle size={48} className="mx-auto mb-4 text-gray-300" />
                    <p className="text-sm">
                      {activeTab === 'pool'
                        ? 'Ask a question for pool analysis or select a quick question'
                        : activeTab === 'vault'
                          ? 'Ask a question about vaults or select a quick question'
                          : activeTab === 'futurefund'
                            ? 'Ask about Retirement and Education Funds or select a quick question'
                            : activeTab === 'actions'
                              ? 'Click Create Pool or Create Vault to get started'
                              : 'Ask about Stacks and DeFi or select a quick question'
                      }
                    </p>
                  </div>
                )}
              </div>

              {/* Input Area */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !isAsking && askAI(undefined, activeTab === 'pool' || activeTab === 'vault')}
                    placeholder={activeTab === 'pool' ? 'Ask for pool recommendations...' : activeTab === 'vault' ? 'Ask about vaults...' : activeTab === 'futurefund' ? 'Ask about FutureFund...' : 'Ask about Stacks...'}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                    disabled={isAsking}
                  />
                  <button
                    onClick={() => askAI(undefined, activeTab === 'pool' || activeTab === 'vault' || activeTab === 'futurefund')}
                    disabled={isAsking || !question.trim()}
                    className="px-4 py-2 bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 text-white rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isAsking ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Send size={16} />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

