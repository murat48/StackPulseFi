'use client';

import { useState, useEffect } from 'react';
import { TrendingUp, Shield, Vault, DollarSign, Zap, Sparkles, Clock, Users, Coins } from 'lucide-react';
import Link from 'next/link';
import WalletConnect from '@/components/WalletConnect';
import PoolCard from '@/components/PoolCard';
import VaultCard from '@/components/VaultCard';
import FutureFundCard from '@/components/FutureFundCard';
import TransactionModal from '@/components/TransactionModal';
import AdminPanel from '@/components/AdminPanel';
import GlobalAIChat from '@/components/GlobalAIChat';
import CreateFundModal from '@/components/CreateFundModal';
import { formatSBTC, parseSBTC } from '@/lib/stacks/config';
import { stacksApi } from '@/lib/stacks/api';
import {
  stakeToPool,
  unstakeFromPool,
  unstakeEarlyFromPool,
  claimRewards,
  depositToVault,
  withdrawFromVault,
  harvestVault,
  contributeToRetirementFund,
  withdrawFromRetirementFund,
  withdrawEarlyFromRetirementFund,
  contributeToEducationFund,
  withdrawEarlyFromEducationFund,
  guardianWithdrawEducationFund,
  getUserAddress,
  testMintSBTC
} from '@/lib/stacks/wallet';
import { FinishedTxData } from '@stacks/connect';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: number | null;
  type: 'pool' | 'vault' | 'retirement' | 'education';
  onSubmit: (amount: string) => void;
}

