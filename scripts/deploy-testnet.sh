#!/bin/bash

# sBTC Yield Farming - Testnet Deployment Script
# This script deploys all contracts to Stacks testnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="testnet"
CONTRACTS_DIR="contracts"
SETTINGS_DIR="settings"

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  sBTC Yield Farming - Testnet Deployment${NC}"
echo -e "${BLUE}===========================================${NC}"
echo

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Please set your testnet private key:${NC}"
    echo "export PRIVATE_KEY=\"your_testnet_private_key_here\""
    exit 1
fi

# Check if Clarinet is installed
if ! command -v clarinet &> /dev/null; then
    echo -e "${RED}Error: Clarinet is not installed${NC}"
    echo -e "${YELLOW}Please install Clarinet: https://github.com/hirosystems/clarinet${NC}"
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "Clarinet.toml" ]; then
    echo -e "${RED}Error: Clarinet.toml not found${NC}"
    echo -e "${YELLOW}Please run this script from the project root directory${NC}"
    exit 1
fi

# Create settings directory if it doesn't exist
mkdir -p "$SETTINGS_DIR"

# Create testnet settings file
cat > "$SETTINGS_DIR/Testnet.toml" << EOF
[network]
name = "testnet"
stacks_node_rpc_address = "https://api.testnet.hiro.so"
deployment_fee_rate = 10

[accounts.deployer]
mnemonic = "\$PRIVATE_KEY"
balance = 100000000000000

[[network.accounts]]
address = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
balance = 100000000000000
EOF

echo -e "${GREEN}✓ Created testnet configuration${NC}"

# Deploy contracts in order
echo -e "${BLUE}Starting contract deployment...${NC}"
echo

# 1. Deploy sBTC Token
echo -e "${YELLOW}Deploying sBTC Token...${NC}"
clarinet deployments apply --network=testnet --contracts sbtc-token || {
    echo -e "${RED}Failed to deploy sbtc-token${NC}"
    exit 1
}
echo -e "${GREEN}✓ sBTC Token deployed${NC}"
echo

# 2. Deploy Rewards Distributor
echo -e "${YELLOW}Deploying Rewards Distributor...${NC}"
clarinet deployments apply --network=testnet --contracts rewards-distributor || {
    echo -e "${RED}Failed to deploy rewards-distributor${NC}"
    exit 1
}
echo -e "${GREEN}✓ Rewards Distributor deployed${NC}"
echo

# 3. Deploy Staking Pool
echo -e "${YELLOW}Deploying Staking Pool...${NC}"
clarinet deployments apply --network=testnet --contracts staking-pool || {
    echo -e "${RED}Failed to deploy staking-pool${NC}"
    exit 1
}
echo -e "${GREEN}✓ Staking Pool deployed${NC}"
echo

# 4. Deploy Vault Compounder
echo -e "${YELLOW}Deploying Vault Compounder...${NC}"
clarinet deployments apply --network=testnet --contracts vault-compounder || {
    echo -e "${RED}Failed to deploy vault-compounder${NC}"
    exit 1
}
echo -e "${GREEN}✓ Vault Compounder deployed${NC}"
echo

# Get deployer address from private key
DEPLOYER_ADDRESS=$(clarinet accounts list | grep -A1 "deployer" | grep "address" | cut -d'"' -f4)

if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo -e "${YELLOW}Warning: Could not determine deployer address${NC}"
    DEPLOYER_ADDRESS="ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
fi

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}Deployment completed successfully!${NC}"
echo -e "${BLUE}===========================================${NC}"
echo
echo -e "${YELLOW}Contract Addresses:${NC}"
echo "Deployer: $DEPLOYER_ADDRESS"
echo "sBTC Token: $DEPLOYER_ADDRESS.sbtc-token"
echo "Rewards Distributor: $DEPLOYER_ADDRESS.rewards-distributor"
echo "Staking Pool: $DEPLOYER_ADDRESS.staking-pool"
echo "Vault Compounder: $DEPLOYER_ADDRESS.vault-compounder"
echo
echo -e "${YELLOW}Next Steps:${NC}"
echo "1. Update frontend/.env.local with the contract addresses above"
echo "2. Set up initial pools and vaults using the admin functions"
echo "3. Fund the rewards distributor with tokens"
echo
echo -e "${YELLOW}Frontend Configuration:${NC}"
echo "Copy the following to your frontend/.env.local file:"
echo
cat << EOF
NEXT_PUBLIC_NETWORK=testnet
NEXT_PUBLIC_STACKS_API_URL=https://api.testnet.hiro.so
NEXT_PUBLIC_SBTC_TOKEN_CONTRACT=$DEPLOYER_ADDRESS.sbtc-token
NEXT_PUBLIC_STAKING_POOL_CONTRACT=$DEPLOYER_ADDRESS.staking-pool
NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT=$DEPLOYER_ADDRESS.vault-compounder
NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT=$DEPLOYER_ADDRESS.rewards-distributor
EOF
echo
echo -e "${YELLOW}Explorer Links:${NC}"
echo "sBTC Token: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.sbtc-token?chain=testnet"
echo "Staking Pool: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.staking-pool?chain=testnet"
echo "Vault Compounder: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.vault-compounder?chain=testnet"
echo "Rewards Distributor: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.rewards-distributor?chain=testnet"
echo
echo -e "${GREEN}Deployment script completed!${NC}"
