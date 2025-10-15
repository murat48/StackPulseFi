#!/bin/bash

# sBTC Yield Farming - Mainnet Deployment Script
# This script deploys all contracts to Stacks mainnet

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
NETWORK="mainnet"
CONTRACTS_DIR="contracts"
SETTINGS_DIR="settings"

echo -e "${RED}⚠️  WARNING: MAINNET DEPLOYMENT ⚠️${NC}"
echo -e "${RED}This will deploy contracts to Stacks mainnet using real STX!${NC}"
echo -e "${YELLOW}Make sure you have:${NC}"
echo "1. Thoroughly tested all contracts on testnet"
echo "2. Completed security audits"
echo "3. Set up multi-signature admin controls"
echo "4. Documented emergency procedures"
echo

read -p "Are you sure you want to proceed? (type 'yes' to continue): " confirm
if [ "$confirm" != "yes" ]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}  sBTC Yield Farming - Mainnet Deployment${NC}"
echo -e "${BLUE}===========================================${NC}"
echo

# Check if private key is set
if [ -z "$PRIVATE_KEY" ]; then
    echo -e "${RED}Error: PRIVATE_KEY environment variable is not set${NC}"
    echo -e "${YELLOW}Please set your mainnet private key:${NC}"
    echo "export PRIVATE_KEY=\"your_mainnet_private_key_here\""
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

# Create mainnet settings file
cat > "$SETTINGS_DIR/Mainnet.toml" << EOF
[network]
name = "mainnet"
stacks_node_rpc_address = "https://api.hiro.so"
deployment_fee_rate = 1

[accounts.deployer]
mnemonic = "\$PRIVATE_KEY"
balance = 100000000000

[[network.accounts]]
address = "SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
balance = 100000000000
EOF

echo -e "${GREEN}✓ Created mainnet configuration${NC}"

# Final confirmation
echo -e "${RED}FINAL WARNING: This will use real STX for deployment fees!${NC}"
read -p "Type 'DEPLOY_TO_MAINNET' to proceed: " final_confirm
if [ "$final_confirm" != "DEPLOY_TO_MAINNET" ]; then
    echo -e "${YELLOW}Deployment cancelled.${NC}"
    exit 0
fi

# Deploy contracts in order
echo -e "${BLUE}Starting mainnet contract deployment...${NC}"
echo

# 1. Deploy sBTC Token (or use existing sBTC contract)
echo -e "${YELLOW}Deploying sBTC Token...${NC}"
echo -e "${RED}Note: In production, you should use the official sBTC contract address${NC}"
clarinet deployments apply --network=mainnet --contracts sbtc-token || {
    echo -e "${RED}Failed to deploy sbtc-token${NC}"
    exit 1
}
echo -e "${GREEN}✓ sBTC Token deployed${NC}"
echo

# 2. Deploy Rewards Distributor
echo -e "${YELLOW}Deploying Rewards Distributor...${NC}"
clarinet deployments apply --network=mainnet --contracts rewards-distributor || {
    echo -e "${RED}Failed to deploy rewards-distributor${NC}"
    exit 1
}
echo -e "${GREEN}✓ Rewards Distributor deployed${NC}"
echo

# 3. Deploy Staking Pool
echo -e "${YELLOW}Deploying Staking Pool...${NC}"
clarinet deployments apply --network=mainnet --contracts staking-pool || {
    echo -e "${RED}Failed to deploy staking-pool${NC}"
    exit 1
}
echo -e "${GREEN}✓ Staking Pool deployed${NC}"
echo

# 4. Deploy Vault Compounder
echo -e "${YELLOW}Deploying Vault Compounder...${NC}"
clarinet deployments apply --network=mainnet --contracts vault-compounder || {
    echo -e "${RED}Failed to deploy vault-compounder${NC}"
    exit 1
}
echo -e "${GREEN}✓ Vault Compounder deployed${NC}"
echo

# Get deployer address from private key
DEPLOYER_ADDRESS=$(clarinet accounts list | grep -A1 "deployer" | grep "address" | cut -d'"' -f4)

if [ -z "$DEPLOYER_ADDRESS" ]; then
    echo -e "${YELLOW}Warning: Could not determine deployer address${NC}"
    DEPLOYER_ADDRESS="SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
fi

echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}MAINNET DEPLOYMENT COMPLETED!${NC}"
echo -e "${BLUE}===========================================${NC}"
echo
echo -e "${YELLOW}Contract Addresses:${NC}"
echo "Deployer: $DEPLOYER_ADDRESS"
echo "sBTC Token: $DEPLOYER_ADDRESS.sbtc-token"
echo "Rewards Distributor: $DEPLOYER_ADDRESS.rewards-distributor"
echo "Staking Pool: $DEPLOYER_ADDRESS.staking-pool"
echo "Vault Compounder: $DEPLOYER_ADDRESS.vault-compounder"
echo
echo -e "${RED}CRITICAL POST-DEPLOYMENT STEPS:${NC}"
echo "1. 🔒 IMMEDIATELY set up multi-signature controls for admin functions"
echo "2. 🔍 Verify all contract addresses on Stacks Explorer"
echo "3. 📋 Update frontend configuration with mainnet addresses"
echo "4. 🧪 Test all functions with small amounts first"
echo "5. 📊 Set up monitoring and alerts"
echo "6. 🚨 Prepare emergency response procedures"
echo
echo -e "${YELLOW}Frontend Configuration:${NC}"
echo "Update your frontend/.env.local file:"
echo
cat << EOF
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_STACKS_API_URL=https://api.hiro.so
NEXT_PUBLIC_SBTC_TOKEN_CONTRACT=$DEPLOYER_ADDRESS.sbtc-token
NEXT_PUBLIC_STAKING_POOL_CONTRACT=$DEPLOYER_ADDRESS.staking-pool
NEXT_PUBLIC_VAULT_COMPOUNDER_CONTRACT=$DEPLOYER_ADDRESS.vault-compounder
NEXT_PUBLIC_REWARDS_DISTRIBUTOR_CONTRACT=$DEPLOYER_ADDRESS.rewards-distributor
EOF
echo
echo -e "${YELLOW}Explorer Links (Mainnet):${NC}"
echo "sBTC Token: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.sbtc-token?chain=mainnet"
echo "Staking Pool: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.staking-pool?chain=mainnet"
echo "Vault Compounder: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.vault-compounder?chain=mainnet"
echo "Rewards Distributor: https://explorer.stacks.co/address/$DEPLOYER_ADDRESS.rewards-distributor?chain=mainnet"
echo
echo -e "${GREEN}Mainnet deployment completed successfully!${NC}"
echo -e "${RED}Remember to secure your admin keys and set up proper governance!${NC}"
