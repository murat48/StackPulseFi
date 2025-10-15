import { STACKS_API_URL, CONTRACTS } from './config';
import {
  cvToJSON,
  hexToCV,
  cvToHex,
  uintCV,
  principalCV,
  stringUtf8CV,
  stringAsciiCV,
  bufferCV,
  noneCV,
  someCV,
  ClarityValue
} from '@stacks/transactions';

// Simple cache interface
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// API client for reading contract data
class StacksApi {
  private baseUrl: string;
  private maxRetries: number = 5; // Increased from 3 to 5
  private retryDelay: number = 3000; // Start with 3 seconds (increased from 2)
  private timeout: number = 120000; // 120 seconds timeout (increased from 60)
  private cache: Map<string, CacheEntry<any>> = new Map();
  private cacheTTL: number = 30000; // 30 seconds cache (increased from 10)
  private contractsAvailable: Map<string, boolean> = new Map(); // Track which contracts are available

  constructor(baseUrl: string = STACKS_API_URL) {
    this.baseUrl = baseUrl;
  }

  // Get cached data if available and not expired
  private getCached<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (entry && Date.now() - entry.timestamp < this.cacheTTL) {
      return entry.data;
    }
    return null;
  }

  // Set cache data
  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  // Helper function to retry API calls with exponential backoff
  private async retryWithBackoff<T>(
    fn: () => Promise<T>,
    retries: number = this.maxRetries
  ): Promise<T> {
    // Only run in browser
    if (typeof window === 'undefined') {
      throw new Error('API calls must be made from the browser');
    }

    try {
      return await fn();
    } catch (error: any) {
      if (retries > 0 && (error.name === 'AbortError' || error.message?.includes('fetch') || error.message?.includes('Failed to fetch'))) {
        // Exponential backoff: 3s, 6s, 12s, 24s, 48s
        const attemptNumber = this.maxRetries - retries + 1;
        const delay = this.retryDelay * Math.pow(2, attemptNumber - 1);
        console.log(`⏳ Retrying API call in ${(delay / 1000).toFixed(1)}s... (attempt ${attemptNumber}/${this.maxRetries})`);
        console.log(`   Error: ${error.message || 'Unknown'}`);
        await new Promise(resolve => setTimeout(resolve, delay));
        return this.retryWithBackoff(fn, retries - 1);
      }
      console.error(`❌ All retry attempts exhausted. Final error:`, error.message || error);
      throw error;
    }
  }

  // Generic function to call read-only contract functions
  async callReadOnlyFunction(
    contractAddress: string,
    contractName: string,
    functionName: string,
    functionArgs: ClarityValue[] = [],
    sender?: string
  ) {
    const [address, name] = contractAddress.includes('.')
      ? contractAddress.split('.')
      : [contractAddress, contractName];

    // Check if we already know this contract is unavailable (but allow retries after some time)
    const contractKey = `${address}.${name}`;
    const contractStatus = this.contractsAvailable.get(contractKey);
    if (contractStatus === false) {
      // Don't completely block, just log a warning and try anyway
      console.warn(`⚠️ Contract ${contractKey} was previously unavailable, attempting anyway...`);
    }

    const url = `${this.baseUrl}/v2/contracts/call-read/${address}/${name}/${functionName}`;

    const body = {
      sender: sender || address,
      arguments: functionArgs.map(arg => cvToHex(arg)),
    };

    return this.retryWithBackoff(async () => {
      try {
        console.log(`[API] 📡 Calling ${name}.${functionName}...`);
        const startTime = Date.now();

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          console.log(`[API] ⏱️ Request timeout (${this.timeout / 1000}s) for ${name}.${functionName}`);
          controller.abort();
        }, this.timeout);

        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);
        const elapsed = Date.now() - startTime;
        console.log(`[API] ⚡ Response received in ${elapsed}ms for ${name}.${functionName}`);

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`[API] ❌ Call failed for ${name}.${functionName}: ${response.status} ${response.statusText}`);
          throw new Error(`API call failed: ${response.status} ${response.statusText}. Response: ${errorText}`);
        }

        const data = await response.json();

        if (data.okay) {
          const cv = hexToCV(data.result);

          // Manual parsing for better control
          let result;

          // Helper function to parse tuple data
          const parseTupleData = (tupleData: any) => {
            const parsedData: any = {};
            for (const [key, value] of Object.entries(tupleData)) {
              const valueAny = value as any;
              if (valueAny.type === 'true') {
                parsedData[key] = true;
              } else if (valueAny.type === 'false') {
                parsedData[key] = false;
              } else if (valueAny.type === 'uint') {
                parsedData[key] = Number(valueAny.value);
              } else if (valueAny.type === 'int') {
                parsedData[key] = Number(valueAny.value);
              } else if (valueAny.type === 'address') {
                parsedData[key] = valueAny.value;
              } else if (valueAny.type === 'principal' || valueAny.type === 'contract') {
                parsedData[key] = valueAny.value;
              } else {
                // For other types, try to get value safely
                parsedData[key] = valueAny.value || value;
              }
            }
            return parsedData;
          };

          if (cv.type === 'some' && cv.value && cv.value.type === 'tuple') {
            // Optional tuple
            const parsedData = parseTupleData(cv.value.value);
            result = { value: parsedData };
          } else if (cv.type === 'tuple') {
            // Direct tuple (not optional) - use 'data' or 'value' property
            const tupleCV = cv as any;
            const tupleData = tupleCV.data || tupleCV.value;
            if (tupleData) {
              const parsedData = parseTupleData(tupleData);
              result = { value: parsedData };
            } else {
              result = cvToJSON(cv);
            }
          } else {
            result = cvToJSON(cv);
          }

          // Mark contract as available on successful call
          const contractKey = `${address}.${name}`;
          if (this.contractsAvailable.get(contractKey) === false) {
            console.log(`✅ Contract ${contractKey} is now available`);
          }
          this.contractsAvailable.set(contractKey, true);

          return result;
        } else {
          // Mark contract as unavailable if it's not found
          if (data.cause?.includes('no_such_contract') || data.cause?.includes('not found')) {
            const contractKey = `${address}.${name}`;
            this.contractsAvailable.set(contractKey, false);
            console.warn(`❌ Contract ${contractKey} marked as unavailable`);
          }
          throw new Error(`Contract call failed: ${data.cause}`);
        }
      } catch (error: any) {
        if (error.name === 'AbortError') {
          console.warn(`API timeout for ${name}.${functionName}:`, url);
        } else {
          console.warn(`API error for ${name}.${functionName}:`, error.message || error);
          // Don't mark as unavailable for network errors - only for contract not found
        }
        throw error; // Re-throw to trigger retry
      }
    });
  }

  // sBTC Token functions
  async getSBTCBalance(address: string) {
    console.log(`Fetching sBTC balance for address: ${address}`);

    const result = await this.callReadOnlyFunction(
      CONTRACTS.SBTC_TOKEN,
      'sbtc-token-betavss',
      'get-balance',
      [principalCV(address)]
    );

    console.log(`sBTC balance result:`, result);
    console.log(`sBTC balance result.value:`, result?.value);
    console.log(`sBTC balance result.value type:`, typeof result?.value);

    // Handle different result formats
    if (result?.value) {
      if (typeof result.value === 'number') {
        console.log(`sBTC balance (number): ${result.value}`);
        return result.value;
      } else if (result.value.value !== undefined) {
        console.log(`sBTC balance (nested): ${result.value.value}`);
        return result.value.value;
      } else {
        console.log(`sBTC balance (direct): ${result.value}`);
        return result.value;
      }
    }

    console.log(`sBTC balance fallback: 0`);
    return 0;
  }

  async getSBTCTotalSupply() {
    const result = await this.callReadOnlyFunction(
      CONTRACTS.SBTC_TOKEN,
      'sbtc-token-betavss',
      'get-total-supply'
    );
    return result.value.value;
  }

  // Staking Pool functions
  async getPoolInfo(poolId: number) {
    const cacheKey = `pool-info-${poolId}`;
    const cached = this.getCached(cacheKey);
    if (cached !== null) return cached;

    const result = await this.callReadOnlyFunction(
      CONTRACTS.STAKING_POOL,
      'staking-poolvss',
      'get-pool-info',
      [uintCV(poolId)]
    );
    const data = result?.value || null;
    if (data) this.setCache(cacheKey, data);
    return data;
  }

  async getUserStakeInfo(poolId: number, userAddress: string) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.STAKING_POOL,
        'staking-poolvss',
        'get-user-info',
        [uintCV(poolId), principalCV(userAddress)]
      );
      return result?.value || null;
    } catch (error) {
      console.error('Error fetching user stake info:', error);
      return null;
    }
  }

  async getPendingRewards(poolId: number, userAddress: string) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.STAKING_POOL,
        'staking-poolvss',
        'get-pending-rewards',
        [uintCV(poolId), principalCV(userAddress)]
      );
      return result?.value?.value || 0;
    } catch (error) {
      console.error('Error fetching pending rewards:', error);
      return 0;
    }
  }

  async getPoolCount() {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.STAKING_POOL,
        'staking-poolvss',
        'get-pool-count'
      );
      return result?.value || 0;
    } catch (error) {
      console.error('Error fetching pool count:', error);
      return 0;
    }
  }

  // Vault Compounder functions
  async getVaultInfo(vaultId: number) {
    console.log(`Fetching vault info for vault ${vaultId}`);
    const result = await this.callReadOnlyFunction(
      CONTRACTS.VAULT_COMPOUNDER,
      'vault-compoundervss',
      'get-vault-info',
      [uintCV(vaultId)]
    );
    console.log(`Vault ${vaultId} API result:`, result);
    return result?.value || null;
  }

  async getUserVaultPosition(vaultId: number, userAddress: string) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.VAULT_COMPOUNDER,
        'vault-compoundervss',
        'get-user-position',
        [uintCV(vaultId), principalCV(userAddress)]
      );
      return result?.value || null;
    } catch (error) {
      console.error('Error fetching user vault position:', error);
      return null;
    }
  }

  async getVaultSharePrice(vaultId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.VAULT_COMPOUNDER,
        'vault-compoundervss',
        'calculate-share-price',
        [uintCV(vaultId)]
      );
      return result?.value?.value || 100000000; // Default to 1.0 (SCALING_FACTOR)
    } catch (error) {
      console.error('Error fetching vault share price:', error);
      return 100000000;
    }
  }

  async getUserVaultBalance(vaultId: number, userAddress: string) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.VAULT_COMPOUNDER,
        'vault-compoundervss',
        'get-user-balance',
        [uintCV(vaultId), principalCV(userAddress)]
      );
      return result?.value?.value || 0;
    } catch (error) {
      console.error('Error fetching user vault balance:', error);
      return 0;
    }
  }

  async getVaultCount() {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.VAULT_COMPOUNDER,
        'vault-compoundervss',
        'get-vault-count'
      );
      return result?.value || 0;
    } catch (error) {
      console.error('Error fetching vault count:', error);
      return 0;
    }
  }

  async isHarvestReady(vaultId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.VAULT_COMPOUNDER,
        'vault-compoundervss',
        'is-harvest-ready',
        [uintCV(vaultId)]
      );
      return result?.value || false;
    } catch (error) {
      console.error('Error checking harvest ready status:', error);
      return false;
    }
  }

  async getVaultPerformance(vaultId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.VAULT_COMPOUNDER,
        'vault-compoundervss',
        'get-vault-performance',
        [uintCV(vaultId)]
      );
      return result?.value || null;
    } catch (error) {
      console.error('Error fetching vault performance:', error);
      return null;
    }
  }

  // AI Chat Helper - Get comprehensive vault data for chat responses
  async getVaultDataForChat(vaultId: number, userAddress?: string) {
    try {
      const vaultInfo = await this.getVaultInfo(vaultId);

      if (!vaultInfo) {
        return null;
      }

      const performance = await this.getVaultPerformance(vaultId);
      const harvestReady = await this.isHarvestReady(vaultId);

      let userPosition = null;
      let userBalance = null;

      if (userAddress) {
        userPosition = await this.getUserVaultPosition(vaultId, userAddress);
        userBalance = await this.getUserVaultBalance(vaultId, userAddress);
      }

      return {
        vaultInfo,
        performance,
        harvestReady,
        userPosition,
        userBalance,
      };
    } catch (error) {
      console.error('Error fetching vault data for chat:', error);
      return null;
    }
  }

  // AI Chat Helper - Get all vaults summary
  async getAllVaultsForChat(userAddress?: string) {
    try {
      const vaultCount = await this.getVaultCount();
      const vaults = [];

      for (let i = 1; i <= vaultCount; i++) {
        const vaultData = await this.getVaultDataForChat(i, userAddress);
        if (vaultData) {
          vaults.push({
            vaultId: i,
            ...vaultData,
          });
        }
      }

      return vaults;
    } catch (error) {
      console.error('Error fetching all vaults for chat:', error);
      return [];
    }
  }

  // AI Chat Helper - Format vault info for natural language
  formatVaultInfoForChat(vaultData: any) {
    if (!vaultData || !vaultData.vaultInfo) {
      return "Vault bilgisi bulunamadı.";
    }

    const info = vaultData.vaultInfo;
    const perf = vaultData.performance;

    let response = `📊 **${info.name}** (Vault #${vaultData.vaultId})\n\n`;
    response += `🏦 **Toplam Varlıklar:** ${(info.totalAssets / 100000000).toFixed(4)} sBTC\n`;
    response += `📈 **Toplam Shares:** ${info.totalShares}\n`;
    response += `💰 **Minimum Deposit:** ${(info.minDeposit / 100000000).toFixed(4)} sBTC\n`;
    response += `📋 **Yönetim Ücreti:** ${(info.managementFee / 10000).toFixed(2)}%\n`;
    response += `⚡ **Performans Ücreti:** ${(info.performanceFee / 10000).toFixed(2)}%\n`;
    response += `${info.active ? '✅ Aktif' : '⏸️ Duraklatılmış'}\n\n`;

    if (perf) {
      response += `📊 **Performans:**\n`;
      response += `- Toplam Harvest: ${perf.totalHarvests}\n`;
      response += `- Toplam Ödül: ${(perf.totalRewardsCompounded / 100000000).toFixed(4)} sBTC\n`;
      response += `- Toplanan Ücret: ${(perf.totalFeesCollected / 100000000).toFixed(4)} sBTC\n\n`;
    }

    if (vaultData.userPosition && vaultData.userPosition.shares > 0) {
      response += `👤 **Pozisyonunuz:**\n`;
      response += `- Shares: ${vaultData.userPosition.shares}\n`;
      response += `- Bakiye: ${(vaultData.userBalance / 100000000).toFixed(4)} sBTC\n`;
      response += `- Toplam Yatırım: ${(vaultData.userPosition.totalDeposited / 100000000).toFixed(4)} sBTC\n`;
      response += `- Toplam Çekim: ${(vaultData.userPosition.totalWithdrawn / 100000000).toFixed(4)} sBTC\n`;
    }

    if (vaultData.harvestReady) {
      response += `\n🌾 **Harvest hazır!** Ödülleri toplamak için harvest çağırabilirsiniz.`;
    }

    return response;
  }

  // Rewards Distributor functions
  async getTotalRewardFunds() {
    const result = await this.callReadOnlyFunction(
      CONTRACTS.REWARDS_DISTRIBUTOR,
      'rewards-distributorvss',
      'get-total-reward-funds'
    );
    return result.value;
  }

  async getPoolRewardConfig(poolId: number) {
    const result = await this.callReadOnlyFunction(
      CONTRACTS.REWARDS_DISTRIBUTOR,
      'rewards-distributorvss',
      'get-pool-reward-config',
      [uintCV(poolId)]
    );
    return result.value;
  }

  async calculateUserRewards(poolId: number, userStake: bigint, blocks: number) {
    const result = await this.callReadOnlyFunction(
      CONTRACTS.REWARDS_DISTRIBUTOR,
      'rewards-distributorvss',
      'calculate-user-rewards',
      [uintCV(poolId), uintCV(userStake), uintCV(blocks)]
    );
    return result.value.value;
  }

  // Transaction status
  async getTransactionStatus(txId: string) {
    const url = `${this.baseUrl}/extended/v1/tx/${txId}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Transaction status check failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Transaction status error:', error);
      throw error;
    }
  }

  // Account info
  async getAccountInfo(address: string) {
    const url = `${this.baseUrl}/v2/accounts/${address}`;

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Account info fetch failed: ${response.statusText}`);
      }
      return await response.json();
    } catch (error) {
      console.error('Account info error:', error);
      throw error;
    }
  }

  // Get current block height
  async getCurrentBlockHeight(): Promise<number> {
    // Only run in browser
    if (typeof window === 'undefined') {
      console.log('[API] getCurrentBlockHeight called on server, returning 0');
      return 0;
    }

    const url = `${this.baseUrl}/v2/info`;
    try {
      // Try fetch first
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          cache: 'no-cache',
          mode: 'cors'
        });
        if (!response.ok) {
          throw new Error(`Block height fetch failed: ${response.statusText}`);
        }
        const data = await response.json();
        const blockHeight = data.stacks_tip_height || 0;
        console.log('[API] Current Block Height from API:', blockHeight);
        return blockHeight;
      } catch (fetchError) {
        console.warn('[API] Fetch failed, trying XMLHttpRequest fallback:', fetchError);

        // Fallback to XMLHttpRequest
        return new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('GET', url, true);
          xhr.setRequestHeader('Content-Type', 'application/json');
          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              try {
                const data = JSON.parse(xhr.responseText);
                const blockHeight = data.stacks_tip_height || 0;
                console.log('[API] Current Block Height from XMLHttpRequest:', blockHeight);
                resolve(blockHeight);
              } catch (parseError) {
                console.error('[API] JSON parse error:', parseError);
                resolve(0);
              }
            } else {
              console.error('[API] XMLHttpRequest failed:', xhr.status, xhr.statusText);
              resolve(0);
            }
          };
          xhr.onerror = () => {
            console.error('[API] XMLHttpRequest network error');
            resolve(0);
          };
          xhr.send();
        });
      }
    } catch (error) {
      console.error('[API] Block height fetch error:', error);
      return 0;
    }
  }

  // Retirement Fund functions
  async getRetirementFundCount() {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.RETIREMENT_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss',
        'retirement-fundvss',
        'get-fund-count'
      );
      return result?.value || 0;
    } catch (error) {
      console.error('Error fetching retirement fund count:', error);
      return 0;
    }
  }

  async getRetirementFundInfo(fundId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.RETIREMENT_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss',
        'retirement-fundvss',
        'get-fund-info',
        [uintCV(fundId)]
      );

      console.log('[API] getRetirementFundInfo RAW result:', JSON.stringify(result, null, 2));
      console.log('[API] getRetirementFundInfo result.value:', result?.value);

      if (result?.value) {
        // Parse unlock-height - try all possible formats
        const unlockHeightRaw = result.value['unlock-height'] ?? result.value.unlockHeight ?? result.value['unlock_height'];
        console.log('[API] getRetirementFundInfo - Unlock height RAW:', unlockHeightRaw, 'Type:', typeof unlockHeightRaw);
        console.log('[API] getRetirementFundInfo - All data:', result.value);
        console.log('[API] getRetirementFundInfo - Raw result:', JSON.stringify(result, null, 2));

        // Convert to number properly
        let unlockHeight = 0;
        if (typeof unlockHeightRaw === 'string') {
          unlockHeight = parseInt(unlockHeightRaw, 10);
        } else if (typeof unlockHeightRaw === 'number') {
          unlockHeight = unlockHeightRaw;
        } else if (typeof unlockHeightRaw === 'bigint') {
          unlockHeight = Number(unlockHeightRaw);
        } else if (unlockHeightRaw && typeof unlockHeightRaw === 'object') {
          // Handle Clarity value objects
          if ('value' in unlockHeightRaw) {
            const val = (unlockHeightRaw as any).value;
            unlockHeight = typeof val === 'bigint' ? Number(val) : Number(val);
          }
        }

        console.log('[API] getRetirementFundInfo - Unlock height PARSED:', unlockHeight);

        // Also parse lock-duration-years properly
        const lockDurationRaw = result.value['lock-duration-years'] ?? result.value.lockDurationYears ?? result.value['lock_duration_years'];
        console.log('[API] getRetirementFundInfo - Lock duration RAW:', lockDurationRaw, 'Type:', typeof lockDurationRaw);

        let lockDurationYears = 0;
        if (typeof lockDurationRaw === 'string') {
          lockDurationYears = parseInt(lockDurationRaw, 10);
        } else if (typeof lockDurationRaw === 'number') {
          lockDurationYears = lockDurationRaw;
        } else if (typeof lockDurationRaw === 'bigint') {
          lockDurationYears = Number(lockDurationRaw);
        } else if (lockDurationRaw && typeof lockDurationRaw === 'object') {
          // Handle Clarity value objects
          if ('value' in lockDurationRaw) {
            const val = (lockDurationRaw as any).value;
            lockDurationYears = typeof val === 'bigint' ? Number(val) : Number(val);
          }
        }

        console.log('[API] getRetirementFundInfo - Lock duration PARSED:', lockDurationYears);

        // Ensure result has properly parsed unlock-height
        return {
          ...result.value,
          'unlock-height': unlockHeight,
          unlockHeight: unlockHeight,
          'lock-duration-years': lockDurationYears,
          lockDurationYears: lockDurationYears
        };
      }

      return result?.value || null;
    } catch (error) {
      console.error('Error fetching retirement fund info:', error);
      return null;
    }
  } async getUserRetirementFundCount(userAddress: string) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.RETIREMENT_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss',
        'retirement-fundvss',
        'get-user-fund-count',
        [principalCV(userAddress)]
      );
      console.log('[API] getUserRetirementFundCount RAW result:', JSON.stringify(result, null, 2));

      // Contract returns a tuple with 'count' field: {count: uint}
      let count = 0;

      if (result?.value !== undefined && result.value !== null) {
        const val = result.value;

        // First check if it's a tuple/object with count field
        if (typeof val === 'object' && val !== null && 'count' in val) {
          const countVal = val.count;
          if (typeof countVal === 'number') {
            count = countVal;
          } else if (typeof countVal === 'string') {
            count = parseInt(countVal, 10) || 0;
          } else if (typeof countVal === 'bigint') {
            count = Number(countVal);
          }
        }
        // Fallback: direct value
        else if (typeof val === 'number') {
          count = val;
        } else if (typeof val === 'string') {
          count = parseInt(val, 10) || 0;
        } else if (typeof val === 'bigint') {
          count = Number(val);
        } else if (val.type === 'uint' && val.value !== undefined) {
          count = Number(val.value);
        }
      }

      console.log('[API] ✅ Parsed retirement fund count:', count);
      return count;
    } catch (error) {
      console.error('❌ Error fetching user retirement fund count:', error);
      return 0;
    }
  }

  async getUserRetirementFund(userAddress: string, index: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.RETIREMENT_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss',
        'retirement-fundvss',
        'get-user-fund',
        [principalCV(userAddress), uintCV(index)]
      );
      return result?.value || null;
    } catch (error) {
      console.error('Error fetching user retirement fund:', error);
      return null;
    }
  }

  async getUserRetirementFunds(userAddress: string) {
    try {
      console.log('[FutureFund] Fetching retirement funds for:', userAddress);
      const count = await this.getUserRetirementFundCount(userAddress);
      console.log('[FutureFund] User retirement fund count:', count);
      const funds = [];

      for (let i = 0; i < count; i++) {
        const fundRef = await this.getUserRetirementFund(userAddress, i);
        console.log(`[FutureFund] Fund ref ${i}:`, fundRef);
        if (fundRef && fundRef['fund-id'] !== undefined) {
          const fundId = Number(fundRef['fund-id']);
          console.log(`[FutureFund] Processing fund ID:`, fundId);
          const fundInfo = await this.getRetirementFundInfo(fundId);
          console.log(`[FutureFund] Fund ${fundId} info:`, fundInfo);
          if (fundInfo) {
            funds.push({ ...fundInfo, fundId });
          }
        }
      }

      console.log('[FutureFund] Total retirement funds found:', funds.length);
      return funds;
    } catch (error) {
      console.error('Error fetching user retirement funds:', error);
      return [];
    }
  }

  async isRetirementFundUnlocked(fundId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.RETIREMENT_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.retirement-fundvss',
        'retirement-fundvss',
        'is-unlocked',
        [uintCV(fundId)]
      );
      return result?.value || false;
    } catch (error) {
      console.error('Error checking retirement fund unlock status:', error);
      return false;
    }
  }

  async calculatePendingRewards(fundId: number, contractAddress: string, contractName: string) {
    try {
      const result = await this.callReadOnlyFunction(
        contractAddress,
        contractName,
        'calculate-pending-rewards',
        [uintCV(fundId)]
      );
      return result?.value || 0;
    } catch (error) {
      console.error('Error calculating pending rewards:', error);
      return 0;
    }
  }

  async getTotalBalance(fundId: number, contractAddress: string, contractName: string) {
    try {
      const result = await this.callReadOnlyFunction(
        contractAddress,
        contractName,
        'get-total-balance',
        [uintCV(fundId)]
      );
      return result?.value || 0;
    } catch (error) {
      console.error('Error getting total balance:', error);
      return 0;
    }
  }

  // Education Fund functions
  async getEducationFundCount() {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.EDUCATION_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss',
        'education-fundvss',
        'get-fund-count'
      );
      return result?.value || 0;
    } catch (error) {
      console.error('Error fetching education fund count:', error);
      return 0;
    }
  }

  async getEducationFundInfo(fundId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.EDUCATION_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss',
        'education-fundvss',
        'get-fund-info',
        [uintCV(fundId)]
      );

      console.log('[API] getEducationFundInfo RAW result:', JSON.stringify(result, null, 2));
      console.log('[API] getEducationFundInfo result.value:', result?.value);

      if (result?.value) {
        // Parse unlock-height - try all possible formats
        const unlockHeightRaw = result.value['unlock-height'] ?? result.value.unlockHeight ?? result.value['unlock_height'];
        console.log('[API] getEducationFundInfo - Unlock height RAW:', unlockHeightRaw, 'Type:', typeof unlockHeightRaw);
        console.log('[API] getEducationFundInfo - All data:', result.value);
        console.log('[API] getEducationFundInfo - Raw result:', JSON.stringify(result, null, 2));

        // Convert to number properly
        let unlockHeight = 0;
        if (typeof unlockHeightRaw === 'string') {
          unlockHeight = parseInt(unlockHeightRaw, 10);
        } else if (typeof unlockHeightRaw === 'number') {
          unlockHeight = unlockHeightRaw;
        } else if (typeof unlockHeightRaw === 'bigint') {
          unlockHeight = Number(unlockHeightRaw);
        } else if (unlockHeightRaw && typeof unlockHeightRaw === 'object') {
          // Handle Clarity value objects
          if ('value' in unlockHeightRaw) {
            const val = (unlockHeightRaw as any).value;
            unlockHeight = typeof val === 'bigint' ? Number(val) : Number(val);
          }
        }

        console.log('[API] getEducationFundInfo - Unlock height PARSED:', unlockHeight);

        // Also parse lock-duration-years properly
        const lockDurationRaw = result.value['lock-duration-years'] ?? result.value.lockDurationYears ?? result.value['lock_duration_years'];
        console.log('[API] getEducationFundInfo - Lock duration RAW:', lockDurationRaw, 'Type:', typeof lockDurationRaw);

        let lockDurationYears = 0;
        if (typeof lockDurationRaw === 'string') {
          lockDurationYears = parseInt(lockDurationRaw, 10);
        } else if (typeof lockDurationRaw === 'number') {
          lockDurationYears = lockDurationRaw;
        } else if (typeof lockDurationRaw === 'bigint') {
          lockDurationYears = Number(lockDurationRaw);
        } else if (lockDurationRaw && typeof lockDurationRaw === 'object') {
          // Handle Clarity value objects
          if ('value' in lockDurationRaw) {
            const val = (lockDurationRaw as any).value;
            lockDurationYears = typeof val === 'bigint' ? Number(val) : Number(val);
          }
        }

        console.log('[API] getEducationFundInfo - Lock duration PARSED:', lockDurationYears);

        // Ensure result has properly parsed unlock-height
        return {
          ...result.value,
          'unlock-height': unlockHeight,
          unlockHeight: unlockHeight,
          'lock-duration-years': lockDurationYears,
          lockDurationYears: lockDurationYears
        };
      }

      return result?.value || null;
    } catch (error) {
      console.error('Error fetching education fund info:', error);
      return null;
    }
  } async getCreatorEducationFundCount(creatorAddress: string) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.EDUCATION_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss',
        'education-fundvss',
        'get-creator-fund-count',
        [principalCV(creatorAddress)]
      );
      console.log('[API] getCreatorEducationFundCount RAW result:', JSON.stringify(result, null, 2));

      // Contract returns a tuple with 'count' field: {count: uint}
      let count = 0;

      if (result?.value !== undefined && result.value !== null) {
        const val = result.value;

        // First check if it's a tuple/object with count field
        if (typeof val === 'object' && val !== null && 'count' in val) {
          const countVal = val.count;
          if (typeof countVal === 'number') {
            count = countVal;
          } else if (typeof countVal === 'string') {
            count = parseInt(countVal, 10) || 0;
          } else if (typeof countVal === 'bigint') {
            count = Number(countVal);
          }
        }
        // Fallback: direct value
        else if (typeof val === 'number') {
          count = val;
        } else if (typeof val === 'string') {
          count = parseInt(val, 10) || 0;
        } else if (typeof val === 'bigint') {
          count = Number(val);
        } else if (val.type === 'uint' && val.value !== undefined) {
          count = Number(val.value);
        }
      }

      console.log('[API] ✅ Parsed education fund count:', count);
      return count;
    } catch (error) {
      console.error('❌ Error fetching creator education fund count:', error);
      return 0;
    }
  }

  async getCreatorEducationFund(creatorAddress: string, index: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.EDUCATION_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss',
        'education-fundvss',
        'get-creator-fund',
        [principalCV(creatorAddress), uintCV(index)]
      );
      return result?.value || null;
    } catch (error) {
      console.error('Error fetching creator education fund:', error);
      return null;
    }
  }

  async getCreatorEducationFunds(creatorAddress: string) {
    try {
      console.log('[FutureFund] Fetching education funds for:', creatorAddress);
      const count = await this.getCreatorEducationFundCount(creatorAddress);
      console.log('[FutureFund] Creator education fund count:', count);
      const funds = [];

      for (let i = 0; i < count; i++) {
        const fundRef = await this.getCreatorEducationFund(creatorAddress, i);
        console.log(`[FutureFund] Education fund ref ${i}:`, fundRef);
        if (fundRef && fundRef['fund-id'] !== undefined) {
          const fundId = Number(fundRef['fund-id']);
          console.log(`[FutureFund] Processing education fund ID:`, fundId);
          const fundInfo = await this.getEducationFundInfo(fundId);
          console.log(`[FutureFund] Education fund ${fundId} info:`, fundInfo);
          if (fundInfo) {
            funds.push({ ...fundInfo, fundId });
          }
        }
      }

      console.log('[FutureFund] Total education funds found:', funds.length);
      return funds;
    } catch (error) {
      console.error('Error fetching creator education funds:', error);
      return [];
    }
  }

  async calculateEducationFundProgress(fundId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.EDUCATION_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss',
        'education-fundvss',
        'calculate-progress',
        [uintCV(fundId)]
      );
      return result?.value || 0;
    } catch (error) {
      console.error('Error calculating education fund progress:', error);
      return 0;
    }
  }

  async isEducationFundUnlocked(fundId: number) {
    try {
      const result = await this.callReadOnlyFunction(
        CONTRACTS.EDUCATION_FUND || 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.education-fundvss',
        'education-fundvss',
        'is-unlocked',
        [uintCV(fundId)]
      );
      return result?.value || false;
    } catch (error) {
      console.error('Error checking education fund unlock status:', error);
      return false;
    }
  }
}

// Export singleton instance
export const stacksApi = new StacksApi();
export default stacksApi;
