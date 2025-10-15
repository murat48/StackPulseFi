'use client';

import { useState, useEffect } from 'react';
import { Vault, TrendingUp, Clock, DollarSign, Zap, Bot, Send } from 'lucide-react';
import { formatSBTC, formatFee, SCALING_FACTOR } from '@/lib/stacks/config';
import { stacksApi } from '@/lib/stacks/api';
import { getUserAddress } from '@/lib/stacks/wallet';

interface VaultData {
  name: string;
  'underlying-pool-id': number;
  'token-contract': string;
  'min-deposit': number;
  'management-fee': number;
  'performance-fee': number;
  'total-assets': number;
  'total-shares': number;
  'last-harvest': number;
  'harvest-reward': number;
  active: boolean;
  'created-at': number;
}

interface UserPositionData {
  shares: number;
  'last-deposit-block': number;
  'total-deposited': number;
  'total-withdrawn': number;
}

interface VaultPerformanceData {
  'total-harvests': number;
  'total-rewards-compounded': number;
  'highest-share-price': number;
  'total-fees-collected': number;
}

interface VaultCardProps {
  vaultId: number;
  onDeposit: (vaultId: number) => void;
  onWithdraw: (vaultId: number) => void;
  onHarvest: (vaultId: number) => void;
  refreshKey?: number;
}

