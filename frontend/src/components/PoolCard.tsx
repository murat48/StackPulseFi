'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Shield, Zap, Clock, DollarSign, Bot, Send } from 'lucide-react';
import { formatSBTC, formatPercentage, formatFee, RISK_PROFILE_NAMES, RISK_PROFILES, STACKS_API_URL, SCALING_FACTOR } from '@/lib/stacks/config';
import { stacksApi } from '@/lib/stacks/api';
import { getUserAddress } from '@/lib/stacks/wallet';

interface PoolData {
  'token-contract': string;
  'risk-profile': number;
  'reward-rate': number;
  'min-stake': number;
  'max-stake-per-user': number;
  'fee-percent': number;
  'deposit-lock-period': number;
  'total-staked': number;
  'total-rewards-distributed': number;
  active: boolean;
  'created-at': number;
}

interface UserStakeData {
  amount: number;
  'deposit-block': number;
  'last-reward-block': number;
  'reward-debt': number;
}

interface PoolCardProps {
  poolId: number;
  onDeposit: (poolId: number) => void;
  onWithdraw: (poolId: number) => void;
  onClaim: (poolId: number) => void;
  refreshKey?: number; // Add refresh key to trigger data reload
}

export default function PoolCard({ poolId, onDeposit, onWithdraw, onClaim, refreshKey = 0 }: PoolCardProps) {
  const [poolData, setPoolData] = useState<PoolData | null>(null);
  const [userStake, setUserStake] = useState<UserStakeData | null>(null);
  const [pendingRewards, setPendingRewards] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [currentBlock, setCurrentBlock] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState<Date>(new Date());

  // AI Chat states
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const userAddress = getUserAddress();

  // Ensure component is mounted before making API calls
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // AI Question function
  const askAI = async () => {
    if (!aiQuestion.trim() || !poolData) return;

    setIsAskingAI(true);
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://stackpulsefi-api-latest.onrender.com';
      const response = await fetch(`${apiUrl}/api/ai-question`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: aiQuestion,
          protocol: {
            name: `Pool ${poolId}`,
            type: 'staking',
            tvl: poolData['total-staked'] || 0,
            apy: (poolData['reward-rate'] || 0) / SCALING_FACTOR,
            token: 'sBTC',
            audit_status: 'audited',
            risk_analysis: {
              risk_score: poolData['risk-profile'] * 20, // Convert 1-5 to 0-100
              risk_category: RISK_PROFILE_NAMES[poolData['risk-profile'] as keyof typeof RISK_PROFILE_NAMES] || 'Unknown'
            }
          },
          context: 'pool-analysis'
        }),
      });

      const data = await response.json();
      if (data.success) {
        setAiResponse(data.response);
      } else {
        setAiResponse('Sorry, I could not process your question at the moment. Please try again.');
      }
    } catch (error) {
      console.error('Error asking AI:', error);
      setAiResponse('Sorry, there was an error connecting to the AI service. Please try again.');
    } finally {
      setIsAskingAI(false);
    }
  };

  useEffect(() => {
    // Only fetch data after component is mounted (client-side only)
    if (!isMounted) {
      return;
    }

    let isActive = true;

    const fetchPoolData = async () => {
      try {
        setLoading(true);

        // Fetch pool info with proper error handling
        const poolInfo = await stacksApi.getPoolInfo(poolId);

        if (!isActive) return;

        if (poolInfo && poolInfo !== null) {
          setPoolData(poolInfo);

          // Fetch user-specific data if wallet connected
          if (userAddress) {
            const [userInfo, rewards] = await Promise.allSettled([
              stacksApi.getUserStakeInfo(poolId, userAddress),
              stacksApi.getPendingRewards(poolId, userAddress)
            ]);

            if (!isActive) return;

            if (userInfo.status === 'fulfilled' && userInfo.value) {
              setUserStake(userInfo.value);
            } else {
              setUserStake(null);
            }

            if (rewards.status === 'fulfilled') {
              setPendingRewards(Number(rewards.value) || 0);
            } else {
              setPendingRewards(0);
            }
          }
        } else {
          setPoolData(null);
        }
      } catch (error) {
        if (isActive) {
          console.error(`Failed to load pool ${poolId}:`, error instanceof Error ? error.message : 'Unknown error');
          setPoolData(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchPoolData();

    return () => {
      isActive = false;
    };
  }, [poolId, userAddress, refreshKey, isMounted]);

  // Fetch current Stacks block height for lock calculations
  useEffect(() => {
    let aborted = false;
    const fetchHeight = async () => {
      try {
        const res = await fetch(`${STACKS_API_URL}/v2/info`);
        const data = await res.json();
        if (!aborted) {
          setCurrentBlock(Number(data?.stacks_tip_height) || null);
        }
      } catch (e) {
        console.warn('Failed to fetch current block height', e);
      }
    };
    fetchHeight();
    const id = setInterval(fetchHeight, 30_000);
    return () => {
      aborted = true;
      clearInterval(id);
    };
  }, []);

  // Update current time every minute for countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  if (loading) {
    return (
      <div className="card p-8 animate-pulse">
        <div className="h-8 skeleton rounded-lg mb-6"></div>
        <div className="space-y-4">
          <div className="h-4 skeleton rounded"></div>
          <div className="h-4 skeleton rounded w-3/4"></div>
          <div className="h-4 skeleton rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  if (!poolData) {
    return (
      <div className="card p-8">
        <div className="text-center py-8">
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 inline-block">
            <TrendingUp className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-2">Pool #{poolId} Not Available</p>
            <p className="text-sm text-gray-600">
              This pool may not be deployed yet or the contract is not accessible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const getRiskIcon = (riskProfile: number) => {
    switch (riskProfile) {
      case RISK_PROFILES.CONSERVATIVE:
        return <Shield className="text-green-600" size={20} />;
      case RISK_PROFILES.MODERATE:
        return <TrendingUp className="text-yellow-600" size={20} />;
      case RISK_PROFILES.AGGRESSIVE:
        return <Zap className="text-red-600" size={20} />;
      default:
        return <Shield className="text-gray-600" size={20} />;
    }
  };

  const getRiskColor = (riskProfile: number) => {
    switch (riskProfile) {
      case RISK_PROFILES.CONSERVATIVE:
        return 'text-green-600 bg-green-50';
      case RISK_PROFILES.MODERATE:
        return 'text-yellow-600 bg-yellow-50';
      case RISK_PROFILES.AGGRESSIVE:
        return 'text-red-600 bg-red-50';
      default:
        return 'text-gray-600 bg-gray-50';
    }
  };

  const hasUserStake = userStake && userStake.amount > 0;
  const hasPendingRewards = pendingRewards > 0;
  const depositBlock = userStake?.['deposit-block'] ?? null;
  const lockBlocks = poolData?.['deposit-lock-period'] ?? 0;

  // Detect invalid stake from old network (simnet data migrated to testnet)
  // Only check if user actually has stake (amount > 0)
  const blockDifference = currentBlock != null && depositBlock != null
    ? currentBlock - depositBlock
    : 0;

  // More intelligent detection: Only flag as "old" if deposit block is extremely old
  // (like from simnet migration) - typically simnet blocks are much lower numbers
  // Testnet blocks are usually in the millions, so we check if deposit block is very low
  // TEMPORARILY DISABLED: Set to false to disable old stake detection
  const isOldStake = false; // hasUserStake && depositBlock != null && depositBlock < 200000;

  // Debug: Log stake details
  if (hasUserStake) {
    console.log(`Pool ${poolId} - Stake Amount: ${userStake!.amount}, Deposit Block: ${depositBlock}, Is Old: ${isOldStake}`);
  }

  const remainingBlocks = currentBlock != null && depositBlock != null && !isOldStake
    ? Math.max(0, depositBlock + lockBlocks - currentBlock)
    : null;

  const isUnlocked = !isOldStake && remainingBlocks != null && remainingBlocks === 0;
  const remainingDays = remainingBlocks != null ? Math.max(0, Math.round(remainingBlocks / 144)) : null; return (
    <div className="card p-8 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-blue-500/20 to-purple-500/20 group-hover:scale-110 transition-transform duration-300">
            {getRiskIcon(poolData['risk-profile'])}
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {RISK_PROFILE_NAMES[poolData['risk-profile'] as keyof typeof RISK_PROFILE_NAMES]} Pool
            </h3>
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold ${getRiskColor(poolData['risk-profile'])}`}>
              Pool #{poolId}
            </div>
          </div>
        </div>
        <div className={`px-4 py-2 rounded-full text-sm font-semibold ${(poolData.active as any) === true || (poolData.active as any) === '#t' || (poolData.active as any) === 1
          ? 'bg-green-100 text-green-800 border border-green-200'
          : 'bg-red-100 text-red-800 border border-red-200'
          }`}>
          {((poolData.active as any) === true || (poolData.active as any) === '#t' || (poolData.active as any) === 1) ? 'Active' : 'Paused'} (Debug: {JSON.stringify(poolData.active)})
        </div>
      </div>

      {/* Pool Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">APR</span>
          </div>
          <p className="text-2xl font-bold text-blue-900">
            {formatPercentage(poolData['reward-rate'])}
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">Total Staked</span>
          </div>
          <p className="text-xl font-bold text-green-900">
            {formatSBTC(poolData['total-staked'])} sBTC
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-orange-600" />
            <span className="text-sm font-semibold text-orange-700">Lock Period</span>
          </div>
          <p className="text-lg font-bold text-orange-900">
            {Math.floor(poolData['deposit-lock-period'] / 144)} days
          </p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <span className="text-sm font-semibold text-purple-700">Fee</span>
          </div>
          <p className="text-lg font-bold text-purple-900">
            {formatFee(poolData['fee-percent'])}
          </p>
        </div>
      </div>

      {/* User Position */}
      {userAddress && (
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            Your Position
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Staked Amount</p>
              <p className="text-xl font-bold text-gray-900">
                {hasUserStake ? formatSBTC(userStake!.amount) : '0.00'} sBTC
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Pending Rewards</p>
              <p className="text-xl font-bold text-green-600">
                {formatSBTC(pendingRewards)} sBTC
              </p>
            </div>

          </div>
        </div>
      )}

      {/* Action Buttons */}
      {userAddress && ((poolData.active as any) === true || (poolData.active as any) === '#t' || (poolData.active as any) === 1) && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => onDeposit(poolId)}
              className="btn-primary flex-1 py-3 px-6 text-base font-semibold"
            >
              Stake
            </button>

            {hasUserStake && (
              <>
                <button
                  onClick={() => onWithdraw(poolId)}
                  disabled={!isUnlocked && !isOldStake}
                  className={`flex-1 py-3 px-6 rounded-xl transition-all duration-300 font-semibold hover:scale-105 ${isOldStake
                    ? 'bg-orange-600 text-white hover:bg-orange-700 animate-pulse'
                    : isUnlocked
                      ? 'bg-gray-600 text-white hover:bg-gray-700'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                    }`}
                  title={isOldStake ? 'Click and check "Early unstake" to remove invalid stake' : ''}
                >
                  {isOldStake ? '⚠️ Unstake Early (Required)' : isUnlocked ? 'UnStake' : 'Withdraw (locked)'}
                </button>

                {hasPendingRewards && (
                  <button
                    onClick={() => {
                      // Optimistic update: immediately set pending rewards to 0
                      setPendingRewards(0);
                      onClaim(poolId);
                    }}
                    className="btn-secondary flex-1 py-3 px-6 text-base font-semibold"
                  >
                    Claim
                  </button>
                )}
              </>
            )}
          </div>

          {/* AI Advisor Button */}
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105"
          >
            <Bot size={18} />
            Ask AI About This Pool
          </button>
        </div>
      )}

      {!userAddress && (
        <div className="text-center py-6">
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-gray-600 font-medium">Connect your wallet to interact with this pool</p>
          </div>
        </div>
      )}

      {/* AI Chat Section */}
      {showAIChat && (
        <div className="mt-4 bg-white rounded-xl shadow-lg p-6 border-t-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">AI Pool Advisor</h3>
            <button
              onClick={() => setShowAIChat(false)}
              className="ml-auto text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4">
            {/* Question Input */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                Ask about Pool {poolId}:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="e.g., What are the risks of this pool? How much should I stake?"
                  className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  onKeyPress={(e) => e.key === 'Enter' && askAI()}
                />
                <button
                  onClick={askAI}
                  disabled={!aiQuestion.trim() || isAskingAI}
                  className="px-4 py-3 bg-purple-500 hover:bg-purple-600 disabled:bg-gray-300 text-white font-semibold rounded-lg flex items-center gap-2"
                >
                  {isAskingAI ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Asking...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Ask
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* AI Response */}
            {aiResponse && (
              <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4 text-purple-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-purple-900 mb-2">AI Response:</h4>
                    <p className="text-sm text-purple-800 leading-relaxed">{aiResponse}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Questions */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">Quick Questions:</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  "What are the risks of this pool?",
                  "How much should I stake?",
                  "When can I withdraw?",
                  "What's the expected return?"
                ].map((question, index) => (
                  <button
                    key={index}
                    onClick={() => setAiQuestion(question)}
                    className="text-left p-2 text-sm text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    {question}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
