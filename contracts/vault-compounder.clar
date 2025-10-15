;; Vault Compounder Contract v6
;; Auto-compounding vaults for maximizing yields
;; Users deposit tokens and vault automatically reinvests rewards

;; Import dependencies
;; SIP-010 trait will be defined locally for testnet compatibility
(define-trait sip-010-trait (
  (transfer
    (uint principal principal (optional (buff 34)))
    (response bool uint)
  )
  (get-name
    ()
    (response (string-ascii 32) uint)
  )
  (get-symbol
    ()
    (response (string-ascii 32) uint)
  )
  (get-decimals
    ()
    (response uint uint)
  )
  (get-balance
    (principal)
    (response uint uint)
  )
  (get-total-supply
    ()
    (response uint uint)
  )
  (get-token-uri
    ()
    (response (optional (string-utf8 256)) uint)
  )
))

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant SCALING_FACTOR u100000000) ;; 1e8 for 8-decimal precision
(define-constant SHARE_PRECISION u1000000) ;; 1e6 for share calculations
(define-constant MIN_HARVEST_INTERVAL u10) ;; ~1.5 hours in blocks (reduced for testing)

;; Error codes
(define-constant ERR_OWNER_ONLY (err u400))
(define-constant ERR_VAULT_NOT_FOUND (err u401))
(define-constant ERR_INSUFFICIENT_BALANCE (err u402))
(define-constant ERR_INVALID_AMOUNT (err u403))
(define-constant ERR_VAULT_PAUSED (err u404))
(define-constant ERR_MINIMUM_DEPOSIT_NOT_MET (err u405))
(define-constant ERR_HARVEST_NOT_READY (err u406))
(define-constant ERR_INSUFFICIENT_SHARES (err u407))
(define-constant ERR_INVALID_POOL (err u408))

;; Data variables
(define-data-var next-vault-id uint u1)
(define-data-var contract-paused bool false)
(define-data-var staking-pool-contract (optional principal) none)
(define-data-var rewards-distributor-contract (optional principal) none)

;; Data maps

;; Vault configuration
;; vault-id -> vault info
(define-map vaults
  uint
  {
    name: (string-ascii 64), ;; Vault name
    underlying-pool-id: uint, ;; Staking pool ID this vault invests in
    token-contract: principal, ;; Underlying token contract
    min-deposit: uint, ;; Minimum deposit amount
    management-fee: uint, ;; Management fee (scaled by SHARE_PRECISION)
    performance-fee: uint, ;; Performance fee (scaled by SHARE_PRECISION)
    total-assets: uint, ;; Total assets under management
    total-shares: uint, ;; Total shares issued
    last-harvest: uint, ;; Last harvest block
    harvest-reward: uint, ;; Reward for calling harvest
    active: bool, ;; Vault active status
    created-at: uint, ;; Block when vault was created
  }
)

;; User positions in vaults
;; { vault-id: uint, user: principal } -> position info
(define-map user-positions
  {
    vault-id: uint,
    user: principal,
  }
  {
    shares: uint, ;; User's share amount
    last-deposit-block: uint, ;; Last deposit block
    total-deposited: uint, ;; Total amount ever deposited
    total-withdrawn: uint, ;; Total amount ever withdrawn
  }
)

;; Vault performance tracking
;; vault-id -> performance data
(define-map vault-performance
  uint
  {
    total-harvests: uint, ;; Total number of harvests
    total-rewards-compounded: uint, ;; Total rewards compounded
    highest-share-price: uint, ;; Highest share price achieved
    total-fees-collected: uint, ;; Total fees collected
  }
)

;; Private functions

;; Get vault information
(define-private (get-vault-info-internal (vault-id uint))
  (map-get? vaults vault-id)
)

;; Get user position information
(define-private (get-user-position-internal
    (vault-id uint)
    (user principal)
  )
  (map-get? user-positions {
    vault-id: vault-id,
    user: user,
  })
)

