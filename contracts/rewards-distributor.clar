;; Rewards Distributor Contract v6
;; Centralized reward distribution system for managing rewards across pools
;; Handles reward token management, allocation, and distribution

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant SCALING_FACTOR u100000000) ;; 1e8 for 8-decimal precision

;; Error codes
(define-constant ERR_OWNER_ONLY (err u200))
(define-constant ERR_INVALID_POOL (err u201))
(define-constant ERR_INSUFFICIENT_FUNDS (err u202))
(define-constant ERR_INVALID_AMOUNT (err u203))
(define-constant ERR_POOL_NOT_FOUND (err u204))
(define-constant ERR_INVALID_RATE (err u205))

;; Data variables
(define-data-var reward-token-contract (optional principal) none)
(define-data-var total-reward-funds uint u0)
(define-data-var next-pool-id uint u1)

;; Data maps

;; Pool reward configuration
;; pool-id -> { reward-rate: uint, allocation-weight: uint, active: bool }
(define-map pool-configs
  uint
  {
    reward-rate: uint, ;; Reward rate per block (scaled by SCALING_FACTOR)
    allocation-weight: uint, ;; Weight for reward allocation (1-100)
    active: bool, ;; Whether pool is active for rewards
    total-allocated: uint, ;; Total rewards allocated to this pool
  }
)

;; Pool reward statistics
;; pool-id -> { total-distributed: uint, last-update-block: uint }
(define-map pool-stats
  uint
  {
    total-distributed: uint,
    last-update-block: uint,
  }
)

;; Authorized distributors (contracts that can call distribute-reward)
(define-map authorized-distributors
  principal
  bool
)

;; Private functions

;; Check if caller is authorized to distribute rewards
(define-private (is-authorized-distributor (caller principal))
  (default-to false (map-get? authorized-distributors caller))
)

;; Get pool configuration
(define-private (get-pool-config (pool-id uint))
  (map-get? pool-configs pool-id)
)

;; Public functions

;; Admin functions

;; Set the reward token contract
;; @param token-contract: contract address of the reward token
(define-public (set-reward-token (token-contract principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (var-set reward-token-contract (some token-contract))
    (ok true)
  )
)

;; Add funds to the reward pool
;; @param amount: amount of tokens to add to reward pool
(define-public (fund-rewards (amount uint))
  (let ((reward-token (unwrap! (var-get reward-token-contract) ERR_INVALID_POOL)))
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)

    ;; Transfer tokens from sender to this contract
    (try! (contract-call? .sbtc-token-betavss transfer amount tx-sender
      (as-contract tx-sender) none
    ))

    ;; Update total funds
    (var-set total-reward-funds (+ (var-get total-reward-funds) amount))

    ;; Print funding event
    (print {
      type: "reward_funding_event",
      amount: amount,
      funder: tx-sender,
      total-funds: (var-get total-reward-funds),
    })

    (ok true)
  )
)

;; Configure reward rate and allocation for a pool
;; @param pool-id: ID of the pool
;; @param reward-rate: reward rate per block (scaled by SCALING_FACTOR)
;; @param allocation-weight: allocation weight (1-100)
(define-public (set-pool-reward-rate
    (pool-id uint)
    (reward-rate uint)
    (allocation-weight uint)
  )
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (asserts! (> allocation-weight u0) ERR_INVALID_AMOUNT)
    (asserts! (<= allocation-weight u100) ERR_INVALID_AMOUNT)

    ;; Update pool configuration
    (map-set pool-configs pool-id {
      reward-rate: reward-rate,
      allocation-weight: allocation-weight,
      active: true,
      total-allocated: (default-to u0 (get total-allocated (map-get? pool-configs pool-id))),
    })

    ;; Initialize pool stats if not exists
    (if (is-none (map-get? pool-stats pool-id))
      (map-set pool-stats pool-id {
        total-distributed: u0,
        last-update-block: block-height,
      })
      true
    )

    (print {
      type: "pool_reward_config_event",
      pool-id: pool-id,
      reward-rate: reward-rate,
      allocation-weight: allocation-weight,
    })

    (ok true)
  )
)

;; Authorize a contract to distribute rewards
;; @param distributor: contract address to authorize
(define-public (authorize-distributor (distributor principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (map-set authorized-distributors distributor true)
    (ok true)
  )
)

;; Revoke distributor authorization
;; @param distributor: contract address to revoke
(define-public (revoke-distributor (distributor principal))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (map-delete authorized-distributors distributor)
    (ok true)
  )
)

;; Distribution functions

