#!/bin/bash

# sBTC Yield Farming - Pool Setup Script
# This script creates the initial pools and vaults after deployment

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK=${1:-"testnet"}

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  sBTC Yield Farming - Pool Setup${NC}"
echo -e "${BLUE}===========================================${NC}"
echo

if [ "$NETWORK" != "testnet" ] && [ "$NETWORK" != "mainnet" ]; then
    echo -e "${RED}Error: Network must be 'testnet' or 'mainnet'${NC}"
    echo "Usage: ./setup-pools.sh [testnet|mainnet]"
    exit 1
fi

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Please set your private key:${NC}"
    echo "export PRIVATE_KEY=\"your_private_key_here\""
    exit 1
fi

# Get deployer address
DEPLOYER_ADDRESS=$(clarinet accounts list | grep -A1 "deployer" | grep "address" | cut -d'"' -f4)

if [ -z "$DEPLOYER_ADDRESS" ]; then
    if [ "$NETWORK" = "mainnet" ]; then
        DEPLOYER_ADDRESS="SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
    else
        DEPLOYER_ADDRESS="ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5"
    fi
fi

echo -e "${YELLOW}Setting up pools on $NETWORK...${NC}"
echo "Deployer: $DEPLOYER_ADDRESS"
echo

# Pool configurations based on README specifications
echo -e "${BLUE}Creating Conservative Pool...${NC}"
# Conservative: 5% APR, 7 days lock, 0.01-1000 sBTC, 1% fee
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.staking-poolv2v2' create-pool
  '$DEPLOYER_ADDRESS.sbtc-tokenv2v2'
  u1  ;; Conservative risk profile
  u500000000  ;; 5% reward rate (5 * 1e8)
  u1000000    ;; 0.01 sBTC min stake (0.01 * 1e8)
  u100000000000  ;; 1000 sBTC max stake (1000 * 1e8)
  u10000      ;; 1% fee (1 * 1e4)
  u1008       ;; 7 days lock period (7 * 144 blocks)
)
EOF

echo -e "${GREEN}✓ Conservative Pool created${NC}"

echo -e "${BLUE}Creating Moderate Pool...${NC}"
# Moderate: 8% APR, 14 days lock, 0.05-500 sBTC, 2% fee
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.staking-poolv2v2' create-pool
  '$DEPLOYER_ADDRESS.sbtc-tokenv2v2'
  u2  ;; Moderate risk profile
  u800000000  ;; 8% reward rate (8 * 1e8)
  u5000000    ;; 0.05 sBTC min stake (0.05 * 1e8)
  u50000000000   ;; 500 sBTC max stake (500 * 1e8)
  u20000      ;; 2% fee (2 * 1e4)
  u2016       ;; 14 days lock period (14 * 144 blocks)
)
EOF

echo -e "${GREEN}✓ Moderate Pool created${NC}"

echo -e "${BLUE}Creating Aggressive Pool...${NC}"
# Aggressive: 15% APR, 30 days lock, 0.1-100 sBTC, 5% fee
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.staking-poolv2v2' create-pool
  '$DEPLOYER_ADDRESS.sbtc-tokenv2v2'
  u3  ;; Aggressive risk profile
  u1500000000 ;; 15% reward rate (15 * 1e8)
  u10000000   ;; 0.1 sBTC min stake (0.1 * 1e8)
  u10000000000   ;; 100 sBTC max stake (100 * 1e8)
  u50000      ;; 5% fee (5 * 1e4)
  u4320       ;; 30 days lock period (30 * 144 blocks)
)
EOF

echo -e "${GREEN}✓ Aggressive Pool created${NC}"

echo -e "${BLUE}Setting up Rewards Distributor...${NC}"

# Set reward token
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.rewards-distributorv2' set-reward-token '$DEPLOYER_ADDRESS.sbtc-tokenv2')
EOF

