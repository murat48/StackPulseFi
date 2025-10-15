import { AppConfig, UserSession, openContractCall, FinishedTxData } from '@stacks/connect';
import { getNetwork } from './config';
import {
  AnchorMode,
  PostConditionMode,
  standardPrincipalCV,
  uintCV,
  noneCV,
  ClarityValue
} from '@stacks/transactions';

// App configuration for Stacks Connect
const appConfig = new AppConfig(['store_write', 'publish_data']);
export const userSession = new UserSession({ appConfig });

// Wallet connection
export const connectWallet = () => {
  // Simple approach: use window-based detection
  if (typeof window === 'undefined') {
    console.error('Cannot connect wallet on server side');
    return;
  }

  console.log('🔌 Attempting to connect wallet...');

  // Dynamic import to avoid SSR issues
  import('@stacks/connect').then((stacksConnect) => {
    console.log('✅ @stacks/connect loaded');
    console.log('Available methods:', Object.keys(stacksConnect));

    const authOptions = {
      appDetails: {
        name: 'StackPulseFi',
        icon: window.location.origin + '/favicon.ico',
      },
      redirectTo: '/',
      onFinish: () => {
        console.log('✅ Wallet connected successfully');
        window.location.reload();
      },
      onCancel: () => {
        console.log('❌ Wallet connection cancelled');
      },
      userSession,
    };

    // Try showConnect first (newer API)
    if (stacksConnect.showConnect) {
      console.log('🚀 Using showConnect method');
      stacksConnect.showConnect(authOptions);
    }
    // Fallback to authenticate
    else if (stacksConnect.authenticate) {
      console.log('🚀 Using authenticate method');
      stacksConnect.authenticate(authOptions);
    }
    // Last resort: try openAuth
    else if ((stacksConnect as any).openAuth) {
      console.log('🚀 Using openAuth method');
      (stacksConnect as any).openAuth(authOptions);
    }
    else {
      console.error('❌ No wallet connection method available');
      console.log('Available stacksConnect keys:', Object.keys(stacksConnect));
      alert('Wallet connection method not found. Please install Leather Wallet or Xverse.\n\nLeather: https://leather.io\nXverse: https://xverse.app');
    }
  }).catch((error) => {
    console.error('❌ Error importing @stacks/connect:', error);
    alert('Error loading wallet. Please:\n1. Install Leather Wallet (https://leather.io)\n2. Refresh the page\n3. Try again');
  });
};

// Wallet utilities
export const isWalletConnected = () => {
  return userSession.isUserSignedIn();
};

export const getUserAddress = () => {
  if (!isWalletConnected()) return null;
  return userSession.loadUserData().profile.stxAddress.testnet;
};

export const disconnectWallet = () => {
  userSession.signUserOut('/');
};

// Contract interaction helpers
interface ContractCallOptions {
  contractAddress: string;
  contractName: string;
  functionName: string;
  functionArgs: ClarityValue[];
  onFinish?: (data: FinishedTxData) => void;
  onCancel?: () => void;
}

export const callContract = async ({
  contractAddress,
  contractName,
  functionName,
  functionArgs,
  onFinish,
  onCancel
}: ContractCallOptions) => {
  if (!isWalletConnected()) {
    throw new Error('Wallet not connected');
  }

  const [address, name] = contractAddress.includes('.')
    ? contractAddress.split('.')
    : [contractAddress, contractName];

  const network = await getNetwork();

  openContractCall({
    network,
    anchorMode: AnchorMode.Any,
    contractAddress: address,
    contractName: name,
    functionName,
    functionArgs,
    postConditionMode: PostConditionMode.Allow,
    onFinish: (data) => {
      console.log('Transaction submitted:', data);
      onFinish?.(data);
    },
    onCancel: () => {
      console.log('Transaction cancelled');
      onCancel?.();
    },
  });
};

// Specific contract call functions
export const stakeToPool = async (
  contractAddress: string,
  poolId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  await callContract({
    contractAddress,
    contractName: 'staking-poolvss',
    functionName: 'stake',
    functionArgs: [uintCV(poolId), uintCV(amount)],
    onFinish,
    onCancel,
  });
};

export const unstakeFromPool = async (
  contractAddress: string,
  poolId: number,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  await callContract({
    contractAddress,
    contractName: 'staking-poolvss',
    functionName: 'unstake',
    functionArgs: [uintCV(poolId)],  // No amount - full withdrawal only
    onFinish,
    onCancel,
  });
};

export const unstakeEarlyFromPool = async (
  contractAddress: string,
  poolId: number,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  await callContract({
    contractAddress,
    contractName: 'staking-poolvss',
    functionName: 'unstake-early',
    functionArgs: [uintCV(poolId)],  // No amount - full withdrawal with penalty
    onFinish,
    onCancel,
  });
};

export const claimRewards = async (
  contractAddress: string,
  poolId: number,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  await callContract({
    contractAddress,
    contractName: 'staking-poolvss',
    functionName: 'claim-rewards',
    functionArgs: [uintCV(poolId)],
    onFinish,
    onCancel,
  });
};

