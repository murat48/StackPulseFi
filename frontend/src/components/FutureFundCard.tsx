'use client';

import { useState, useEffect } from 'react';
import { Clock, Users, TrendingUp, Lock, Unlock, Calendar, Target, Award, AlertTriangle } from 'lucide-react';
import { getUserAddress } from '@/lib/stacks/wallet';
import { stacksApi } from '@/lib/stacks/api';
import { formatSBTC } from '@/lib/stacks/config';

interface FutureFundCardProps {
  fundId: number;
  fundType: 'retirement' | 'education';
  onContribute: (fundId: number, fundType: 'retirement' | 'education') => void;
  onWithdraw: (fundId: number, fundType: 'retirement' | 'education') => void;
  refreshKey?: number;
}

// Contract structure based on retirement-fund.clar and education-fund.clar
interface RetirementFund {
  owner: string;
  'initial-deposit': number;
  balance: number;
  'unlock-height': number;
  'created-at': number;
  'lock-duration-years': number;
  'apy-rate': number;
  'total-rewards-earned': number;
  'last-reward-claim-height': number;
  'is-active': boolean;
}

interface EducationFund {
  creator: string;
  guardian: string;
  'initial-deposit': number;
  balance: number;
  'unlock-height': number;
  'created-at': number;
  'lock-duration-years': number;
  'apy-rate': number;
  'goal-amount': number;
  'total-rewards-earned': number;
  'last-reward-claim-height': number;
  'is-active': boolean;
  'fund-name': string;
}