export default function VaultCard({ vaultId, onDeposit, onWithdraw, onHarvest, refreshKey = 0 }: VaultCardProps) {
  const [vaultData, setVaultData] = useState<VaultData | null>(null);
  const [userPosition, setUserPosition] = useState<UserPositionData | null>(null);
  const [userBalance, setUserBalance] = useState<number>(0);
  const [sharePrice, setSharePrice] = useState<number>(SCALING_FACTOR);
  const [performance, setPerformance] = useState<VaultPerformanceData | null>(null);
  const [harvestReady, setHarvestReady] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);
  const [isMounted, setIsMounted] = useState(false);

  // AI Chat states
  const [showAIChat, setShowAIChat] = useState(false);
  const [aiQuestion, setAiQuestion] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAskingAI, setIsAskingAI] = useState(false);

  const userAddress = getUserAddress();

  // Ensure component is mounted before making API calls
  useEffect(() => {
    setIsMounted(true);
  }, []);

  // AI Question function
  const askAI = async () => {
    if (!aiQuestion.trim() || !vaultData) return;

    setIsAskingAI(true);
    try {
      const response = await fetch('https://stackpulsefi-api-latest.onrender.com/api/ai-question', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: aiQuestion,
          protocol: {
            name: vaultData.name || `Vault ${vaultId}`,
            type: 'auto-compound-vault',
            tvl: vaultData['total-assets'] || 0,
            apy: 0, // Vaults don't have fixed APY, they compound rewards
            token: 'sBTC',
            audit_status: 'audited',
            risk_analysis: {
              risk_score: 30, // Vaults are generally lower risk due to auto-compounding
              risk_category: 'Low Risk'
            }
          },
          context: 'vault-analysis'
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

    const fetchVaultData = async () => {
      try {
        setLoading(true);

        // Fetch vault info with proper error handling
        const vaultInfo = await stacksApi.getVaultInfo(vaultId);

        if (!isActive) return;

        if (vaultInfo && vaultInfo !== null) {
          setVaultData(vaultInfo);

          // Only fetch additional data if vault exists
          const [price, perfData, isReady] = await Promise.allSettled([
            stacksApi.getVaultSharePrice(vaultId),
            stacksApi.getVaultPerformance(vaultId),
            stacksApi.isHarvestReady(vaultId)
          ]);

          if (!isActive) return;

          if (price.status === 'fulfilled') {
            setSharePrice(Number(price.value) || SCALING_FACTOR);
          }

          if (perfData.status === 'fulfilled' && perfData.value) {
            setPerformance(perfData.value);
          }

          if (isReady.status === 'fulfilled') {
            setHarvestReady(Boolean(isReady.value));
          }

          // Fetch user position if wallet connected
          if (userAddress) {
            const [position, balance] = await Promise.allSettled([
              stacksApi.getUserVaultPosition(vaultId, userAddress),
              stacksApi.getUserVaultBalance(vaultId, userAddress)
            ]);

            if (!isActive) return;

            if (position.status === 'fulfilled' && position.value) {
              setUserPosition(position.value);
            }

            if (balance.status === 'fulfilled') {
              setUserBalance(Number(balance.value) || 0);
            }
          }
        } else {
          setVaultData(null);
        }
      } catch (error) {
        if (isActive) {
          console.error(`Failed to load vault ${vaultId}:`, error instanceof Error ? error.message : 'Unknown error');
          setVaultData(null);
        }
      } finally {
        if (isActive) {
          setLoading(false);
        }
      }
    };

    fetchVaultData();

    return () => {
      isActive = false;
    };
  }, [vaultId, userAddress, refreshKey, isMounted]);

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

  if (!vaultData) {
    return (
      <div className="card p-8">
        <div className="text-center py-8">
          <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-200 inline-block">
            <Vault className="w-12 h-12 text-yellow-600 mx-auto mb-3" />
            <p className="text-gray-700 font-semibold mb-2">Vault #{vaultId} Not Available</p>
            <p className="text-sm text-gray-600">
              This vault may not be deployed yet or the contract is not accessible.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const hasUserPosition = userPosition && userPosition.shares > 0;
  const currentSharePrice = sharePrice / SCALING_FACTOR;

  return (
    <div className="card p-8 group">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-full bg-gradient-to-br from-purple-500/20 to-pink-500/20 group-hover:scale-110 transition-transform duration-300">
            <Vault className="text-purple-600" size={24} />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900 mb-1">
              {vaultData.name}
            </h3>
            <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-purple-100 text-purple-800 border border-purple-200">
              Vault #{vaultId} • Pool #{vaultData['underlying-pool-id']}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {harvestReady && (
            <div className="px-3 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 border border-green-200 animate-pulse">
              Harvest Ready
            </div>
          )}
          <div className={`px-4 py-2 rounded-full text-sm font-semibold ${vaultData.active
            ? 'bg-green-100 text-green-800 border border-green-200'
            : 'bg-red-100 text-red-800 border border-red-200'
            }`}>
            {vaultData.active ? 'Active' : 'Paused'}
          </div>
        </div>
      </div>

      {/* Vault Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-xl p-4 border border-purple-200">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-purple-600" />
            <span className="text-sm font-semibold text-purple-700">Share Price</span>
          </div>
          <p className="text-2xl font-bold text-purple-900">
            {currentSharePrice.toFixed(4)} sBTC
          </p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-4 border border-green-200">
          <div className="flex items-center gap-2 mb-2">
            <DollarSign size={18} className="text-green-600" />
            <span className="text-sm font-semibold text-green-700">Total Assets</span>
          </div>
          <p className="text-xl font-bold text-green-900">
            {formatSBTC(vaultData['total-assets'])} sBTC
          </p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-xl p-4 border border-orange-200">
          <div className="flex items-center gap-2 mb-2">
            <Clock size={18} className="text-orange-600" />
            <span className="text-sm font-semibold text-orange-700">Management Fee</span>
          </div>
          <p className="text-lg font-bold text-orange-900">
            {formatFee(vaultData['management-fee'])} / year
          </p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-4 border border-blue-200">
          <div className="flex items-center gap-2 mb-2">
            <Zap size={18} className="text-blue-600" />
            <span className="text-sm font-semibold text-blue-700">Performance Fee</span>
          </div>
          <p className="text-lg font-bold text-blue-900">
            {formatFee(vaultData['performance-fee'])}
          </p>
        </div>
      </div>

      {/* Performance Stats */}
      {performance && (
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Performance
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Total Harvests</p>
              <p className="text-xl font-bold text-gray-900">
                {performance['total-harvests']}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Rewards Compounded</p>
              <p className="text-xl font-bold text-green-600">
                {formatSBTC(performance['total-rewards-compounded'])} sBTC
              </p>
            </div>
          </div>
        </div>
      )}

      {/* User Position */}
      {userAddress && (
        <div className="border-t border-gray-200 pt-6 mb-6">
          <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center gap-2">
            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
            Your Position
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Your Shares</p>
              <p className="text-xl font-bold text-gray-900">
                {hasUserPosition ? formatSBTC(userPosition!.shares) : '0.00'}
              </p>
            </div>
            <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4">
              <p className="text-sm font-medium text-gray-600 mb-1">Current Value</p>
              <p className="text-xl font-bold text-green-600">
                {formatSBTC(userBalance)} sBTC
              </p>
            </div>
          </div>

          {hasUserPosition && userPosition && (
            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Deposited</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatSBTC(userPosition['total-deposited'])} sBTC
                </p>
              </div>
              <div className="bg-gradient-to-r from-orange-50 to-orange-100 rounded-lg p-4">
                <p className="text-sm font-medium text-gray-600 mb-1">Total Withdrawn</p>
                <p className="text-lg font-bold text-orange-900">
                  {formatSBTC(userPosition['total-withdrawn'])} sBTC
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Action Buttons */}
      {userAddress && vaultData.active && (
        <div className="space-y-3">
          <div className="flex gap-3">
            <button
              onClick={() => onDeposit(vaultId)}
              className="btn-secondary flex-1 py-3 px-6 text-base font-semibold"
            >
              Deposit
            </button>

            {hasUserPosition && (
              <button
                onClick={() => onWithdraw(vaultId)}
                className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-xl hover:bg-gray-700 transition-all duration-300 font-semibold hover:scale-105"
              >
                Withdraw
              </button>
            )}

            {harvestReady && (
              <button
                onClick={() => onHarvest(vaultId)}
                className="btn-primary flex-1 py-3 px-6 text-base font-semibold flex items-center justify-center gap-2 animate-glow"
              >
                <Zap size={18} />
                Harvest
              </button>
            )}
          </div>

          {/* AI Advisor Button */}
          <button
            onClick={() => setShowAIChat(!showAIChat)}
            className="w-full bg-purple-500 hover:bg-purple-600 text-white font-semibold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all duration-300 hover:scale-105"
          >
            <Bot size={18} />
            Ask AI About This Vault
          </button>
        </div>
      )}

      {!userAddress && (
        <div className="text-center py-6">
          <div className="bg-gray-100 rounded-xl p-4">
            <p className="text-gray-600 font-medium">Connect your wallet to interact with this vault</p>
          </div>
        </div>
      )}

      {/* Min Deposit Info */}
      <div className="mt-6 text-center">
        <div className="bg-purple-50 rounded-lg p-3 border border-purple-200">
          <p className="text-sm text-purple-700 font-medium">
            Minimum deposit: {formatSBTC(vaultData['min-deposit'])} sBTC
          </p>
        </div>
      </div>

      {/* AI Chat Section */}
      {showAIChat && (
        <div className="mt-4 bg-white rounded-xl shadow-lg p-6 border-t-2 border-purple-200">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
              <Bot className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-lg font-bold text-gray-900">AI Vault Advisor</h3>
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
                Ask about {vaultData.name || `Vault ${vaultId}`}:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aiQuestion}
                  onChange={(e) => setAiQuestion(e.target.value)}
                  placeholder="e.g., How does auto-compounding work? What are the fees?"
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
                  "How does auto-compounding work?",
                  "What are the management fees?",
                  "When should I harvest?",
                  "Is this vault safe?"
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