// TEST ONLY: Mint sBTC tokens for testing purposes
// Anyone can call this function, max 10,000 sBTC per transaction
export const testMintSBTC = async (
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const sbtcTokenContract = process.env.NEXT_PUBLIC_SBTC_TOKEN_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betavss';

  await callContract({
    contractAddress: sbtcTokenContract,
    contractName: 'sbtc-token-betavss',
    functionName: 'test-mint',
    functionArgs: [uintCV(amount)],
    onFinish,
    onCancel,
  });
};

export const depositToVault = async (
  contractAddress: string,
  vaultId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  await callContract({
    contractAddress,
    contractName: 'vault-compoundervss',
    functionName: 'deposit-vault',
    functionArgs: [uintCV(vaultId), uintCV(amount)],
    onFinish,
    onCancel,
  });
};

export const withdrawFromVault = async (
  contractAddress: string,
  vaultId: number,
  shares: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  await callContract({
    contractAddress,
    contractName: 'vault-compoundervss',
    functionName: 'withdraw-vault',
    functionArgs: [uintCV(vaultId), uintCV(shares)],
    onFinish,
    onCancel,
  });
};

export const harvestVault = async (
  contractAddress: string,
  vaultId: number,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  await callContract({
    contractAddress,
    contractName: 'vault-compoundervss',
    functionName: 'harvest',
    functionArgs: [uintCV(vaultId)],
    onFinish,
    onCancel,
  });
};

export const transferSBTC = async (
  contractAddress: string,
  amount: bigint,
  recipient: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const senderAddress = getUserAddress();
  if (!senderAddress) throw new Error('Wallet not connected');

  await callContract({
    contractAddress,
    contractName: 'sbtc-token-betavss',
    functionName: 'transfer',
    functionArgs: [
      uintCV(amount),
      standardPrincipalCV(senderAddress),
      standardPrincipalCV(recipient),
      noneCV()
    ],
    onFinish,
    onCancel,
  });
};

// ============ ADMIN FUNCTIONS ============

// Admin: Create Staking Pool
export const createStakingPool = async (
  tokenContract: string,
  riskProfile: number,
  rewardRate: bigint,
  minStake: bigint,
  maxStakePerUser: bigint,
  feePercent: bigint,
  depositLockPeriod: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_STAKING_POOL_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.staking-poolvss';

  // Extract address from contract identifier if it includes contract name
  const tokenAddress = tokenContract.includes('.') ? tokenContract.split('.')[0] : tokenContract;

  await callContract({
    contractAddress,
    contractName: 'staking-poolvss',
    functionName: 'create-pool',
    functionArgs: [
      standardPrincipalCV(tokenAddress),
      uintCV(riskProfile),
      uintCV(rewardRate),
      uintCV(minStake),
      uintCV(maxStakePerUser),
      uintCV(feePercent),
      uintCV(depositLockPeriod)
    ],
    onFinish,
    onCancel,
  });
};

// Admin: Create Vault
export const createVault = async (
  name: string,
  underlyingPoolId: number,
  tokenContract: string,
  minDeposit: bigint,
  managementFee: bigint,
  performanceFee: bigint,
  harvestReward: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.vault-compoundervss';

  // Extract address from contract identifier if it includes contract name
  const tokenAddress = tokenContract.includes('.') ? tokenContract.split('.')[0] : tokenContract;

  await callContract({
    contractAddress,
    contractName: 'vault-compoundervss',
    functionName: 'create-vault',
    functionArgs: [
      {
        type: 'ascii',
        value: name
      } as ClarityValue,
      uintCV(underlyingPoolId),
      standardPrincipalCV(tokenAddress),
      uintCV(minDeposit),
      uintCV(managementFee),
      uintCV(performanceFee),
      uintCV(harvestReward)
    ],
    onFinish,
    onCancel,
  });
};

// Admin: Set Reward Token
export const setRewardToken = async (
  tokenContract: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.rewards-distributorvss';

  // Extract address from contract identifier if it includes contract name
  const tokenAddress = tokenContract.includes('.') ? tokenContract.split('.')[0] : tokenContract;

  await callContract({
    contractAddress,
    contractName: 'rewards-distributorvss',
    functionName: 'set-reward-token',
    functionArgs: [
      standardPrincipalCV(tokenAddress)
    ],
    onFinish,
    onCancel,
  });
};