function DepositModal({ isOpen, onClose, poolId, type, onSubmit }: DepositModalProps) {
  const [amount, setAmount] = useState('');
  const [balance, setBalance] = useState('0');

  const userAddress = getUserAddress();

  useEffect(() => {
    const fetchBalance = async () => {
      if (userAddress) {
        try {
          const bal = await stacksApi.getSBTCBalance(userAddress);
          setBalance(formatSBTC(Number(bal)));
        } catch (error) {
          console.error('Error fetching balance:', error);
        }
      }
    };

    if (isOpen && userAddress) {
      fetchBalance();
    }
  }, [isOpen, userAddress]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (amount && parseFloat(amount) > 0) {
      onSubmit(amount);
      setAmount('');
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full p-4 sm:p-6 md:p-8 animate-fade-in">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 bg-blue-100 rounded-lg">
            <DollarSign className="text-blue-600" size={18} />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
            {type === 'pool' ? 'Stake to Pool' :
              type === 'vault' ? 'Deposit to Vault' :
                type === 'retirement' ? 'Contribute to Retirement Fund' :
                  'Contribute to Education Fund'} #{poolId}
          </h2>
          {type === 'pool' && (
            <p className="text-xs text-yellow-700 mt-2 bg-yellow-50 px-3 py-2 rounded-lg border border-yellow-200">
              ⚠️ Note: Adding more stake will restart your lock period!
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-4 sm:mb-6">
            <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
              Amount (sBTC)
            </label>
            <input
              type="number"
              step="0.00000001"
              min="0"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="input w-full text-base"
              placeholder="0.00000000"
              required
            />
            <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs sm:text-sm text-blue-700 font-medium">
                Available balance: {balance} sBTC
              </p>
            </div>
          </div>

          <div className="flex gap-2 sm:gap-3 md:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex-1 py-2 sm:py-2.5 md:py-3 px-3 sm:px-4 md:px-6 text-sm sm:text-base font-semibold"
            >
              {type === 'pool' ? 'Stake' :
                type === 'vault' ? 'Deposit' :
                  type === 'retirement' ? 'Contribute' :
                    'Contribute'} #{poolId}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  poolId: number | null;
  type: 'pool' | 'vault' | 'retirement' | 'education';
  maxAmount: string;
  isEarly?: boolean;
  onSubmit: (amount: string, isEarly?: boolean) => void;
}

function WithdrawModal({ isOpen, onClose, poolId, type, maxAmount, isEarly, onSubmit }: WithdrawModalProps) {
  const [amount, setAmount] = useState('');
  const [isEarlyWithdraw, setIsEarlyWithdraw] = useState(isEarly || false);

  // Update isEarlyWithdraw when isEarly prop changes
  useEffect(() => {
    setIsEarlyWithdraw(isEarly || false);
  }, [isEarly]);

  // For pools, set amount to maxAmount since full withdrawal is mandatory
  useEffect(() => {
    if (type === 'pool') {
      setAmount(maxAmount);
    }
  }, [type, maxAmount]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const submitAmount = type === 'pool' ? maxAmount : amount; // Always use maxAmount for pools
    if (submitAmount && parseFloat(submitAmount) > 0) {
      onSubmit(submitAmount, isEarlyWithdraw);
      setAmount('');
      setIsEarlyWithdraw(false);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full p-4 sm:p-6 md:p-8 animate-fade-in">
        <div className="flex items-center gap-2 sm:gap-3 mb-4 sm:mb-6">
          <div className="p-1.5 sm:p-2 bg-red-100 rounded-lg">
            <DollarSign className="text-red-600" size={18} />
          </div>
          <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900">
            {type === 'pool' ? 'UnStake from Pool' :
              type === 'vault' ? 'Withdraw from Vault' :
                type === 'retirement' ? 'Withdraw from Retirement Fund' :
                  'Withdraw from Education Fund'} #{poolId}
          </h2>
        </div>

        <form onSubmit={handleSubmit}>
          {type === 'pool' && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
              <p className="text-sm font-semibold text-blue-900 mb-2">⚠️ Full Unstake Required</p>
              <p className="text-sm text-blue-700">
                You must unstake your entire balance. Partial unstaking is not allowed.
              </p>
              <p className="text-lg font-bold text-blue-900 mt-3">
                Amount to unstake: {maxAmount} sBTC
              </p>
            </div>
          )}

          {type !== 'pool' && (
            <div className="mb-4 sm:mb-6">
              <label className="block text-xs sm:text-sm font-semibold text-gray-700 mb-2 sm:mb-3">
                Amount ({type === 'vault' ? 'Shares' : 'sBTC'})
              </label>
              <input
                type="number"
                step="0.00000001"
                min="0"
                max={maxAmount}
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="input w-full text-base"
                placeholder="0.00000000"
                required
              />
              <div className="mt-2 sm:mt-3 p-2 sm:p-3 bg-orange-50 rounded-lg border border-orange-200">
                <p className="text-xs sm:text-sm text-orange-700 font-medium">
                  Maximum: {maxAmount} {type === 'vault' ? 'shares' : 'sBTC'}
                </p>
              </div>
            </div>
          )}

          {(type === 'pool' || type === 'retirement' || type === 'education') && (
            <div className="mb-4 sm:mb-6">
              <div className="p-3 sm:p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <label className="flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isEarlyWithdraw}
                    onChange={(e) => setIsEarlyWithdraw(e.target.checked)}
                    className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                  />
                  <span className="ml-2 sm:ml-3 text-xs sm:text-sm font-medium text-yellow-800">
                    {type === 'pool'
                      ? 'Early Transaction (penalty applies)'
                      : 'Transaction before unlock (20% fee applies)'}
                  </span>
                </label>
                {(type === 'retirement' || type === 'education') && (
                  <p className="mt-2 text-xs text-yellow-700">
                    💡 Early UnStaking incurs a 20% penalty. Wait until unlock for fee-free UnStaking.
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-2 sm:gap-3 md:gap-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base text-gray-700 bg-gray-100 rounded-lg sm:rounded-xl hover:bg-gray-200 transition-all duration-300 font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-3 py-2 sm:px-4 sm:py-2.5 md:px-6 md:py-3 text-sm sm:text-base bg-red-600 text-white rounded-lg sm:rounded-xl hover:bg-red-700 transition-all duration-300 font-semibold hover:scale-105"
            >
              {type === 'pool' ? 'UnStake' :
                type === 'vault' ? 'Withdraw' :
                  type === 'retirement' ? 'Withdraw Retirement Fund' :
                    'Withdraw Education Fund'} #{poolId}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<'pools' | 'vaults' | 'future-funds'>('pools');
  const [poolCount, setPoolCount] = useState(0);
  const [vaultCount, setVaultCount] = useState(0);
  const [futureFundCount, setFutureFundCount] = useState(0);
  const [userRetirementFunds, setUserRetirementFunds] = useState<any[]>([]);
  const [userEducationFunds, setUserEducationFunds] = useState<any[]>([]);
  const [totalSupply, setTotalSupply] = useState('0');
  const [isClient, setIsClient] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Add refresh key for pool data

  // Modal states
  const [depositModal, setDepositModal] = useState({ isOpen: false, poolId: null as number | null, type: 'pool' as 'pool' | 'vault' | 'retirement' | 'education' });
  const [withdrawModal, setWithdrawModal] = useState({ isOpen: false, poolId: null as number | null, type: 'pool' as 'pool' | 'vault' | 'retirement' | 'education', maxAmount: '0', isEarly: false });
  const [transactionModal, setTransactionModal] = useState({ isOpen: false, txId: '', title: '', description: '' });
  const [createFundModal, setCreateFundModal] = useState({ isOpen: false, fundType: 'retirement' as 'retirement' | 'education' });

  const userAddress = getUserAddress();

  // Admin check - contract deployer address
  const CONTRACT_DEPLOYER = 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5';
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (isClient && userAddress) {
      setIsAdmin(userAddress === CONTRACT_DEPLOYER);
    } else {
      setIsAdmin(false);
    }
  }, [isClient, userAddress]);

  // Fetch pool and vault data
  const fetchData = async () => {
    if (!isClient) return;

    try {
      // Fetch pool and vault counts (with fallback)
      try {
        const pools = await stacksApi.getPoolCount();
        setPoolCount(Number(pools));
      } catch (error) {
        console.warn('Pool count not available:', error instanceof Error ? error.message : 'Unknown error');
        setPoolCount(0);
      }

      try {
        const vaults = await stacksApi.getVaultCount();
        setVaultCount(Number(vaults));
      } catch (error) {
        console.warn('Vault count not available (contracts may not be deployed):', error);
        setVaultCount(0);
      }

      // Fetch user's FutureFunds (only if logged in)
      if (userAddress) {
        console.log('[Page] Fetching FutureFunds for user:', userAddress);
        try {
          const retirementFunds = await stacksApi.getUserRetirementFunds(userAddress);
          console.log('[Page] Retirement funds received:', retirementFunds);
          setUserRetirementFunds(retirementFunds);

          const educationFunds = await stacksApi.getCreatorEducationFunds(userAddress);
          console.log('[Page] Education funds received:', educationFunds);
          setUserEducationFunds(educationFunds);

          // Calculate total FutureFund count
          setFutureFundCount(retirementFunds.length + educationFunds.length);
        } catch (error) {
          console.warn('Error fetching user funds:', error);
          setUserRetirementFunds([]);
          setUserEducationFunds([]);
          setFutureFundCount(0);
        }
      } else {
        console.log('[Page] No user address, clearing FutureFunds');
        setUserRetirementFunds([]);
        setUserEducationFunds([]);
        setFutureFundCount(0);
      }

      // Fetch total supply (with fallback)
      try {
        const supply = await stacksApi.getSBTCTotalSupply();
        setTotalSupply(formatSBTC(Number(supply)));
      } catch (error) {
        console.warn('Total supply not available (contracts may not be deployed):', error);
        setTotalSupply('0.00');
      }

    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, [userAddress, isClient]);

  const handlePoolDeposit = (poolId: number) => {
    setDepositModal({ isOpen: true, poolId, type: 'pool' });
  };

  const handlePoolWithdraw = async (poolId: number) => {
    if (!userAddress) return;

    try {
      const userInfo = await stacksApi.getUserStakeInfo(poolId, userAddress);
      if (userInfo && userInfo.amount) {
        setWithdrawModal({
          isOpen: true,
          poolId,
          type: 'pool',
          maxAmount: formatSBTC(Number(userInfo.amount)),
          isEarly: false
        });
      }
    } catch (error) {
      console.error('Error fetching user stake:', error);
    }
  };

  const handlePoolClaim = async (poolId: number) => {
    await claimRewards(
      process.env.NEXT_PUBLIC_STAKING_POOL_CONTRACT!,
      poolId,
      (data) => {
        setTransactionModal({
          isOpen: true,
          txId: data.txId,
          title: 'Claim Rewards',
          description: 'Your reward claim transaction has been submitted.'
        });
        // Immediately refresh pool data to show updated rewards
        setRefreshKey(prev => prev + 1);
        // Refresh again after transaction is likely confirmed
        setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
        setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
      }
    );
  };

  const handleTestMint = async () => {
    // Mint 1,000 sBTC (1000 * 100000000 = 100000000000)
    const mintAmount = parseSBTC('1000');

    await testMintSBTC(
      mintAmount,
      (data) => {
        setTransactionModal({
          isOpen: true,
          txId: data.txId,
          title: 'Test Mint sBTC',
          description: '1,000 sBTC test tokens have been minted to your wallet. This is for testing purposes only.'
        });
        // Refresh data after mint
        setTimeout(() => fetchData(), 3000);
        setTimeout(() => fetchData(), 8000);
      }
    );
  };

  const handleVaultDeposit = (vaultId: number) => {
    setDepositModal({ isOpen: true, poolId: vaultId, type: 'vault' });
  };

  const handleVaultWithdraw = async (vaultId: number) => {
    if (!userAddress) return;

    try {
      const position = await stacksApi.getUserVaultPosition(vaultId, userAddress);
      if (position && position.shares) {
        setWithdrawModal({
          isOpen: true,
          poolId: vaultId,
          type: 'vault',
          maxAmount: formatSBTC(Number(position.shares)),
          isEarly: false
        });
      }
    } catch (error) {
      console.error('Error fetching vault position:', error);
    }
  };

  const handleVaultHarvest = async (vaultId: number) => {
    await harvestVault(
      process.env.NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT!,
      vaultId,
      (data) => {
        setTransactionModal({
          isOpen: true,
          txId: data.txId,
          title: 'Harvest Vault',
          description: 'Your harvest transaction has been submitted. Vault data will refresh shortly.'
        });
        // Refresh vault data after harvest
        setRefreshKey(prev => prev + 1);
        setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
        setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
      }
    );
  };

  const handleFutureFundContribute = (fundId: number, fundType: 'retirement' | 'education') => {
    setDepositModal({ isOpen: true, poolId: fundId, type: fundType });
  };

  const handleFutureFundWithdraw = async (fundId: number, fundType: 'retirement' | 'education') => {
    if (!userAddress) return;

    try {
      let fundInfo;
      if (fundType === 'retirement') {
        fundInfo = await stacksApi.getRetirementFundInfo(fundId);
      } else {
        fundInfo = await stacksApi.getEducationFundInfo(fundId);
      }

      if (fundInfo && fundInfo.balance) {
        // Check if fund is unlocked
        const currentHeight = await stacksApi.getCurrentBlockHeight();
        const unlockHeight = fundInfo['unlock-height'] || 0;
        const isUnlocked = currentHeight >= unlockHeight;

        setWithdrawModal({
          isOpen: true,
          poolId: fundId,
          type: fundType,
          maxAmount: formatSBTC(Number(fundInfo.balance)),
          isEarly: !isUnlocked // If not unlocked, it's early withdrawal
        });
      }
    } catch (error) {
      console.error('Error fetching fund info:', error);
    }
  };

  const handleDepositSubmit = async (amount: string) => {
    const amountBigInt = parseSBTC(amount);

    if (depositModal.type === 'pool') {
      await stakeToPool(
        process.env.NEXT_PUBLIC_STAKING_POOL_CONTRACT!,
        depositModal.poolId!,
        amountBigInt,
        (data) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: 'Stake to Pool',
            description: `Your stake of ${amount} sBTC has been submitted. Note: Lock period will restart if you have existing stake.`
          });
          // Aggressive refresh to ensure new deposit-block is loaded
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 15000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 25000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 40000);
        }
      );
    } else if (depositModal.type === 'vault') {
      await depositToVault(
        process.env.NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT!,
        depositModal.poolId!,
        amountBigInt,
        (data) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: 'Vault Deposit',
            description: `Your deposit of ${amount} sBTC has been submitted. Vault data will refresh shortly.`
          });
          // Refresh vault data after deposit
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
        }
      );
    } else if (depositModal.type === 'retirement') {
      await contributeToRetirementFund(
        depositModal.poolId!,
        amountBigInt,
        (data) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: 'Retirement Fund Contribution',
            description: `Your contribution of ${amount} STX has been submitted.`
          });
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
        }
      );
    } else if (depositModal.type === 'education') {
      await contributeToEducationFund(
        depositModal.poolId!,
        amountBigInt,
        (data) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: 'Education Fund Contribution',
            description: `Your contribution of ${amount} STX has been submitted.`
          });
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
        }
      );
    }
  };

  const handleWithdrawSubmit = async (amount: string, isEarly?: boolean) => {
    const amountBigInt = parseSBTC(amount);

    if (withdrawModal.type === 'pool') {
      console.log('🔥 DEBUG: Unstake started', { poolId: withdrawModal.poolId, isEarly, amount });
      const unstakeFn = isEarly ? unstakeEarlyFromPool : unstakeFromPool;
      // Note: Pool unstake is always full amount - amount parameter not used for pools
      await unstakeFn(
        process.env.NEXT_PUBLIC_STAKING_POOL_CONTRACT!,
        withdrawModal.poolId!,
        (data) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: isEarly ? 'Early Unstake (20% Penalty)' : 'Unstake from Pool',
            description: isEarly
              ? `Your entire stake has been unstaked with 20% penalty. You received ${(parseFloat(amount) * 0.8).toFixed(8)} sBTC.`
              : `Your entire stake of ${amount} sBTC plus rewards has been returned.`
          });
          // Refresh pool data after withdrawal
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
        }
      );
    } else if (withdrawModal.type === 'vault') {
      await withdrawFromVault(
        process.env.NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT!,
        withdrawModal.poolId!,
        amountBigInt,
        (data) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: 'Vault Withdrawal',
            description: `Your withdrawal of ${amount} shares has been submitted. Vault data will refresh shortly.`
          });
          // Refresh vault data after withdrawal
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
        }
      );
    } else if (withdrawModal.type === 'retirement') {
      // Use early withdraw if specified, otherwise regular withdraw (after unlock)
      const withdrawFn = isEarly ? withdrawEarlyFromRetirementFund : withdrawFromRetirementFund;
      await withdrawFn(
        withdrawModal.poolId!,
        amountBigInt,
        (data) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: isEarly ? 'Early Retirement Fund Withdrawal' : 'Retirement Fund Withdrawal',
            description: `Your withdrawal of ${amount} sBTC has been submitted. ${isEarly ? 'Early withdrawal fee applied.' : ''}`
          });
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
        }
      );
    } else if (withdrawModal.type === 'education') {
      // Use early withdraw if specified (creator or guardian can withdraw early with fee)
      // Otherwise use guardian withdraw (only guardian, after unlock, no fee)
      const withdrawFn = isEarly ? withdrawEarlyFromEducationFund : guardianWithdrawEducationFund;
      await withdrawFn(
        withdrawModal.poolId!,
        amountBigInt,
        (data: FinishedTxData) => {
          setTransactionModal({
            isOpen: true,
            txId: data.txId,
            title: isEarly ? 'Early Education Fund Withdrawal' : 'Education Fund Withdrawal',
            description: `Your withdrawal of ${amount} sBTC has been submitted. ${isEarly ? 'Early withdrawal fee applied.' : ''}`
          });
          setRefreshKey(prev => prev + 1);
          setTimeout(() => setRefreshKey(prev => prev + 1), 3000);
          setTimeout(() => setRefreshKey(prev => prev + 1), 8000);
        }
      );
    }
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="backdrop-blur-xl bg-white/5 border-b border-white/10 sticky top-0 z-50 shadow-2xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <div className="relative group">
                <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-purple-400 rounded-lg sm:rounded-xl blur-lg opacity-60 group-hover:opacity-80 transition-opacity animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-blue-500 to-purple-600 p-2 sm:p-2.5 md:p-3 rounded-lg sm:rounded-xl">
                  <TrendingUp className="text-white" size={20} />
                </div>
                <div className="absolute -top-1 -right-1 sm:-top-2 sm:-right-2 w-3 h-3 sm:w-4 sm:h-4 bg-emerald-400 rounded-full animate-bounce shadow-lg"></div>
              </div>
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">StackPulseFi</h1>
                <p className="text-xs sm:text-sm text-white/70 font-medium">Next-Gen DeFi on Stacks</p>
              </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 md:gap-4">
              <Link href="/advisor">
                <button className="group relative flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 md:px-6 sm:py-2.5 md:py-3 bg-gradient-to-r from-purple-500 via-blue-500 to-cyan-500 hover:from-purple-600 hover:via-blue-600 hover:to-cyan-600 text-white rounded-full transition-all duration-300 hover:scale-105 text-xs sm:text-sm md:text-base font-semibold shadow-2xl overflow-hidden">
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                  <Sparkles size={16} className="relative z-10 sm:w-[18px] sm:h-[18px]" />
                  <span className="relative z-10 hidden sm:inline">Stacks DeFi AI Advisor</span>
                  <span className="relative z-10 sm:hidden">AI Advisor</span>
                </button>
              </Link>
              {isClient && userAddress && (
                <button
                  onClick={handleTestMint}
                  className="group relative flex items-center gap-1.5 sm:gap-2 px-3 py-2 sm:px-4 md:px-6 sm:py-2.5 md:py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-full transition-all duration-300 hover:scale-105 text-xs sm:text-sm md:text-base font-semibold shadow-2xl overflow-hidden"
                  title="Test only: Mint 1,000 sBTC for testing"
                >
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                  <Coins size={16} className="relative z-10 sm:w-[18px] sm:h-[18px]" />
                  <span className="relative z-10 hidden sm:inline">Test Mint sBTC</span>
                  <span className="relative z-10 sm:hidden">Mint</span>
                </button>
              )}
              <WalletConnect />
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative py-12 sm:py-20 md:py-28 lg:py-32 overflow-hidden">
        {/* Background Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-purple-500/20 via-transparent to-transparent"></div>
        <div className="absolute top-0 left-0 w-full h-full">
          <div className="absolute top-20 left-[10%] w-96 h-96 bg-gradient-to-r from-blue-500/30 to-purple-500/30 rounded-full blur-3xl animate-pulse"></div>
          <div className="absolute bottom-20 right-[10%] w-80 h-80 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '4s' }}></div>
        </div>

        {/* Animated grid background */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.15) 1px, transparent 0)', backgroundSize: '50px 50px' }}></div>
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="animate-fade-in">
            <div className="mb-8">
              <span className="inline-flex items-center px-4 py-2 rounded-full bg-gradient-to-r from-purple-500/20 to-blue-500/20 border border-purple-500/30 text-purple-200 text-sm font-semibold mb-6">
                <span className="w-2 h-2 bg-emerald-400 rounded-full mr-2 animate-pulse"></span>
                Next-Gen DeFi Platform
              </span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-black mb-6 sm:mb-8 leading-tight px-4">
              <span className="bg-gradient-to-r from-white via-blue-100 to-purple-100 bg-clip-text text-transparent">Transform Your</span>
              <br />
              <span className="bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent animate-pulse">sBTC Portfolio</span>
            </h2>
            <p className="text-base sm:text-lg md:text-xl lg:text-2xl text-white/80 mb-8 sm:mb-12 md:mb-16 max-w-4xl mx-auto leading-relaxed font-light px-4">
              Advanced yield optimization with AI-powered strategies, auto-compounding vaults, and risk-adjusted returns
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-center mb-8 sm:mb-12 md:mb-16 px-4">
              <button className="group relative w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl sm:rounded-2xl font-bold text-base sm:text-lg transition-all duration-300 hover:scale-105 shadow-2xl hover:shadow-blue-500/25 overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                <span className="relative flex items-center justify-center gap-2">
                  <TrendingUp size={18} className="sm:w-5 sm:h-5" />
                  Start Earning Now
                </span>
              </button>

              <Link href="/advisor" className="w-full sm:w-auto">
                <button className="group w-full sm:w-auto px-6 sm:px-8 py-3 sm:py-4 bg-white/10 hover:bg-white/20 backdrop-blur-sm border border-white/20 hover:border-white/30 text-white rounded-xl sm:rounded-2xl font-semibold text-base sm:text-lg transition-all duration-300 hover:scale-105">
                  <span className="flex items-center justify-center gap-2">
                    <Sparkles size={18} className="sm:w-5 sm:h-5" />
                    Explore AI Insights
                  </span>
                </button>
              </Link>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl mx-auto">
            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500 hover:border-blue-400/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl shadow-lg">
                    <Shield size={32} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white mb-1">{poolCount}</div>
                    <div className="text-sm text-blue-200 font-semibold uppercase tracking-wider">Active Pools</div>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-blue-400 to-cyan-400 rounded-full animate-pulse" style={{ width: '85%' }}></div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-pink-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500 hover:border-purple-400/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl shadow-lg">
                    <Vault size={32} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white mb-1">{vaultCount}</div>
                    <div className="text-sm text-purple-200 font-semibold uppercase tracking-wider">Auto Vaults</div>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-purple-400 to-pink-400 rounded-full animate-pulse" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500 hover:border-cyan-400/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-2xl shadow-lg">
                    <Clock size={32} className="text-white" />
                  </div>
                  <div className="text-right">
                    <div className="text-4xl font-black text-white mb-1">{futureFundCount}</div>
                    <div className="text-sm text-cyan-200 font-semibold uppercase tracking-wider">Future Funds</div>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-cyan-400 to-teal-400 rounded-full animate-pulse" style={{ width: '76%' }}></div>
                </div>
              </div>
            </div>

            <div className="group relative">
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500 to-green-500 rounded-3xl blur-lg opacity-30 group-hover:opacity-50 transition-opacity"></div>
              <div className="relative bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 hover:scale-105 transition-all duration-500 hover:border-emerald-400/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="p-4 bg-gradient-to-br from-emerald-500 to-green-500 rounded-2xl shadow-lg">
                    <DollarSign size={32} className="text-white" />
                  </div>
                  <div className="text-right flex-1 ml-4">
                    <div className="text-3xl md:text-3xl font-black text-white mb-1 break-words">{totalSupply}</div>
                    <div className="text-sm text-emerald-200 font-semibold uppercase tracking-wider">Total Supply</div>
                  </div>
                </div>
                <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-green-400 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Tab Navigation */}
        <div className="relative max-w-5xl mx-auto mb-8 sm:mb-12 md:mb-16 px-4">
          <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl p-1.5 sm:p-2 shadow-2xl">
            <div className="flex space-x-1 sm:space-x-2">
              <button
                onClick={() => setActiveTab('pools')}
                className={`group relative flex-1 py-2.5 px-2 sm:py-3 sm:px-4 md:py-4 md:px-8 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base transition-all duration-500 flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 overflow-hidden ${activeTab === 'pools'
                  ? 'bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-2xl transform scale-[1.02]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                {activeTab === 'pools' && (
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                )}
                <Shield size={16} className="relative z-10 sm:w-5 sm:h-5" />
                <span className="relative z-10 hidden sm:inline">Staking Pools</span>
                <span className="relative z-10 sm:hidden">Pools</span>
              </button>
              <button
                onClick={() => setActiveTab('vaults')}
                className={`group relative flex-1 py-2.5 px-2 sm:py-3 sm:px-4 md:py-4 md:px-8 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base transition-all duration-500 flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 overflow-hidden ${activeTab === 'vaults'
                  ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-2xl transform scale-[1.02]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                {activeTab === 'vaults' && (
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                )}
                <Vault size={16} className="relative z-10 sm:w-5 sm:h-5" />
                <span className="relative z-10 hidden sm:inline">Auto Vaults</span>
                <span className="relative z-10 sm:hidden">Vaults</span>
              </button>
              <button
                onClick={() => setActiveTab('future-funds')}
                className={`group relative flex-1 py-2.5 px-2 sm:py-3 sm:px-4 md:py-4 md:px-8 rounded-xl sm:rounded-2xl font-bold text-xs sm:text-sm md:text-base transition-all duration-500 flex items-center justify-center gap-1.5 sm:gap-2 md:gap-3 overflow-hidden ${activeTab === 'future-funds'
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-2xl transform scale-[1.02]'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
                  }`}
              >
                {activeTab === 'future-funds' && (
                  <div className="absolute inset-0 bg-white/20 transform -skew-x-12 translate-x-full group-hover:translate-x-0 transition-transform duration-700"></div>
                )}
                <Clock size={16} className="relative z-10 sm:w-5 sm:h-5" />
                <span className="relative z-10 hidden sm:inline">FutureFund</span>
                <span className="relative z-10 sm:hidden">Future</span>
              </button>
            </div>
          </div>
        </div>

        {/* Admin Panel */}
        {isClient && isAdmin && (
          <div className="mb-12">
            <AdminPanel isAdmin={isAdmin} onDataChange={fetchData} />
          </div>
        )}

        {/* Content */}
        {activeTab === 'pools' && (
          <div className="animate-fade-in">
            <div className="mb-6 sm:mb-8 text-center px-4">
              <h2 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white mb-3 sm:mb-4">Staking Pools</h2>
              <p className="text-base sm:text-lg md:text-xl text-white/80 max-w-2xl mx-auto">
                Choose from different risk profiles to match your investment strategy and maximize your sBTC returns
              </p>
              {poolCount === 0 && (
                <div className="mt-8 glass rounded-2xl p-8 max-w-4xl mx-auto">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <TrendingUp className="text-white" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">No Pools Created Yet</h3>
                    <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                      The smart contracts are deployed but no staking pools have been created yet.
                      You need to create initial pools to start yield farming.
                    </p>

                    <div className="bg-white/10 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Quick Setup Options:</h4>
                      <div className="grid md:grid-cols-2 gap-4 text-left">
                        <div className="bg-white/5 rounded-lg p-4">
                          <h5 className="font-semibold text-white mb-2">🚀 Automated Setup (Recommended)</h5>
                          <p className="text-white/70 text-sm mb-3">Run the setup script to create pools automatically:</p>
                          <code className="bg-black/20 text-green-300 px-2 py-1 rounded text-xs block">
                            node create-initial-pools.js
                          </code>
                        </div>
                        <div className="bg-white/5 rounded-lg p-4">
                          <h5 className="font-semibold text-white mb-2">🔧 Manual Setup</h5>
                          <p className="text-white/70 text-sm mb-3">Use Hiro Platform to create pools manually:</p>
                          <a
                            href="https://platform.hiro.so/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-300 hover:text-blue-200 text-sm underline"
                          >
                            Open Hiro Platform →
                          </a>
                        </div>
                      </div>
                    </div>

                    <div className="bg-gradient-to-r from-green-500/20 to-blue-500/20 rounded-xl p-6 border border-green-500/30">
                      <h4 className="text-lg font-semibold text-white mb-3">📋 What Will Be Created:</h4>
                      <div className="grid md:grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                          <div className="w-8 h-8 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Shield className="text-green-300" size={16} />
                          </div>
                          <div className="font-semibold text-white">Conservative</div>
                          <div className="text-white/70">5% APR • 7 days</div>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-yellow-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                            <TrendingUp className="text-yellow-300" size={16} />
                          </div>
                          <div className="font-semibold text-white">Moderate</div>
                          <div className="text-white/70">8% APR • 14 days</div>
                        </div>
                        <div className="text-center">
                          <div className="w-8 h-8 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
                            <Zap className="text-red-300" size={16} />
                          </div>
                          <div className="font-semibold text-white">Aggressive</div>
                          <div className="text-white/70">15% APR • 30 days</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: Math.max(poolCount, 3) }, (_, i) => (
                <div key={i + 1} className="animate-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <PoolCard
                    poolId={i + 1}
                    onDeposit={handlePoolDeposit}
                    onWithdraw={handlePoolWithdraw}
                    onClaim={handlePoolClaim}
                    refreshKey={refreshKey}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'vaults' && (
          <div className="animate-fade-in">
            <div className="mb-8 text-center">
              <h2 className="text-4xl font-bold text-white mb-4">Auto-Compound Vaults</h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Set and forget - your rewards are automatically reinvested for maximum yields
              </p>
              {vaultCount === 0 && (
                <div className="mt-8 glass rounded-2xl p-8 max-w-4xl mx-auto">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Vault className="text-white" size={32} />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-4">No Vaults Created Yet</h3>
                    <p className="text-white/80 mb-6 max-w-2xl mx-auto">
                      Auto-compound vaults haven&apos;t been created yet. These vaults automatically reinvest your rewards for maximum yields.
                    </p>

                    <div className="bg-white/10 rounded-xl p-6 mb-6">
                      <h4 className="text-lg font-semibold text-white mb-4">Vault Creation:</h4>
                      <div className="text-left">
                        <p className="text-white/70 mb-4">
                          Vaults are created after pools are set up. Each vault is linked to a specific staking pool and automatically compounds rewards.
                        </p>
                        <div className="bg-purple-500/20 rounded-lg p-4 border border-purple-500/30">
                          <h5 className="font-semibold text-white mb-2">🔗 Vault Features:</h5>
                          <ul className="text-white/70 text-sm space-y-1">
                            <li>• Automatic reward reinvestment</li>
                            <li>• Professional management</li>
                            <li>• Higher potential returns</li>
                            <li>• Set-and-forget strategy</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {Array.from({ length: Math.max(vaultCount, 3) }, (_, i) => (
                <div key={i + 1} className="animate-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                  <VaultCard
                    vaultId={i + 1}
                    onDeposit={handleVaultDeposit}
                    onWithdraw={handleVaultWithdraw}
                    onHarvest={handleVaultHarvest}
                    refreshKey={refreshKey}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'future-funds' && (
          <div className="animate-fade-in">
            {/* Header with gradient background */}
            <div className="mb-12 text-center relative overflow-hidden rounded-3xl glass p-12">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
              <div className="relative z-10">
                <div className="inline-flex items-center gap-3 bg-gradient-to-r from-blue-500 to-purple-500 text-white px-6 py-2 rounded-full text-sm font-semibold mb-6">
                  <Sparkles size={16} />
                  <span>Earn 8-20% APY on sBTC</span>
                </div>
                <h2 className="text-5xl font-bold mb-4 bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                  FutureFund
                </h2>
                <p className="text-xl text-white/80 max-w-3xl mx-auto">
                  Build your future with Bitcoin-backed savings. Create multiple funds, earn guaranteed yields, and secure your financial goals.
                </p>
              </div>
            </div>

            {/* Retirement Funds Section */}
            <div className="mb-12">
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                      <Clock className="text-white" size={20} />
                    </div>
                    Retirement Funds
                  </h3>
                  <p className="text-white/70">
                    Long-term sBTC savings with guaranteed APY yields
                  </p>
                </div>
                {userAddress && (
                  <button
                    onClick={() => setCreateFundModal({ isOpen: true, fundType: 'retirement' })}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 text-white font-semibold transition-all flex items-center gap-2 shadow-lg shadow-blue-500/30"
                  >
                    <Sparkles size={18} />
                    Create Retirement Fund
                  </button>
                )}
              </div>

              {!userAddress && (
                <div className="glass rounded-2xl p-8 max-w-4xl mx-auto mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock className="text-white" size={32} />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-4">Connect Wallet to View Your Funds</h4>
                    <p className="text-white/80 mb-6">
                      Connect your wallet to create and manage retirement funds with sBTC yields.
                    </p>
                  </div>
                </div>
              )}

              {userAddress && userRetirementFunds.length === 0 && (
                <div className="glass rounded-2xl p-8 max-w-4xl mx-auto mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Clock className="text-white" size={32} />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-4">No Retirement Funds Yet</h4>
                    <p className="text-white/80 mb-6">
                      Create a retirement fund to start earning sBTC yields. Multiple funds allowed!
                    </p>
                    <div className="bg-blue-500/20 rounded-xl p-6 border border-blue-500/30 text-left">
                      <h5 className="font-semibold text-white mb-3">🏦 Retirement Fund Features:</h5>
                      <ul className="text-white/70 text-sm space-y-2">
                        <li>• sBTC-based with APY rewards (8-20%)</li>
                        <li>• Minimum 5 years lock period</li>
                        <li>• Create multiple retirement funds</li>
                        <li>• Early withdrawal available (20% fee)</li>
                        <li>• Claim rewards anytime</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {userAddress && userRetirementFunds.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {userRetirementFunds.map((fund, i) => (
                    <div key={fund.fundId} className="animate-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                      <FutureFundCard
                        fundId={fund.fundId}
                        fundType="retirement"
                        onContribute={handleFutureFundContribute}
                        onWithdraw={handleFutureFundWithdraw}
                        refreshKey={refreshKey}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Education Funds Section */}
            <div>
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <h3 className="text-3xl font-bold text-white mb-2 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                      <Users className="text-white" size={20} />
                    </div>
                    Education Funds
                  </h3>
                  <p className="text-white/70">
                    Save for education with guardian protection and goal tracking
                  </p>
                </div>
                {userAddress && (
                  <button
                    onClick={() => setCreateFundModal({ isOpen: true, fundType: 'education' })}
                    className="px-6 py-3 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold transition-all flex items-center gap-2 shadow-lg shadow-purple-500/30"
                  >
                    <Sparkles size={18} />
                    Create Education Fund
                  </button>
                )}
              </div>

              {!userAddress && (
                <div className="glass rounded-2xl p-8 max-w-4xl mx-auto mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="text-white" size={32} />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-4">Connect Wallet to View Your Funds</h4>
                    <p className="text-white/80 mb-6">
                      Connect your wallet to create and manage education funds with sBTC yields.
                    </p>
                  </div>
                </div>
              )}

              {userAddress && userEducationFunds.length === 0 && (
                <div className="glass rounded-2xl p-8 max-w-4xl mx-auto mb-6">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Users className="text-white" size={32} />
                    </div>
                    <h4 className="text-2xl font-bold text-white mb-4">No Education Funds Yet</h4>
                    <p className="text-white/80 mb-6">
                      Create education funds for your children&apos;s future. Create multiple funds!
                    </p>
                    <div className="bg-purple-500/20 rounded-xl p-6 border border-purple-500/30 text-left">
                      <h5 className="font-semibold text-white mb-3">🎓 Education Fund Features:</h5>
                      <ul className="text-white/70 text-sm space-y-2">
                        <li>• sBTC-based with APY rewards (8-20%)</li>
                        <li>• Guardian-controlled for child safety</li>
                        <li>• Goal tracking with progress indicators</li>
                        <li>• Early withdrawal available (20% fee)</li>
                        <li>• Open contributions from anyone</li>
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {userAddress && userEducationFunds.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                  {userEducationFunds.map((fund, i) => (
                    <div key={fund.fundId} className="animate-slide-in" style={{ animationDelay: `${i * 0.1}s` }}>
                      <FutureFundCard
                        fundId={fund.fundId}
                        fundType="education"
                        onContribute={handleFutureFundContribute}
                        onWithdraw={handleFutureFundWithdraw}
                        refreshKey={refreshKey}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <DepositModal
        isOpen={depositModal.isOpen}
        onClose={() => setDepositModal({ ...depositModal, isOpen: false })}
        poolId={depositModal.poolId}
        type={depositModal.type}
        onSubmit={handleDepositSubmit}
      />

      <WithdrawModal
        isOpen={withdrawModal.isOpen}
        onClose={() => setWithdrawModal({ ...withdrawModal, isOpen: false })}
        poolId={withdrawModal.poolId}
        type={withdrawModal.type}
        maxAmount={withdrawModal.maxAmount}
        onSubmit={handleWithdrawSubmit}
      />

      <TransactionModal
        isOpen={transactionModal.isOpen}
        onClose={() => setTransactionModal({ ...transactionModal, isOpen: false })}
        txId={transactionModal.txId}
        title={transactionModal.title}
        description={transactionModal.description}
      />

      {/* Global AI Chat */}
      <GlobalAIChat poolCount={poolCount} vaultCount={vaultCount} futureFundCount={futureFundCount} />

      {/* Footer */}
      <footer className="glass border-t border-white/20 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="mb-6">
              <div className="flex items-center justify-center gap-3 mb-4">
                <TrendingUp className="text-white" size={24} />
                <h3 className="text-xl font-bold text-white">StackPulseFi</h3>
              </div>
              <p className="text-white/80 max-w-2xl mx-auto">
                Next-generation DeFi platform built on the Stacks blockchain
              </p>
            </div>

            <div className="border-t border-white/20 pt-6">
              <p className="text-white/70 mb-2">
                ⚠️ This software is experimental and not yet audited. Use at your own risk.
              </p>
              <p className="text-sm text-white/60">
                Built on Stacks blockchain with sBTC • Powered by DeFi innovation
              </p>
            </div>
          </div>
        </div>
      </footer>

      {/* Create Fund Modal */}
      <CreateFundModal
        isOpen={createFundModal.isOpen}
        fundType={createFundModal.fundType}
        onClose={() => setCreateFundModal({ ...createFundModal, isOpen: false })}
        onSuccess={() => {
          setRefreshKey(prev => prev + 1);
          setTimeout(() => fetchData(), 2000);
          setTimeout(() => fetchData(), 5000);
        }}
      />
    </div>
  );
}