;; Distribute rewards to a recipient (called by authorized contracts)
;; @param pool-id: ID of the pool
;; @param recipient: address to receive rewards
;; @param amount: amount of rewards to distribute
(define-public (distribute-reward
    (pool-id uint)
    (recipient principal)
    (amount uint)
  )
  (let (
      (reward-token (unwrap! (var-get reward-token-contract) ERR_INVALID_POOL))
      (pool-config (unwrap! (get-pool-config pool-id) ERR_POOL_NOT_FOUND))
      (current-funds (var-get total-reward-funds))
      (pool-stats-data (default-to {
        total-distributed: u0,
        last-update-block: block-height,
      }
        (map-get? pool-stats pool-id)
      ))
    )
    (asserts! (is-authorized-distributor tx-sender) ERR_OWNER_ONLY)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (>= current-funds amount) ERR_INSUFFICIENT_FUNDS)
    (asserts! (get active pool-config) ERR_INVALID_POOL)

    ;; Transfer rewards to recipient
    (try! (as-contract (contract-call? .sbtc-token-betavss transfer amount (as-contract tx-sender)
      recipient none
    )))

    ;; Update total funds
    (var-set total-reward-funds (- current-funds amount))

    ;; Update pool stats
    (map-set pool-stats pool-id {
      total-distributed: (+ (get total-distributed pool-stats-data) amount),
      last-update-block: block-height,
    })

    ;; Print distribution event
    (print {
      type: "reward_distribution_event",
      pool-id: pool-id,
      recipient: recipient,
      amount: amount,
      distributor: tx-sender,
    })

    (ok true)
  )
)

;; Calculate pool rewards based on stake and time
;; @param pool-id: ID of the pool
;; @param total-staked: total amount staked in the pool
;; @param blocks: number of blocks for reward calculation
(define-public (calculate-pool-rewards
    (pool-id uint)
    (total-staked uint)
    (blocks uint)
  )
  (let (
      (pool-config (unwrap! (get-pool-config pool-id) ERR_POOL_NOT_FOUND))
      (reward-rate (get reward-rate pool-config))
    )
    (asserts! (get active pool-config) ERR_INVALID_POOL)

    ;; Calculate rewards: (total-staked * reward-rate * blocks) / SCALING_FACTOR
    (ok (/ (* (* total-staked reward-rate) blocks) SCALING_FACTOR))
  )
)

;; Read-only functions

;; Get reward token contract
(define-read-only (get-reward-token)
  (var-get reward-token-contract)
)

;; Get total reward funds available
(define-read-only (get-total-reward-funds)
  (var-get total-reward-funds)
)

;; Get pool reward configuration
;; @param pool-id: ID of the pool
(define-read-only (get-pool-reward-config (pool-id uint))
  (map-get? pool-configs pool-id)
)

;; Get pool reward statistics
;; @param pool-id: ID of the pool
(define-read-only (get-pool-reward-stats (pool-id uint))
  (map-get? pool-stats pool-id)
)

;; Check if address is authorized distributor
;; @param distributor: address to check
(define-read-only (is-distributor-authorized (distributor principal))
  (is-authorized-distributor distributor)
)

;; Get reward rate for user stake calculation
;; @param pool-id: ID of the pool
;; @param user-stake: amount of user's stake
;; @param blocks: number of blocks for calculation
(define-read-only (calculate-user-rewards
    (pool-id uint)
    (user-stake uint)
    (blocks uint)
  )
  (let (
      (pool-config (unwrap! (get-pool-config pool-id) ERR_POOL_NOT_FOUND))
      (reward-rate (get reward-rate pool-config))
    )
    (if (get active pool-config)
      (ok (/ (* (* user-stake reward-rate) blocks) SCALING_FACTOR))
      (ok u0)
    )
  )
)

;; Emergency functions

;; Pause pool rewards (admin only)
;; @param pool-id: ID of the pool to pause
(define-public (pause-pool-rewards (pool-id uint))
  (let ((pool-config (unwrap! (get-pool-config pool-id) ERR_POOL_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)

    (map-set pool-configs pool-id (merge pool-config { active: false }))

    (print {
      type: "pool_rewards_paused_event",
      pool-id: pool-id,
    })

    (ok true)
  )
)

;; Resume pool rewards (admin only)
;; @param pool-id: ID of the pool to resume
(define-public (resume-pool-rewards (pool-id uint))
  (let ((pool-config (unwrap! (get-pool-config pool-id) ERR_POOL_NOT_FOUND)))
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)

    (map-set pool-configs pool-id (merge pool-config { active: true }))

    (print {
      type: "pool_rewards_resumed_event",
      pool-id: pool-id,
    })

    (ok true)
  )
)