# Configure pool reward rates
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.rewards-distributorv2' set-pool-reward-rate u1 u500000000 u30)
(contract-call? '$DEPLOYER_ADDRESS.rewards-distributorv2' set-pool-reward-rate u2 u800000000 u40)
(contract-call? '$DEPLOYER_ADDRESS.rewards-distributorv2' set-pool-reward-rate u3 u1500000000 u30)
EOF

# Authorize staking pool as distributor
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.rewards-distributorv2' authorize-distributor '$DEPLOYER_ADDRESS.staking-poolv2')
EOF

echo -e "${GREEN}✓ Rewards Distributor configured${NC}"

echo -e "${BLUE}Setting up Staking Pool connections...${NC}"

# Set contracts in staking pool
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.staking-poolv2' set-sbtc-token-contract '$DEPLOYER_ADDRESS.sbtc-tokenv2')
(contract-call? '$DEPLOYER_ADDRESS.staking-poolv2' set-rewards-distributor-contract '$DEPLOYER_ADDRESS.rewards-distributorv2')
EOF

echo -e "${GREEN}✓ Staking Pool configured${NC}"

echo -e "${BLUE}Creating Auto-Compound Vaults...${NC}"

# Set contracts in vault compounder
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.vault-compounderv2' set-staking-pool-contract '$DEPLOYER_ADDRESS.staking-poolv2')
(contract-call? '$DEPLOYER_ADDRESS.vault-compounderv2' set-rewards-distributor-contract '$DEPLOYER_ADDRESS.rewards-distributorv2')
EOF

# Create Conservative Vault
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.vault-compounderv2' create-vault
  "Conservative Auto-Compound"
  u1  ;; Underlying pool 1 (Conservative)
  '$DEPLOYER_ADDRESS.sbtc-tokenv2'
  u1000000    ;; 0.01 sBTC min deposit
  u200000     ;; 2% management fee (2% * 1e6)
  u10000000   ;; 10% performance fee (10% * 1e6)
  u100000000  ;; 1 sBTC harvest reward
)
EOF

# Create Moderate Vault
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.vault-compounderv2' create-vault
  "Moderate Auto-Compound"
  u2  ;; Underlying pool 2 (Moderate)
  '$DEPLOYER_ADDRESS.sbtc-tokenv2'
  u5000000    ;; 0.05 sBTC min deposit
  u250000     ;; 2.5% management fee
  u15000000   ;; 15% performance fee
  u200000000  ;; 2 sBTC harvest reward
)
EOF

# Create Aggressive Vault
clarinet console --network=$NETWORK << EOF
(contract-call? '$DEPLOYER_ADDRESS.vault-compounderv2' create-vault
  "Aggressive Auto-Compound"
  u3  ;; Underlying pool 3 (Aggressive)
  '$DEPLOYER_ADDRESS.sbtc-tokenv2'
  u10000000   ;; 0.1 sBTC min deposit
  u300000     ;; 3% management fee
  u20000000   ;; 20% performance fee
  u500000000  ;; 5 sBTC harvest reward
)
EOF

echo -e "${GREEN}✓ Auto-Compound Vaults created${NC}"

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}Pool setup completed successfully!${NC}"
echo -e "${BLUE}===========================================${NC}"
echo
echo -e "${YELLOW}Created Pools:${NC}"
echo "1. Conservative Pool - 5% APR, 7 days lock, 1% fee"
echo "2. Moderate Pool - 8% APR, 14 days lock, 2% fee"
echo "3. Aggressive Pool - 15% APR, 30 days lock, 5% fee"
echo
echo -e "${YELLOW}Created Vaults:${NC}"
echo "1. Conservative Auto-Compound Vault"
echo "2. Moderate Auto-Compound Vault"
echo "3. Aggressive Auto-Compound Vault"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Fund the rewards distributor with sBTC tokens"
echo "2. Test deposits and withdrawals with small amounts"
echo "3. Monitor pool performance and adjust parameters if needed"
echo "4. Set up frontend with the pool and vault IDs"
echo
echo -e "${GREEN}Setup script completed!${NC}"
