;; Staking Pool Contract v6
;; Multi-pool staking system with different risk profiles
;; Supports Conservative, Moderate, and Aggressive risk pools

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
(define-constant FEE_SCALE u1000000) ;; 1e6 for percentage calculations
(define-constant BLOCKS_PER_YEAR u52560) ;; ~10 min blocks, 365 days

;; Risk profiles
(define-constant RISK_CONSERVATIVE u1)
(define-constant RISK_MODERATE u2)
(define-constant RISK_AGGRESSIVE u3)

;; Error codes
(define-constant ERR_OWNER_ONLY (err u300))
(define-constant ERR_POOL_NOT_FOUND (err u301))
(define-constant ERR_INSUFFICIENT_BALANCE (err u302))
(define-constant ERR_INVALID_AMOUNT (err u303))
(define-constant ERR_POOL_PAUSED (err u304))
(define-constant ERR_MINIMUM_STAKE_NOT_MET (err u305))
(define-constant ERR_MAXIMUM_STAKE_EXCEEDED (err u306))
(define-constant ERR_EARLY_WITHDRAWAL (err u307))
(define-constant ERR_NO_REWARDS_AVAILABLE (err u308))
(define-constant ERR_INVALID_RISK_PROFILE (err u309))

;; Data variables
(define-data-var next-pool-id uint u1)
(define-data-var contract-paused bool false)
(define-data-var sbtc-token-contract (optional principal) none)
(define-data-var rewards-distributor-contract (optional principal) none)

;; Data maps

;; Pool configuration
;; pool-id -> pool info
(define-map pools
  uint
  {
    token-contract: principal, ;; sBTC token contract
    risk-profile: uint, ;; 1=Conservative, 2=Moderate, 3=Aggressive
    reward-rate: uint, ;; Annual reward rate (scaled by SCALING_FACTOR)
    min-stake: uint, ;; Minimum stake amount
    max-stake-per-user: uint, ;; Maximum stake per user
    fee-percent: uint, ;; Fee percentage (scaled by FEE_SCALE)
    deposit-lock-period: uint, ;; Lock period in blocks
    total-staked: uint, ;; Total amount staked in pool
    total-rewards-distributed: uint, ;; Total rewards distributed
    active: bool, ;; Pool active status
    created-at: uint, ;; Block height when created
  }
)

;; User stakes in pools
;; { pool-id: uint, user: principal } -> stake info
(define-map user-stakes
  {
    pool-id: uint,
    user: principal,
  }
  {
    amount: uint, ;; Staked amount
    deposit-block: uint, ;; Block when deposited
    last-reward-block: uint, ;; Last block rewards were calculated
    reward-debt: uint, ;; Reward debt for proper calculation
  }
)

;; Pool reward per share (for reward calculations)
;; pool-id -> reward per share (scaled by SCALING_FACTOR)
(define-map pool-reward-per-share
  uint
  uint
)

;; Pool last reward block
;; pool-id -> block height
(define-map pool-last-reward-block
  uint
  uint
)

;; Private functions

;; Get pool information
(define-private (get-pool-info-internal (pool-id uint))
  (map-get? pools pool-id)
)

;; Get user stake information
(define-private (get-user-stake-internal
    (pool-id uint)
    (user principal)
  )
  (map-get? user-stakes {
    pool-id: pool-id,
    user: user,
  })
)

;; Update pool rewards
(define-private (update-pool-rewards (pool-id uint))
  (let (
      (pool-info (unwrap! (get-pool-info-internal pool-id) ERR_POOL_NOT_FOUND))
      (current-block block-height)
      (last-reward-block (default-to (get created-at pool-info)
        (map-get? pool-last-reward-block pool-id)
      ))
      (total-staked (get total-staked pool-info))
      (reward-per-share (default-to u0 (map-get? pool-reward-per-share pool-id)))
    )
    (if (and (> total-staked u0) (> current-block last-reward-block))
      (let (
          (blocks-elapsed (- current-block last-reward-block))
          (pool-rewards (/ (* (* total-staked (get reward-rate pool-info)) blocks-elapsed)
            (* SCALING_FACTOR BLOCKS_PER_YEAR)
          ))
          (new-reward-per-share (+ reward-per-share (/ (* pool-rewards SCALING_FACTOR) total-staked)))
        )
        (map-set pool-reward-per-share pool-id new-reward-per-share)
        (map-set pool-last-reward-block pool-id current-block)
        (ok new-reward-per-share)
      )
      (ok reward-per-share)
    )
  )
)