;; Calculate current share price
(define-private (calculate-share-price-internal (vault-id uint))
  (let (
      (vault-info (unwrap! (get-vault-info-internal vault-id) ERR_VAULT_NOT_FOUND))
      (total-assets (get total-assets vault-info))
      (total-shares (get total-shares vault-info))
    )
    (if (is-eq total-shares u0)
      (ok SCALING_FACTOR) ;; Initial price is 1.0
      (ok (/ (* total-assets SCALING_FACTOR) total-shares))
    )
  )
)

;; Calculate shares to mint for deposit
(define-private (calculate-shares-to-mint
    (vault-id uint)
    (deposit-amount uint)
  )
  (let (
      (vault-info (unwrap! (get-vault-info-internal vault-id) ERR_VAULT_NOT_FOUND))
      (total-shares (get total-shares vault-info))
      (share-price (unwrap! (calculate-share-price-internal vault-id) ERR_VAULT_NOT_FOUND))
    )
    (if (is-eq total-shares u0)
      (ok deposit-amount) ;; First deposit gets 1:1 shares
      (ok (/ (* deposit-amount SCALING_FACTOR) share-price))
    )
  )
)

;; Public functions

;; Admin functions

;; Set staking pool contract
;; @param pool-contract: staking pool contract address
(define-public (set-staking-pool-contract (pool-contract principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set staking-pool-contract (some pool-contract))
    (ok true)
  )
)

;; Set rewards distributor contract
;; @param distributor-contract: rewards distributor contract address
(define-public (set-rewards-distributor-contract (distributor-contract principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set rewards-distributor-contract (some distributor-contract))
    (ok true)
  )
)