export default function FutureFundCard({ fundId, fundType, onContribute, onWithdraw, refreshKey }: FutureFundCardProps) {
  const [fundData, setFundData] = useState<RetirementFund | EducationFund | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [daysUntilUnlock, setDaysUntilUnlock] = useState(0);
  const [progress, setProgress] = useState(0);
  const [isMounted, setIsMounted] = useState(false);

  const userAddress = getUserAddress();

  // Ensure component is mounted before making API calls
  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    if (!isMounted || !userAddress) {
      setIsLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        setIsLoading(true);

        // Fetch fund info from contract
        let data: any;
        if (fundType === 'retirement') {
          data = await stacksApi.getRetirementFundInfo(fundId);
        } else {
          data = await stacksApi.getEducationFundInfo(fundId);
        }

        if (!data) {
          console.error(`[FutureFund] No data returned for ${fundType} fund #${fundId}`);
          setIsLoading(false);
          return;
        }

        setFundData(data);

        // Get current block height
        const currentHeight = await stacksApi.getCurrentBlockHeight();

        // Parse unlock-height from contract data
        // Contract returns: unlock-height: uint
        let unlockHeight = data['unlock-height'] || 0;
        let lockDurationYears = data['lock-duration-years'] || 0;

        // Fix: If lock duration seems too high, calculate it from unlock-height and created-at
        if (lockDurationYears > 100) {
          console.warn(`[FutureFund ${fundType} #${fundId}] Lock duration ${lockDurationYears} seems too high, calculating from unlock-height`);
          const createdAt = data['created-at'] || 0;
          const totalBlocks = unlockHeight - createdAt;
          lockDurationYears = Math.round(totalBlocks / 52560);
          console.warn(`[FutureFund ${fundType} #${fundId}] Calculated from blocks: ${totalBlocks} blocks = ${lockDurationYears} years`);
        }

        // Fix: If unlock-height is too small (less than current height), recalculate it
        if (unlockHeight < currentHeight) {
          console.warn(`[FutureFund ${fundType} #${fundId}] Unlock height ${unlockHeight} is less than current height ${currentHeight}, recalculating`);
          const expectedBlocks = lockDurationYears * 52560;
          unlockHeight = currentHeight + expectedBlocks;
          console.warn(`[FutureFund ${fundType} #${fundId}] Recalculated unlock height: ${currentHeight} + ${expectedBlocks} = ${unlockHeight}`);
        }

        console.log(`[FutureFund ${fundType} #${fundId}] Fund Data:`, {
          unlockHeight,
          currentHeight,
          lockDurationYears,
          expectedBlocks: lockDurationYears * 52560,
          balance: data.balance,
          rawData: data,
        });

        // Debug: Check if lock duration is reasonable (after conversion)
        if (lockDurationYears > 50) {
          console.warn(`[FutureFund ${fundType} #${fundId}] WARNING: Lock duration still seems high: ${lockDurationYears} years`);
          console.warn(`[FutureFund ${fundType} #${fundId}] Raw lock-duration-years:`, data['lock-duration-years']);
        }

        // Calculate if fund is unlocked
        const fundIsUnlocked = currentHeight >= unlockHeight;
        
        // Debug: Why is fund unlocked?
        if (fundIsUnlocked) {
          console.error(`[FutureFund ${fundType} #${fundId}] FUND IS UNLOCKED! This should not happen for new funds.`);
          console.error(`[FutureFund ${fundType} #${fundId}] Current Height: ${currentHeight}`);
          console.error(`[FutureFund ${fundType} #${fundId}] Unlock Height: ${unlockHeight}`);
          console.error(`[FutureFund ${fundType} #${fundId}] Comparison: ${currentHeight} >= ${unlockHeight} = ${fundIsUnlocked}`);
          
          if (unlockHeight === 0) {
            console.error(`[FutureFund ${fundType} #${fundId}] PROBLEM: Unlock height is 0! This means the contract didn't set it properly.`);
          } else if (unlockHeight < currentHeight) {
            console.error(`[FutureFund ${fundType} #${fundId}] PROBLEM: Unlock height (${unlockHeight}) is less than current height (${currentHeight})`);
          }
        }
        
        setIsUnlocked(fundIsUnlocked);

        // Calculate days until unlock
        // BLOCKS_PER_YEAR = 52560 (144 blocks/day * 365 days)
        // So 144 blocks = 1 day
        const blocksRemaining = Math.max(0, unlockHeight - currentHeight);
        const daysRemaining = Math.ceil(blocksRemaining / 144);

        console.log(`[FutureFund ${fundType} #${fundId}] Time Calculation:`, {
          blocksRemaining,
          daysRemaining,
          calculation: `(${unlockHeight} - ${currentHeight}) / 144 = ${daysRemaining} days`
        });

        setDaysUntilUnlock(daysRemaining);

        // Calculate progress for education funds
        if (fundType === 'education' && data['goal-amount']) {
          const goalAmount = Number(data['goal-amount']);
          const balance = Number(data.balance);
          const progressPercent = goalAmount > 0 ? Math.min((balance / goalAmount) * 100, 100) : 0;
          setProgress(progressPercent);
        }

      } catch (error) {
        console.error(`[FutureFund] Error fetching ${fundType} fund #${fundId}:`, error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [fundId, fundType, userAddress, refreshKey, isMounted]);

  if (isLoading) {
    return (
      <div className="card p-6 animate-pulse">
        <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
      </div>
    );
  }

  if (!fundData) {
    return (
      <div className="card p-6 border-2 border-red-200">
        <p className="text-red-600">Fund not found</p>
      </div>
    );
  }

  const isRetirement = fundType === 'retirement';
  const balance = formatSBTC(fundData.balance);
  const initialDeposit = formatSBTC(fundData['initial-deposit']);
  const lockDurationYears = fundData['lock-duration-years'];
  const apyRate = (fundData['apy-rate'] / 100).toFixed(1);

  return (
    <div className={`card p-6 border-2 ${isRetirement ? 'border-blue-200 bg-gradient-to-br from-blue-50 to-cyan-50' : 'border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50'}`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${isRetirement ? 'bg-gradient-to-br from-blue-500 to-cyan-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
            {isRetirement ? <Clock className="text-white" size={24} /> : <Users className="text-white" size={24} />}
          </div>
          <div>
            <h3 className="text-lg font-bold text-gray-900">
              {isRetirement ? `Retirement Fund #${fundId}` : (fundData as EducationFund)['fund-name']}
            </h3>
            <p className="text-sm text-gray-600">
              {isRetirement ? 'Long-term savings' : `Education Fund #${fundId}`}
            </p>
          </div>
        </div>
        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${isUnlocked ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'}`}>
          {isUnlocked ? (
            <span className="flex items-center gap-1">
              <Unlock size={12} /> Unlocked
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <Lock size={12} /> Locked
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Balance</div>
          <div className="text-xl font-bold text-gray-900">{balance} sBTC</div>
        </div>
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">APY Rate</div>
          <div className="text-xl font-bold text-green-600">{apyRate}%</div>
        </div>
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1 flex items-center gap-1">
            <Calendar size={12} />
            {isUnlocked ? 'Unlocked' : 'Days Until Unlock'}
          </div>
          <div className="text-xl font-bold text-gray-900">
            {isUnlocked ? 'Available' : `${daysUntilUnlock} days`}
          </div>
        </div>
        <div className="bg-white rounded-lg p-3">
          <div className="text-xs text-gray-500 mb-1">Lock Duration</div>
          <div className="text-xl font-bold text-gray-900">{lockDurationYears} years</div>
        </div>
      </div>

      {/* Education Fund Progress */}
      {!isRetirement && (fundData as EducationFund)['goal-amount'] && (
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
              <Target size={14} />
              Goal Progress
            </span>
            <span className="text-sm font-bold text-purple-600">{progress.toFixed(1)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-gradient-to-r from-purple-500 to-pink-500 h-2 rounded-full transition-all"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <div className="flex justify-between mt-1">
            <span className="text-xs text-gray-500">{balance} sBTC</span>
            <span className="text-xs text-gray-500">{formatSBTC((fundData as EducationFund)['goal-amount'])} sBTC</span>
          </div>
        </div>
      )}

      {/* Info */}
      <div className="bg-white rounded-lg p-3 mb-4">
        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
          <Award size={14} className="text-yellow-500" />
          <span>Initial Deposit: <span className="font-semibold text-gray-900">{initialDeposit} sBTC</span></span>
        </div>
        {!isRetirement && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Users size={14} className="text-purple-500" />
            <span>Guardian: <span className="font-mono text-xs">{(fundData as EducationFund).guardian.slice(0, 8)}...{(fundData as EducationFund).guardian.slice(-4)}</span></span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="space-y-2">
        {/* Contribute Button */}
        <button
          onClick={() => onContribute(fundId, fundType)}
          className={`w-full py-2 px-4 rounded-lg font-semibold text-white transition-all ${isRetirement ? 'bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600' : 'bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600'}`}
        >
          Contribute
        </button>

        {/* Withdrawal Buttons */}
        <div className="flex gap-2">
          {isUnlocked ? (
            <button
              onClick={() => onWithdraw(fundId, fundType)}
              className="flex-1 py-2 px-4 rounded-lg font-semibold bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white transition-all"
            >
              Withdraw
            </button>
          ) : (
            <button
              onClick={() => onWithdraw(fundId, fundType)}
              className="flex-1 py-2 px-4 rounded-lg font-semibold bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white transition-all flex items-center justify-center gap-1"
            >
              <AlertTriangle size={16} />
              Early Withdraw
            </button>
          )}
        </div>

        {/* Early Withdrawal Warning */}
        {!isUnlocked && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-orange-500 mt-0.5" />
              <div className="text-sm">
                <div className="font-semibold text-orange-800">Early Withdrawal Fee</div>
                <div className="text-orange-700">20% penalty fee applies to early withdrawals</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
