// Network configuration - use dynamic import to avoid SSR issues
export const getNetwork = async () => {
  const { STACKS_MAINNET, STACKS_TESTNET } = await import('@stacks/network');
  return process.env.NEXT_PUBLIC_NETWORK === 'mainnet'
    ? STACKS_MAINNET
    : STACKS_TESTNET;
};

export const STACKS_API_URL = process.env.NEXT_PUBLIC_STACKS_API_URL || 'https://api.testnet.hiro.so';

// Contract addresses
export const CONTRACTS = {
  SBTC_TOKEN: process.env.NEXT_PUBLIC_SBTC_TOKEN_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betavss',
  STAKING_POOL: process.env.NEXT_PUBLIC_STAKING_POOL_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.staking-poolvss',
  VAULT_COMPOUNDER: process.env.NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.vault-compoundervss',
  REWARDS_DISTRIBUTOR: process.env.NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.rewards-distributorvss',
  RETIREMENT_FUND: process.env.NEXT_PUBLIC_RETIREMENT_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss',
  EDUCATION_FUND: process.env.NEXT_PUBLIC_EDUCATION_FUND_CONTRACT || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss',
};

// App configuration
export const APP_CONFIG = {
  NAME: process.env.NEXT_PUBLIC_APP_NAME || 'StackPulseFi',
  DESCRIPTION: process.env.NEXT_PUBLIC_APP_DESCRIPTION || 'StackPulseFi - Next-generation DeFi platform on Stacks blockchain',
};

// Pool risk profiles
export const RISK_PROFILES = {
  CONSERVATIVE: 1,
  MODERATE: 2,
  AGGRESSIVE: 3,
} as const;

export const RISK_PROFILE_NAMES = {
  [RISK_PROFILES.CONSERVATIVE]: 'Conservative',
  [RISK_PROFILES.MODERATE]: 'Moderate',
  [RISK_PROFILES.AGGRESSIVE]: 'Aggressive',
} as const;

// Scaling factors (matching contract constants)
export const SCALING_FACTOR = 100000000; // 1e8
export const FEE_SCALE = 1000000; // 1e6
export const SHARE_PRECISION = 1000000; // 1e6

// Utility functions
export const formatSBTC = (amount: number | bigint): string => {
  const value = Number(amount) / SCALING_FACTOR;
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
};

export const parseSBTC = (amount: string): bigint => {
  const value = parseFloat(amount) * SCALING_FACTOR;
  return BigInt(Math.floor(value));
};

export const formatPercentage = (rate: number | bigint): string => {
  const value = Number(rate) / SCALING_FACTOR;
  return `${value.toFixed(2)}%`;
};

export const formatFee = (fee: number | bigint): string => {
  const value = Number(fee) / FEE_SCALE * 100;
  return `${value.toFixed(2)}%`;
};
