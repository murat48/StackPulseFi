'use client';

import { useState } from 'react';
import {
  Settings,
  Plus,
  DollarSign,
  Shield,
  Vault,
  Gift,
  Coins,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  CheckCircle,
  Clock
} from 'lucide-react';
import {
  createStakingPool,
  createVault,
  setRewardToken,
  fundRewards,
  setPoolRewardRate,
  mintSBTC,
  getUserAddress
} from '@/lib/stacks/wallet';
import { parseSBTC } from '@/lib/stacks/config';
import { FinishedTxData } from '@stacks/connect';

interface AdminPanelProps {
  isAdmin: boolean;
  onDataChange?: () => void;
}

export default function AdminPanel({ isAdmin, onDataChange }: AdminPanelProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [activeTab, setActiveTab] = useState<'pools' | 'vaults' | 'tokens'>('pools');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

  const userAddress = getUserAddress();

  // Pool creation form state
  const [poolForm, setPoolForm] = useState({
    riskProfile: 1,
    rewardRate: '5',
    minStake: '0.01',
    maxStake: '100',
    feePercent: '0.1',
    lockPeriod: '144',
    lockPeriodDays: '1'
  });

  // Vault creation form state
  const [vaultForm, setVaultForm] = useState({
    name: '',
    underlyingPoolId: 1,
    minDeposit: '0.1',
    managementFee: '1',
    performanceFee: '10',
    harvestReward: '0.001'
  });

  // Rewards form state
  const [rewardsForm, setRewardsForm] = useState({
    fundAmount: '1000',
    poolId: 1,
    rewardRate: '5',
    allocationWeight: 40
  });

  // Token mint form state
  const [mintForm, setMintForm] = useState({
    amount: '100',
    recipient: userAddress || ''
  });



  if (!isAdmin) {
    return null;
  }

  const showMessage = (type: 'success' | 'error', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleTransaction = async (
    transactionFn: () => Promise<void>,
    successMessage: string
  ) => {
    setIsLoading(true);
    try {
      await transactionFn();
      showMessage('success', successMessage);
    } catch (error) {
      console.error('Transaction error:', error);
      showMessage('error', `Transaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreatePool = async () => {
    const tokenContract = process.env.NEXT_PUBLIC_SBTC_TOKEN_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betav2';

    const riskProfileName = poolForm.riskProfile === 1 ? 'Conservative' : poolForm.riskProfile === 2 ? 'Moderate' : 'Aggressive';

    await handleTransaction(
      () => createStakingPool(
        tokenContract,
        poolForm.riskProfile,
        BigInt(Math.floor(parseFloat(poolForm.rewardRate) * 1e8)), // 8 decimal scaling
        BigInt(parseSBTC(poolForm.minStake)),
        BigInt(parseSBTC(poolForm.maxStake)),
        BigInt(Math.floor(parseFloat(poolForm.feePercent) * 1e4)), // Fee scale 1e6 -> 1e4 for percentage
        BigInt(parseInt(poolForm.lockPeriod)),
        (data: FinishedTxData) => {
          console.log('Pool created:', data.txId);
          // Trigger data refresh
          if (onDataChange) {
            setTimeout(() => onDataChange(), 2000);
            setTimeout(() => onDataChange(), 5000);
            setTimeout(() => onDataChange(), 10000);
          }
        }
      ),
      `🎉 Staking Pool Created! ${riskProfileName} profile with ${poolForm.rewardRate}% APY and ${poolForm.lockPeriodDays} day lock period. Pool data will refresh shortly.`
    );
  };

  const handleCreateVault = async () => {
    const tokenContract = process.env.NEXT_PUBLIC_SBTC_TOKEN_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betav2';

    await handleTransaction(
      () => createVault(
        vaultForm.name,
        vaultForm.underlyingPoolId,
        tokenContract,
        BigInt(parseSBTC(vaultForm.minDeposit)),
        BigInt(Math.floor(parseFloat(vaultForm.managementFee) * 1e4)), // 1% = 10000
        BigInt(Math.floor(parseFloat(vaultForm.performanceFee) * 1e4)), // 10% = 100000
        BigInt(parseSBTC(vaultForm.harvestReward)),
        (data: FinishedTxData) => {
          console.log('Vault created:', data.txId);
          // Trigger data refresh
          if (onDataChange) {
            setTimeout(() => onDataChange(), 2000);
            setTimeout(() => onDataChange(), 5000);
            setTimeout(() => onDataChange(), 10000);
          }
        }
      ),
      `🎉 Auto-Compound Vault Created! "${vaultForm.name}" linked to Pool #${vaultForm.underlyingPoolId}. Management fee: ${vaultForm.managementFee}%, Performance fee: ${vaultForm.performanceFee}%. Vault data will refresh shortly.`
    );
  };

  const handleSetupRewards = async () => {
    const tokenContract = process.env.NEXT_PUBLIC_SBTC_TOKEN_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betav2';

    // Step 1: Set reward token
    await handleTransaction(
      () => setRewardToken(
        tokenContract,
        (data: FinishedTxData) => {
          console.log('Reward token set:', data.txId);
        }
      ),
      'Reward token configured successfully!'
    );
  };

  const handleFundRewards = async () => {
    await handleTransaction(
      () => fundRewards(
        BigInt(parseSBTC(rewardsForm.fundAmount)),
        (data: FinishedTxData) => {
          console.log('Rewards funded:', data.txId);
        }
      ),
      `${rewardsForm.fundAmount} sBTC added to reward pool!`
    );
  };

  const handleSetPoolRewards = async () => {
    await handleTransaction(
      () => setPoolRewardRate(
        rewardsForm.poolId,
        BigInt(Math.floor(parseFloat(rewardsForm.rewardRate) * 1e8)),
        rewardsForm.allocationWeight,
        (data: FinishedTxData) => {
          console.log('Pool reward rate set:', data.txId);
        }
      ),
      `Pool ${rewardsForm.poolId} reward rate set to ${rewardsForm.rewardRate}%`
    );
  };

  const handleMintTokens = async () => {
    await handleTransaction(
      () => mintSBTC(
        BigInt(parseSBTC(mintForm.amount)),
        mintForm.recipient,
        (data: FinishedTxData) => {
          console.log('Tokens minted:', data.txId);
        }
      ),
      `✅ Transaction successful! ${mintForm.amount} sBTC minted.`
    );
  };



  // Risk profile presets
  const riskProfiles = [
    {
      value: 1,
      name: 'Conservative',
      color: 'text-green-600',
      description: 'Low risk, stable returns',
      rewardRate: '5',
      lockPeriodDays: '1',
      lockPeriodBlocks: '144'
    },
    {
      value: 2,
      name: 'Moderate',
      color: 'text-yellow-600',
      description: 'Balanced risk/reward',
      rewardRate: '7',
      lockPeriodDays: '3',
      lockPeriodBlocks: '432'
    },
    {
      value: 3,
      name: 'Aggressive',
      color: 'text-red-600',
      description: 'High risk, high returns',
      rewardRate: '12',
      lockPeriodDays: '7',
      lockPeriodBlocks: '1008'
    }
  ];

  // Function to apply risk profile preset
  const applyRiskProfilePreset = (profileValue: number) => {
    const profile = riskProfiles.find(p => p.value === profileValue);
    if (profile) {
      setPoolForm(prev => ({
        ...prev,
        riskProfile: profileValue,
        rewardRate: profile.rewardRate,
        lockPeriodDays: profile.lockPeriodDays,
        lockPeriod: profile.lockPeriodBlocks
      }));
    }
  };

  return (
    <>
      {/* Floating Notification */}
      {message && (
        <div className="fixed top-4 right-4 z-[100] animate-slide-in">
          <div className={`flex items-center gap-3 px-6 py-4 rounded-xl shadow-2xl backdrop-blur-sm border-2 min-w-[300px] ${message.type === 'success'
            ? 'bg-green-500/95 border-green-400 text-white'
            : 'bg-red-500/95 border-red-400 text-white'
            }`}>
            {message.type === 'success' ? (
              <CheckCircle className="w-6 h-6 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-6 h-6 flex-shrink-0" />
            )}
            <div className="flex-1">
              <div className="font-bold text-sm mb-1">
                {message.type === 'success' ? 'İşlem Başarılı' : 'Hata'}
              </div>
              <div className="text-sm opacity-95">{message.text}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mb-8 border border-orange-200 rounded-xl overflow-hidden bg-gradient-to-r from-orange-50 to-yellow-50">
        {/* Header */}
        <div
          className="p-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white cursor-pointer flex items-center justify-between"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-3">
            <Settings className="w-6 h-6" />
            <div>
              <h2 className="text-xl font-bold">Admin Panel</h2>
              <p className="text-orange-100 text-sm">Contract management & configuration</p>
            </div>
          </div>
          {isExpanded ? <ChevronUp className="w-6 h-6" /> : <ChevronDown className="w-6 h-6" />}
        </div>

        {/* Content */}
        {isExpanded && (
          <div className="p-6">
            {/* Tabs */}
            <div className="flex space-x-1 mb-6 bg-white rounded-lg p-1 border">
              {[
                { id: 'pools', label: 'Pools', icon: Shield },
                { id: 'vaults', label: 'Vaults', icon: Vault },
                { id: 'tokens', label: 'Tokens', icon: Coins }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex-1 flex items-center justify-center space-x-2 py-3 px-4 rounded-md transition-all ${activeTab === tab.id
                    ? 'bg-orange-500 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                    }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Pool Creation Tab */}
            {activeTab === 'pools' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Shield className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold">Create Staking Pool</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Risk Profile
                    </label>
                    <div className="space-y-3">
                      {riskProfiles.map((profile) => (
                        <div key={profile.value}>
                          <label className="flex items-start space-x-3 cursor-pointer p-3 rounded-lg border-2 transition-all hover:border-orange-300"
                            style={{
                              borderColor: poolForm.riskProfile === profile.value ? 'rgb(249 115 22)' : 'rgb(229 231 235)',
                              backgroundColor: poolForm.riskProfile === profile.value ? 'rgb(255 247 237)' : 'transparent'
                            }}
                          >
                            <input
                              type="radio"
                              name="riskProfile"
                              value={profile.value}
                              checked={poolForm.riskProfile === profile.value}
                              onChange={(e) => applyRiskProfilePreset(parseInt(e.target.value))}
                              className="mt-1 text-orange-500 focus:ring-orange-500"
                            />
                            <div className="flex-1">
                              <div className="flex items-center justify-between">
                                <span className={`font-semibold ${profile.color}`}>{profile.name}</span>
                                <span className="text-xs font-medium text-gray-500">
                                  {profile.rewardRate}% APY • {profile.lockPeriodDays}d Lock
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">{profile.description}</p>
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                    {poolForm.riskProfile && (
                      <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm text-blue-700">
                          <strong>✓ Auto-configured:</strong> {poolForm.rewardRate}% reward rate, {poolForm.lockPeriodDays} day lock period
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Reward Rate (% APY)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={poolForm.rewardRate}
                        onChange={(e) => setPoolForm(prev => ({ ...prev, rewardRate: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Min Stake (sBTC)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={poolForm.minStake}
                          onChange={(e) => setPoolForm(prev => ({ ...prev, minStake: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Max Stake (sBTC)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={poolForm.maxStake}
                          onChange={(e) => setPoolForm(prev => ({ ...prev, maxStake: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Fee (%)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={poolForm.feePercent}
                          onChange={(e) => setPoolForm(prev => ({ ...prev, feePercent: e.target.value }))}
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Lock Period
                        </label>
                        <div className="flex space-x-2">
                          <select
                            value={poolForm.lockPeriodDays}
                            onChange={(e) => {
                              const days = parseInt(e.target.value);
                              const blocks = days * 144; // 144 blocks per day (approx 10 min blocks)
                              setPoolForm(prev => ({
                                ...prev,
                                lockPeriodDays: days.toString(),
                                lockPeriod: blocks.toString()
                              }));
                            }}
                            className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                          >
                            <option value="1">1 Day</option>
                            <option value="3">3 Days</option>
                            <option value="7">7 Days</option>
                            <option value="14">14 Days</option>
                            <option value="30">30 Days</option>
                            <option value="60">60 Days</option>
                            <option value="90">90 Days</option>
                            <option value="180">180 Days</option>
                            <option value="365">1 Year</option>
                          </select>
                          <input
                            type="number"
                            value={poolForm.lockPeriod}
                            onChange={(e) => {
                              const blocks = parseInt(e.target.value || '0');
                              const days = Math.max(1, Math.round(blocks / 144));
                              setPoolForm(prev => ({
                                ...prev,
                                lockPeriod: e.target.value,
                                lockPeriodDays: days.toString()
                              }));
                            }}
                            placeholder="Blocks"
                            className="w-28 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm"
                          />
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {poolForm.lockPeriodDays} days ≈ {poolForm.lockPeriod} blocks
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreatePool}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>{isLoading ? 'Creating Pool...' : 'Create Staking Pool'}</span>
                </button>
              </div>
            )}

            {/* Vault Creation Tab */}
            {activeTab === 'vaults' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Vault className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold">Create Auto-Compounding Vault</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Vault Name
                      </label>
                      <input
                        type="text"
                        value={vaultForm.name}
                        onChange={(e) => setVaultForm(prev => ({ ...prev, name: e.target.value }))}
                        placeholder="e.g., Stable Yield Vault"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Underlying Pool ID
                      </label>
                      <select
                        value={vaultForm.underlyingPoolId}
                        onChange={(e) => setVaultForm(prev => ({ ...prev, underlyingPoolId: parseInt(e.target.value) }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      >
                        <option value={1}>Pool 1 - Conservative</option>
                        <option value={2}>Pool 2 - Moderate</option>
                        <option value={3}>Pool 3 - Aggressive</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Min Deposit (sBTC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={vaultForm.minDeposit}
                        onChange={(e) => setVaultForm(prev => ({ ...prev, minDeposit: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Management Fee (% annual)
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={vaultForm.managementFee}
                        onChange={(e) => setVaultForm(prev => ({ ...prev, managementFee: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Performance Fee (% of profits)
                      </label>
                      <input
                        type="number"
                        step="1"
                        value={vaultForm.performanceFee}
                        onChange={(e) => setVaultForm(prev => ({ ...prev, performanceFee: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Harvest Reward (sBTC)
                      </label>
                      <input
                        type="number"
                        step="0.001"
                        value={vaultForm.harvestReward}
                        onChange={(e) => setVaultForm(prev => ({ ...prev, harvestReward: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleCreateVault}
                  disabled={isLoading || !vaultForm.name}
                  className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Vault className="w-5 h-5" />
                  <span>{isLoading ? 'Creating Vault...' : 'Create Vault'}</span>
                </button>
              </div>
            )}


            {/* Tokens Tab */}
            {activeTab === 'tokens' && (
              <div className="space-y-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Coins className="w-6 h-6 text-orange-500" />
                  <h3 className="text-lg font-semibold">Token Management</h3>
                </div>

                <div className="max-w-md mx-auto border border-gray-200 rounded-lg p-6">
                  <h4 className="font-semibold mb-4">Mint sBTC Tokens</h4>
                  <p className="text-sm text-gray-600 mb-4">
                    Mint sBTC tokens for testing purposes. Only contract owner can mint.
                  </p>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Amount (sBTC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={mintForm.amount}
                        onChange={(e) => setMintForm(prev => ({ ...prev, amount: e.target.value }))}
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Recipient Address
                      </label>
                      <input
                        type="text"
                        value={mintForm.recipient}
                        onChange={(e) => setMintForm(prev => ({ ...prev, recipient: e.target.value }))}
                        placeholder="ST1HTBVD3JG9C05J7HBJTHGR0GGW7KXW28M5JS8QE"
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>

                    <button
                      onClick={handleMintTokens}
                      disabled={isLoading || !mintForm.recipient}
                      className="w-full bg-gradient-to-r from-orange-500 to-yellow-500 text-white py-3 px-6 rounded-lg font-semibold hover:from-orange-600 hover:to-yellow-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                    >
                      <DollarSign className="w-5 h-5" />
                      <span>{isLoading ? 'Minting...' : 'Mint Tokens'}</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}