;; Calculate pending rewards for user
(define-private (calculate-pending-rewards-internal
    (pool-id uint)
    (user principal)
  )
  (let (
      (user-stake (get-user-stake-internal pool-id user))
      (reward-per-share (default-to u0 (map-get? pool-reward-per-share pool-id)))
    )
    (match user-stake
      stake-info (let (
          (user-amount (get amount stake-info))
          (reward-debt (get reward-debt stake-info))
          (pending (/ (- (* user-amount reward-per-share) reward-debt) SCALING_FACTOR))
        )
        (ok pending)
      )
      (ok u0)
    )
  )
)

;; Public functions

;; Admin functions

;; Set sBTC token contract
;; @param token-contract: sBTC token contract address
(define-public (set-sbtc-token-contract (token-contract principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set sbtc-token-contract (some token-contract))
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

;; Create a new staking pool
;; @param token-contract: token contract for the pool
;; @param risk-profile: risk level (1=Conservative, 2=Moderate, 3=Aggressive)
;; @param reward-rate: annual reward rate (scaled by SCALING_FACTOR)
;; @param min-stake: minimum stake amount
;; @param max-stake-per-user: maximum stake per user
;; @param fee-percent: fee percentage (scaled by FEE_SCALE)
;; @param deposit-lock-period: lock period in blocks
(define-public (create-pool
    (token-contract principal)
    (risk-profile uint)
    (reward-rate uint)
    (min-stake uint)
    (max-stake-per-user uint)
    (fee-percent uint)
    (deposit-lock-period uint)
  )
  (let ((pool-id (var-get next-pool-id)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (asserts!
      (and (>= risk-profile RISK_CONSERVATIVE) (<= risk-profile RISK_AGGRESSIVE))
      ERR_INVALID_RISK_PROFILE
    )
    (asserts! (> min-stake u0) ERR_INVALID_AMOUNT)
    (asserts! (> max-stake-per-user min-stake) ERR_INVALID_AMOUNT)
    (asserts! (<= fee-percent (* u10 FEE_SCALE)) ERR_INVALID_AMOUNT)
    ;; Max 10% fee

    ;; Create pool
    (map-set pools pool-id {
      token-contract: token-contract,
      risk-profile: risk-profile,
      reward-rate: reward-rate,
      min-stake: min-stake,
      max-stake-per-user: max-stake-per-user,
      fee-percent: fee-percent,
      deposit-lock-period: deposit-lock-period,
      total-staked: u0,
      total-rewards-distributed: u0,
      active: true,
      created-at: block-height,
    })

    ;; Initialize reward tracking
    (map-set pool-reward-per-share pool-id u0)
    (map-set pool-last-reward-block pool-id block-height)

    ;; Increment next pool ID
    (var-set next-pool-id (+ pool-id u1))

    ;; Print pool creation event
    (print {
      type: "pool_created_event",
      pool-id: pool-id,
      risk-profile: risk-profile,
      reward-rate: reward-rate,
      min-stake: min-stake,
      max-stake-per-user: max-stake-per-user,
    })

    (ok pool-id)
  )
)

;; User functions

;; Stake tokens to a pool
;; @param pool-id: ID of the pool
;; @param amount: amount to stake
(define-public (stake
    (pool-id uint)
    (amount uint)
  )
  (let (
      (pool-info (unwrap! (get-pool-info-internal pool-id) ERR_POOL_NOT_FOUND))
      (token-contract (get token-contract pool-info))
      (existing-stake (get-user-stake-internal pool-id tx-sender))
      (current-amount (match existing-stake
        some-stake (get amount some-stake)
        u0
      ))
      (new-total-amount (+ current-amount amount))
    )
    (asserts! (not (var-get contract-paused)) ERR_POOL_PAUSED)
    (asserts! (get active pool-info) ERR_POOL_PAUSED)
    (asserts! (>= amount (get min-stake pool-info)) ERR_MINIMUM_STAKE_NOT_MET)
    (asserts! (<= new-total-amount (get max-stake-per-user pool-info))
      ERR_MAXIMUM_STAKE_EXCEEDED
    )

    ;; Update pool rewards before deposit
    (try! (update-pool-rewards pool-id))

    ;; Transfer tokens from user to contract
    (try! (contract-call? .sbtc-token-betavss transfer amount tx-sender
      (as-contract tx-sender) none
    ))

    ;; Calculate reward debt
    (let (
        (reward-per-share (default-to u0 (map-get? pool-reward-per-share pool-id)))
        (new-reward-debt (* new-total-amount reward-per-share))
      )
      ;; Update user stake - ALWAYS reset deposit-block to restart lock period
      (map-set user-stakes {
        pool-id: pool-id,
        user: tx-sender,
      } {
        amount: new-total-amount,
        deposit-block: block-height, ;; Reset lock period on every stake
        last-reward-block: block-height,
        reward-debt: new-reward-debt,
      })

      ;; Update pool total staked
      (map-set pools pool-id
        (merge pool-info { total-staked: (+ (get total-staked pool-info) amount) })
      )

      ;; Print stake event
      (print {
        type: "stake_event",
        pool-id: pool-id,
        user: tx-sender,
        amount: amount,
        previous-stake: current-amount,
        new-total: new-total-amount,
        deposit-block: block-height,
        is-additional-stake: (is-some existing-stake),
        lock-period-restarted: (is-some existing-stake),
      })

      (ok true)
    )
  )
)

;; Unstake ALL tokens from a pool (only after lock period)
;; @param pool-id: ID of the pool
;; NOTE: User must withdraw entire stake - partial withdrawal not allowed
(define-public (unstake (pool-id uint))
  (let (
      (pool-info (unwrap! (get-pool-info-internal pool-id) ERR_POOL_NOT_FOUND))
      (user-stake (unwrap! (get-user-stake-internal pool-id tx-sender)
        ERR_INSUFFICIENT_BALANCE
      ))
      (deposit-block (get deposit-block user-stake))
      (lock-period (get deposit-lock-period pool-info))
      (amount (get amount user-stake)) ;; Full amount only
    )
    ;; Validations
    (asserts! (> amount u0) ERR_INSUFFICIENT_BALANCE)
    (asserts! (>= block-height (+ deposit-block lock-period))
      ERR_EARLY_WITHDRAWAL
    )

    ;; Update pool rewards before withdrawal
    (try! (update-pool-rewards pool-id))

    ;; Calculate pending rewards
    (let ((pending-rewards (unwrap! (calculate-pending-rewards-internal pool-id tx-sender)
        ERR_NO_REWARDS_AVAILABLE
      )))
      ;; Claim pending rewards if any (without failing if none available)
      (if (> pending-rewards u0)
        (match (claim-rewards pool-id)
          success
          true
          error
          false
        )
        true
      )

      ;; Full withdrawal - delete user stake record
      (let ((recipient tx-sender))
        ;; Delete user stake (full withdrawal)
        (map-delete user-stakes {
          pool-id: pool-id,
          user: tx-sender,
        })

        ;; Update pool total staked
        (map-set pools pool-id
          (merge pool-info { total-staked: (- (get total-staked pool-info) amount) })
        )

        ;; Transfer all tokens back to user
        (try! (as-contract (contract-call? .sbtc-token-betavss transfer amount tx-sender recipient
          none
        )))

        ;; Print unstake event
        (print {
          type: "unstake_event",
          pool-id: pool-id,
          user: tx-sender,
          amount: amount,
          full-withdrawal: true,
          remaining: u0,
          block-height: block-height,
          deposit-block: deposit-block,
          lock-period-completed: true,
        })

        (ok true)
      )
    )
  )
)

;; Early unstake ALL tokens with 20% penalty (before lock period ends)
;; @param pool-id: ID of the pool
;; NOTE: User must withdraw entire stake with penalty - partial withdrawal not allowed
(define-public (unstake-early (pool-id uint))
  (let (
      (pool-info (unwrap! (get-pool-info-internal pool-id) ERR_POOL_NOT_FOUND))
      (user-stake (unwrap! (get-user-stake-internal pool-id tx-sender)
        ERR_INSUFFICIENT_BALANCE
      ))
      (amount (get amount user-stake)) ;; Full amount only
      (deposit-block (get deposit-block user-stake))
      (lock-period (get deposit-lock-period pool-info))
    )
    ;; Validations
    (asserts! (> amount u0) ERR_INSUFFICIENT_BALANCE)

    ;; Update pool rewards before withdrawal
    (try! (update-pool-rewards pool-id))

    ;; Calculate pending rewards
    (let ((pending-rewards (unwrap! (calculate-pending-rewards-internal pool-id tx-sender)
        ERR_NO_REWARDS_AVAILABLE
      )))
      ;; Claim pending rewards if any
      (if (> pending-rewards u0)
        (match (claim-rewards pool-id)
          success
          true
          error
          false
        )
        true
      )

      ;; Calculate penalty (fixed 20% for early unstake) - full withdrawal
      (let (
          (penalty (/ (* amount u200000) FEE_SCALE)) ;; 20% penalty (200000/1000000)
          (amount-after-penalty (- amount penalty))
          (recipient tx-sender)
        )
        ;; Delete user stake (full early withdrawal)
        (map-delete user-stakes {
          pool-id: pool-id,
          user: tx-sender,
        })

        ;; Update pool total staked
        (map-set pools pool-id
          (merge pool-info { total-staked: (- (get total-staked pool-info) amount) })
        )

        ;; Transfer tokens back to user (minus 20% penalty)
        (try! (as-contract (contract-call? .sbtc-token-betavss transfer amount-after-penalty
          tx-sender recipient none
        )))

        ;; Print early unstake event
        (print {
          type: "unstake_early_event",
          pool-id: pool-id,
          user: tx-sender,
          amount: amount,
          penalty: penalty,
          penalty-percent: u20, ;; 20% fixed penalty
          amount-received: amount-after-penalty,
          full-withdrawal: true,
          remaining: u0,
          block-height: block-height,
          deposit-block: deposit-block,
          lock-not-completed: true,
        })

        (ok true)
      )
    )
  )
)

;; Claim rewards from a pool
;; @param pool-id: ID of the pool
(define-public (claim-rewards (pool-id uint))
  (let (
      (pool-info (unwrap! (get-pool-info-internal pool-id) ERR_POOL_NOT_FOUND))
      (user-stake (unwrap! (get-user-stake-internal pool-id tx-sender)
        ERR_INSUFFICIENT_BALANCE
      ))
    )
    ;; Update pool rewards
    (try! (update-pool-rewards pool-id))

    ;; Calculate pending rewards
    (let (
        (pending-rewards (unwrap! (calculate-pending-rewards-internal pool-id tx-sender)
          ERR_NO_REWARDS_AVAILABLE
        ))
        (reward-per-share (default-to u0 (map-get? pool-reward-per-share pool-id)))
        (user-amount (get amount user-stake))
      )
      (asserts! (> pending-rewards u0) ERR_NO_REWARDS_AVAILABLE)

      ;; Update user reward debt
      ;; reward-debt should be stored WITHOUT dividing by SCALING_FACTOR
      ;; because the pending calculation already divides by SCALING_FACTOR
      (map-set user-stakes {
        pool-id: pool-id,
        user: tx-sender,
      }
        (merge user-stake {
          reward-debt: (* user-amount reward-per-share),
          last-reward-block: block-height,
        })
      )

      ;; Distribute rewards by minting new tokens
      ;; The staking pool must be set as an authorized minter in the token contract
      (try! (contract-call? .sbtc-token-betavss mint pending-rewards tx-sender))

      ;; Update pool stats
      (map-set pools pool-id
        (merge pool-info { total-rewards-distributed: (+ (get total-rewards-distributed pool-info) pending-rewards) })
      )

      ;; Print claim event
      (print {
        type: "rewards_claimed_event",
        pool-id: pool-id,
        user: tx-sender,
        amount: pending-rewards,
        block-height: block-height,
      })

      (ok pending-rewards)
    )
  )
)

;; Read-only functions

;; Get pool information
;; @param pool-id: ID of the pool
(define-read-only (get-pool-info (pool-id uint))
  (map-get? pools pool-id)
)

;; Get user stake information
;; @param pool-id: ID of the pool
;; @param user: user address
(define-read-only (get-user-info
    (pool-id uint)
    (user principal)
  )
  (map-get? user-stakes {
    pool-id: pool-id,
    user: user,
  })
)

;; Get pending rewards for user
;; @param pool-id: ID of the pool
;; @param user: user address
(define-read-only (get-pending-rewards
    (pool-id uint)
    (user principal)
  )
  (calculate-pending-rewards-internal pool-id user)
)

;; Get pool count
(define-read-only (get-pool-count)
  (- (var-get next-pool-id) u1)
)

;; Get contract configuration
(define-read-only (get-contract-config)
  {
    contract-owner: CONTRACT_OWNER,
    contract-paused: (var-get contract-paused),
    sbtc-token-contract: (var-get sbtc-token-contract),
    rewards-distributor-contract: (var-get rewards-distributor-contract),
    next-pool-id: (var-get next-pool-id),
  }
)

;; Emergency functions

;; Pause contract (admin only)
(define-public (pause-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set contract-paused true)
    (print { type: "contract_paused_event" })
    (ok true)
  )
)

;; Resume contract (admin only)
(define-public (resume-contract)
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set contract-paused false)
    (print { type: "contract_resumed_event" })
    (ok true)
  )
)

;; Pause specific pool (admin only)
;; @param pool-id: ID of the pool to pause
(define-public (pause-pool (pool-id uint))
  (let ((pool-info (unwrap! (get-pool-info-internal pool-id) ERR_POOL_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (map-set pools pool-id (merge pool-info { active: false }))
    (print {
      type: "pool_paused_event",
      pool-id: pool-id,
    })
    (ok true)
  )
)

;; Resume specific pool (admin only)
;; @param pool-id: ID of the pool to resume
(define-public (resume-pool (pool-id uint))
  (let ((pool-info (unwrap! (get-pool-info-internal pool-id) ERR_POOL_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (map-set pools pool-id (merge pool-info { active: true }))
    (print {
      type: "pool_resumed_event",
      pool-id: pool-id,
    })
    (ok true)
  )
)