// Admin: Fund Rewards
export const fundRewards = async (
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.rewards-distributorvss';

  await callContract({
    contractAddress,
    contractName: 'rewards-distributorvss',
    functionName: 'fund-rewards',
    functionArgs: [
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};

// Admin: Set Pool Reward Rate
export const setPoolRewardRate = async (
  poolId: number,
  rewardRate: bigint,
  allocationWeight: number,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.rewards-distributorvs';

  await callContract({
    contractAddress,
    contractName: 'rewards-distributorvss',
    functionName: 'set-pool-reward-rate',
    functionArgs: [
      uintCV(poolId),
      uintCV(rewardRate),
      uintCV(allocationWeight)
    ],
    onFinish,
    onCancel,
  });
};

// Admin: Authorize Distributor
export const authorizeDistributor = async (
  distributorContract: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.rewards-distributorvss';

  // Extract address from contract identifier if it includes contract name
  const distributorAddress = distributorContract.includes('.') ? distributorContract.split('.')[0] : distributorContract;

  await callContract({
    contractAddress,
    contractName: 'rewards-distributorvss',
    functionName: 'authorize-distributor',
    functionArgs: [
      standardPrincipalCV(distributorAddress)
    ],
    onFinish,
    onCancel,
  });
};

// Admin: Mint sBTC (for testing)
export const mintSBTC = async (
  amount: bigint,
  recipient: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_SBTC_TOKEN_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betavss';

  await callContract({
    contractAddress,
    contractName: 'sbtc-token-betavss',
    functionName: 'mint',
    functionArgs: [
      uintCV(amount),
      standardPrincipalCV(recipient)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Create Retirement Fund (sBTC-based with APY)
export const createRetirementFund = async (
  initialDeposit: bigint,
  lockDurationYears: number,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss';

  await callContract({
    contractAddress,
    contractName: 'retirement-fundvss',
    functionName: 'create-retirement-fund',
    functionArgs: [
      uintCV(initialDeposit),
      uintCV(lockDurationYears)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Contribute to Retirement Fund
export const contributeToRetirementFund = async (
  fundId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss';

  await callContract({
    contractAddress,
    contractName: 'retirement-fundvss',
    functionName: 'contribute',
    functionArgs: [
      uintCV(fundId),
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Withdraw from Retirement Fund
// FutureFund: Withdraw from Retirement Fund (After unlock, no fee)
export const withdrawFromRetirementFund = async (
  fundId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss';

  await callContract({
    contractAddress,
    contractName: 'retirement-fundvss',
    functionName: 'withdraw',
    functionArgs: [
      uintCV(fundId),
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Early Withdraw from Retirement Fund (Before unlock, with fee)
export const withdrawEarlyFromRetirementFund = async (
  fundId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvssv';

  await callContract({
    contractAddress,
    contractName: 'retirement-fundvss',
    functionName: 'withdraw-early',
    functionArgs: [
      uintCV(fundId),
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Create Education Fund (sBTC-based with APY)
export const createEducationFund = async (
  initialDeposit: bigint,
  guardian: string,
  lockDurationYears: number,
  goalAmount: bigint,
  fundName: string,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_EDUCATION_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss';

  // Import stringAsciiCV dynamically
  const { stringAsciiCV } = await import('@stacks/transactions');

  await callContract({
    contractAddress,
    contractName: 'education-fundvss',
    functionName: 'create-education-fund',
    functionArgs: [
      uintCV(initialDeposit),
      standardPrincipalCV(guardian),
      uintCV(lockDurationYears),
      uintCV(goalAmount),
      stringAsciiCV(fundName)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Contribute to Education Fund
export const contributeToEducationFund = async (
  fundId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_EDUCATION_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss';

  await callContract({
    contractAddress,
    contractName: 'education-fundvss',
    functionName: 'contribute',
    functionArgs: [
      uintCV(fundId),
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Early Withdraw from Education Fund (Creator or Guardian, with fee)
export const withdrawEarlyFromEducationFund = async (
  fundId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_EDUCATION_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss';

  await callContract({
    contractAddress,
    contractName: 'education-fundvss',
    functionName: 'withdraw-early',
    functionArgs: [
      uintCV(fundId),
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Guardian Withdraw from Education Fund (After unlock, no fee)
export const guardianWithdrawEducationFund = async (
  fundId: number,
  amount: bigint,
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = process.env.NEXT_PUBLIC_EDUCATION_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss';

  await callContract({
    contractAddress,
    contractName: 'education-fundvss',
    functionName: 'guardian-withdraw',
    functionArgs: [
      uintCV(fundId),
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Claim Rewards from Fund
export const claimFundRewards = async (
  fundId: number,
  contractType: 'retirement' | 'education',
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = contractType === 'retirement'
    ? process.env.NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss'
    : process.env.NEXT_PUBLIC_EDUCATION_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss';

  await callContract({
    contractAddress,
    contractName: contractType === 'retirement' ? 'retirement-fundvss' : 'education-fundvss',
    functionName: 'claim-rewards',
    functionArgs: [
      uintCV(fundId)
    ],
    onFinish,
    onCancel,
  });
};

// FutureFund: Early Withdrawal with Fee
export const withdrawEarly = async (
  fundId: number,
  amount: bigint,
  contractType: 'retirement' | 'education',
  onFinish?: (data: FinishedTxData) => void,
  onCancel?: () => void
) => {
  const contractAddress = contractType === 'retirement'
    ? process.env.NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss'
    : process.env.NEXT_PUBLIC_EDUCATION_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss';

  await callContract({
    contractAddress,
    contractName: contractType === 'retirement' ? 'retirement-fundvss' : 'education-fundvss',
    functionName: 'withdraw-early',
    functionArgs: [
      uintCV(fundId),
      uintCV(amount)
    ],
    onFinish,
    onCancel,
  });
};