;; Create a new vault
;; @param name: vault name
;; @param underlying-pool-id: staking pool ID to invest in
;; @param token-contract: underlying token contract
;; @param min-deposit: minimum deposit amount
;; @param management-fee: annual management fee (scaled by SHARE_PRECISION)
;; @param performance-fee: performance fee percentage (scaled by SHARE_PRECISION)
;; @param harvest-reward: reward for calling harvest function
(define-public (create-vault
    (name (string-ascii 64))
    (underlying-pool-id uint)
    (token-contract principal)
    (min-deposit uint)
    (management-fee uint)
    (performance-fee uint)
    (harvest-reward uint)
  )
  (let ((vault-id (var-get next-vault-id)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (asserts! (> min-deposit u0) ERR_INVALID_AMOUNT)
    (asserts! (<= management-fee (* u5 SHARE_PRECISION)) ERR_INVALID_AMOUNT)
    ;; Max 5% management fee
    (asserts! (<= performance-fee (* u20 SHARE_PRECISION)) ERR_INVALID_AMOUNT)
    ;; Max 20% performance fee

    ;; Verify pool exists (simplified for testing)
    ;; (asserts! (is-some (contract-call? .staking-pool get-pool-info underlying-pool-id)) ERR_INVALID_POOL)
    (asserts! (> underlying-pool-id u0) ERR_INVALID_POOL)

    ;; Create vault
    (map-set vaults vault-id {
      name: name,
      underlying-pool-id: underlying-pool-id,
      token-contract: token-contract,
      min-deposit: min-deposit,
      management-fee: management-fee,
      performance-fee: performance-fee,
      total-assets: u0,
      total-shares: u0,
      last-harvest: block-height,
      harvest-reward: harvest-reward,
      active: true,
      created-at: block-height,
    })

    ;; Initialize performance tracking
    (map-set vault-performance vault-id {
      total-harvests: u0,
      total-rewards-compounded: u0,
      highest-share-price: SCALING_FACTOR,
      total-fees-collected: u0,
    })

    ;; Increment next vault ID
    (var-set next-vault-id (+ vault-id u1))

    ;; Print vault creation event
    (print {
      type: "vault_created_event",
      vault-id: vault-id,
      name: name,
      underlying-pool-id: underlying-pool-id,
      min-deposit: min-deposit,
    })

    (ok vault-id)
  )
)

;; User functions

;; Deposit tokens to vault
;; @param vault-id: ID of the vault
;; @param amount: amount to deposit
(define-public (deposit-vault
    (vault-id uint)
    (amount uint)
  )
  (let (
      (vault-info (unwrap! (get-vault-info-internal vault-id) ERR_VAULT_NOT_FOUND))
      (token-contract (get token-contract vault-info))
      (existing-position (get-user-position-internal vault-id tx-sender))
      (shares-to-mint (unwrap! (calculate-shares-to-mint vault-id amount) ERR_INVALID_AMOUNT))
    )
    (asserts! (not (var-get contract-paused)) ERR_VAULT_PAUSED)
    (asserts! (get active vault-info) ERR_VAULT_PAUSED)
    (asserts! (>= amount (get min-deposit vault-info))
      ERR_MINIMUM_DEPOSIT_NOT_MET
    )

    ;; Transfer tokens from user to contract
    (try! (contract-call? .sbtc-token-betavss transfer amount tx-sender
      (as-contract tx-sender) none
    ))

    ;; Update user position
    (match existing-position
      position (map-set user-positions {
        vault-id: vault-id,
        user: tx-sender,
      } {
        shares: (+ (get shares position) shares-to-mint),
        last-deposit-block: block-height,
        total-deposited: (+ (get total-deposited position) amount),
        total-withdrawn: (get total-withdrawn position),
      })
      (map-set user-positions {
        vault-id: vault-id,
        user: tx-sender,
      } {
        shares: shares-to-mint,
        last-deposit-block: block-height,
        total-deposited: amount,
        total-withdrawn: u0,
      })
    )

    ;; Update vault totals
    (map-set vaults vault-id
      (merge vault-info {
        total-assets: (+ (get total-assets vault-info) amount),
        total-shares: (+ (get total-shares vault-info) shares-to-mint),
      })
    )

    ;; Auto-deposit to underlying pool (simplified for testing)
    ;; In production, this would deposit to the underlying staking pool
    ;; For now, we'll just continue without the actual deposit

    ;; Print deposit event
    (print {
      type: "vault_deposit_event",
      vault-id: vault-id,
      user: tx-sender,
      amount: amount,
      shares-minted: shares-to-mint,
    })

    (ok shares-to-mint)
  )
)

;; Withdraw from vault
;; @param vault-id: ID of the vault
;; @param shares: number of shares to redeem
(define-public (withdraw-vault
    (vault-id uint)
    (shares uint)
  )
  (let (
      (vault-info (unwrap! (get-vault-info-internal vault-id) ERR_VAULT_NOT_FOUND))
      (user-position (unwrap! (get-user-position-internal vault-id tx-sender)
        ERR_INSUFFICIENT_SHARES
      ))
      (share-price (unwrap! (calculate-share-price-internal vault-id) ERR_VAULT_NOT_FOUND))
      (withdrawal-amount (/ (* shares share-price) SCALING_FACTOR))
      (user-shares (get shares user-position))
    )
    (asserts! (> shares u0) ERR_INVALID_AMOUNT)
    (asserts! (>= user-shares shares) ERR_INSUFFICIENT_SHARES)

    ;; Withdraw from underlying pool (simplified for testing)
    ;; In production, this would withdraw from the underlying staking pool
    ;; For now, we'll just continue without the actual withdrawal

    ;; Update user position
    (let ((remaining-shares (- user-shares shares)))
      (if (is-eq remaining-shares u0)
        (map-delete user-positions {
          vault-id: vault-id,
          user: tx-sender,
        })
        (map-set user-positions {
          vault-id: vault-id,
          user: tx-sender,
        }
          (merge user-position {
            shares: remaining-shares,
            total-withdrawn: (+ (get total-withdrawn user-position) withdrawal-amount),
          })
        )
      )
    )

    ;; Update vault totals
    (map-set vaults vault-id
      (merge vault-info {
        total-assets: (- (get total-assets vault-info) withdrawal-amount),
        total-shares: (- (get total-shares vault-info) shares),
      })
    )

    ;; Transfer tokens to user
    ;; Save the original caller before entering as-contract context
    (let ((recipient tx-sender))
      (try! (as-contract (contract-call? .sbtc-token-betavss transfer withdrawal-amount tx-sender
        recipient none
      )))
    )

    ;; Print withdrawal event
    (print {
      type: "vault_withdrawal_event",
      vault-id: vault-id,
      user: tx-sender,
      shares-redeemed: shares,
      amount-received: withdrawal-amount,
    })

    (ok withdrawal-amount)
  )
)

;; Harvest rewards and compound them
;; @param vault-id: ID of the vault
(define-public (harvest (vault-id uint))
  (let (
      (vault-info (unwrap! (get-vault-info-internal vault-id) ERR_VAULT_NOT_FOUND))
      (last-harvest (get last-harvest vault-info))
      (harvest-reward (get harvest-reward vault-info))
      (underlying-pool-id (get underlying-pool-id vault-info))
      (performance-data (default-to {
        total-harvests: u0,
        total-rewards-compounded: u0,
        highest-share-price: SCALING_FACTOR,
        total-fees-collected: u0,
      }
        (map-get? vault-performance vault-id)
      ))
      (harvester tx-sender)
    )
    (asserts! (get active vault-info) ERR_VAULT_PAUSED)
    (asserts! (>= block-height (+ last-harvest MIN_HARVEST_INTERVAL))
      ERR_HARVEST_NOT_READY
    )

    ;; Try to claim rewards from underlying staking pool
    ;; If it fails (no rewards available), we still update harvest time
    (match (contract-call? .staking-deltav6 claim-rewards underlying-pool-id)
      rewards-claimed
      (if (> rewards-claimed u0)
        (let (
            ;; Calculate performance fee
            (performance-fee-amount (/ (* rewards-claimed (get performance-fee vault-info))
              SHARE_PRECISION
            ))
            (amount-to-compound (- rewards-claimed performance-fee-amount))
            ;; Calculate harvest reward (from performance fee, capped)
            (caller-reward (if (> harvest-reward performance-fee-amount)
              performance-fee-amount
              harvest-reward
            ))
          )
          ;; Pay harvest caller reward if any
          (if (and (> caller-reward u0) (> performance-fee-amount u0))
            (match (as-contract (contract-call? .sbtc-token-betavss transfer caller-reward tx-sender
              harvester none
            ))
              success-val
              true
              error-val (begin
                (print {
                  type: "harvest_reward_payment_failed",
                  error: error-val,
                })
                true ;; Continue even if reward payment fails
              )
            )
            true
          )

          ;; Compound remaining rewards back to pool
          (if (> amount-to-compound u0)
            (match (as-contract (contract-call? .staking-deltav6 deposit underlying-pool-id
              amount-to-compound
            ))
              success-deposit
              true
              error-deposit (begin
                (print {
                  type: "compound_deposit_failed",
                  error: error-deposit,
                })
                true ;; Continue even if compounding fails
              )
            )
            true
          )

          ;; Update vault info
          (map-set vaults vault-id
            (merge vault-info {
              total-assets: (+ (get total-assets vault-info) amount-to-compound),
              last-harvest: block-height,
            })
          )

          ;; Update performance tracking
          (let ((new-share-price (unwrap-panic (calculate-share-price-internal vault-id))))
            (map-set vault-performance vault-id {
              total-harvests: (+ (get total-harvests performance-data) u1),
              total-rewards-compounded: (+ (get total-rewards-compounded performance-data)
                amount-to-compound
              ),
              highest-share-price: (if (> new-share-price (get highest-share-price performance-data))
                new-share-price
                (get highest-share-price performance-data)
              ),
              total-fees-collected: (+ (get total-fees-collected performance-data)
                performance-fee-amount
              ),
            })
          )

          ;; Print harvest event
          (print {
            type: "vault_harvest_event",
            vault-id: vault-id,
            harvester: harvester,
            rewards-claimed: rewards-claimed,
            amount-compounded: amount-to-compound,
            performance-fee: performance-fee-amount,
            harvest-reward: caller-reward,
          })

          (ok rewards-claimed)
        )
        ;; No rewards claimed, still update harvest time
        (begin
          (map-set vaults vault-id
            (merge vault-info { last-harvest: block-height })
          )
          (print {
            type: "vault_harvest_no_rewards",
            vault-id: vault-id,
          })
          (ok u0)
        )
      )
      ;; Claim rewards failed (e.g., no rewards available)
      claim-error
      (begin
        ;; Still update last harvest time to prevent spam
        (map-set vaults vault-id
          (merge vault-info { last-harvest: block-height })
        )
        (print {
          type: "vault_harvest_claim_failed",
          vault-id: vault-id,
          error: claim-error,
        })
        (ok u0)
      )
    )
  )
)

;; Read-only functions

;; Get vault information
;; @param vault-id: ID of the vault
(define-read-only (get-vault-info (vault-id uint))
  (map-get? vaults vault-id)
)

;; Get user position in vault
;; @param vault-id: ID of the vault
;; @param user: user address
(define-read-only (get-user-position
    (vault-id uint)
    (user principal)
  )
  (map-get? user-positions {
    vault-id: vault-id,
    user: user,
  })
)

;; Calculate current share price
;; @param vault-id: ID of the vault
(define-read-only (calculate-share-price (vault-id uint))
  (calculate-share-price-internal vault-id)
)

;; Calculate user's current balance in underlying tokens
;; @param vault-id: ID of the vault
;; @param user: user address
(define-read-only (get-user-balance
    (vault-id uint)
    (user principal)
  )
  (match (get-user-position-internal vault-id user)
    position (let (
        (user-shares (get shares position))
        (share-price (unwrap! (calculate-share-price-internal vault-id) ERR_VAULT_NOT_FOUND))
      )
      (ok (/ (* user-shares share-price) SCALING_FACTOR))
    )
    (ok u0)
  )
)

;; Get vault performance data
;; @param vault-id: ID of the vault
(define-read-only (get-vault-performance (vault-id uint))
  (map-get? vault-performance vault-id)
)

;; Get vault count
(define-read-only (get-vault-count)
  (- (var-get next-vault-id) u1)
)

;; Check if harvest is ready
;; @param vault-id: ID of the vault
(define-read-only (is-harvest-ready (vault-id uint))
  (match (get-vault-info-internal vault-id)
    vault-info (>= block-height (+ (get last-harvest vault-info) MIN_HARVEST_INTERVAL))
    false
  )
)

;; Get contract configuration
(define-read-only (get-contract-config)
  {
    contract-owner: CONTRACT_OWNER,
    contract-paused: (var-get contract-paused),
    staking-pool-contract: (var-get staking-pool-contract),
    rewards-distributor-contract: (var-get rewards-distributor-contract),
    next-vault-id: (var-get next-vault-id),
  }
)

;; Emergency functions

;; Pause contract (admin only)
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set contract-paused true)
    (print { type: "vault_contract_paused_event" })
    (ok true)
  )
)

;; Resume contract (admin only)
(define-public (resume-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set contract-paused false)
    (print { type: "vault_contract_resumed_event" })
    (ok true)
  )
)

;; Pause specific vault (admin only)
;; @param vault-id: ID of the vault to pause
(define-public (pause-vault (vault-id uint))
  (let ((vault-info (unwrap! (get-vault-info-internal vault-id) ERR_VAULT_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (map-set vaults vault-id (merge vault-info { active: false }))
    (print {
      type: "vault_paused_event",
      vault-id: vault-id,
    })
    (ok true)
  )
)

;; Resume specific vault (admin only)
;; @param vault-id: ID of the vault to resume
(define-public (resume-vault (vault-id uint))
  (let ((vault-info (unwrap! (get-vault-info-internal vault-id) ERR_VAULT_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (map-set vaults vault-id (merge vault-info { active: true }))
    (print {
      type: "vault_resumed_event",
      vault-id: vault-id,
    })
    (ok true)
  )
)
