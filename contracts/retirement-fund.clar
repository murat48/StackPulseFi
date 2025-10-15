;; Retirement Fund Contract - sBTC Based with APY Rewards
;; Allows users to create long-term retirement savings with yield generation

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-FUND-NOT-FOUND (err u404))
(define-constant ERR-FUND-LOCKED (err u403))
(define-constant ERR-INVALID-AMOUNT (err u400))
(define-constant ERR-INVALID-UNLOCK-HEIGHT (err u402))
(define-constant ERR-ALREADY-EXISTS (err u409))
(define-constant ERR-INVALID-DURATION (err u410))
(define-constant ERR-TRANSFER-FAILED (err u411))

;; Constants
(define-constant SCALING-FACTOR u100000000) ;; 8 decimals for sBTC
(define-constant EARLY-WITHDRAWAL-FEE u20) ;; 20% fee
(define-constant FEE-DENOMINATOR u100)
(define-constant BLOCKS-PER-YEAR u52560) ;; ~144 blocks/day * 365 days

;; APY rates based on lock duration (scaled by 100, so 800 = 8%)
(define-constant APY-5-YEARS u800) ;; 8% APY for 5 years
(define-constant APY-10-YEARS u1200) ;; 12% APY for 10 years
(define-constant APY-15-YEARS u1600) ;; 16% APY for 15 years
(define-constant APY-20-YEARS u2000) ;; 20% APY for 20+ years

;; Minimum lock period (5 years in blocks)
(define-constant MIN-LOCK-PERIOD (* BLOCKS-PER-YEAR u5))

;; Data Variables
(define-data-var fund-count uint u0)
(define-data-var sbtc-token principal 'ST2422HP3GFF0X0EZ785C8QPGW5951ZF0QR39PEC5.sbtc-token-betavss)

;; Fund structure
(define-map retirement-funds
  { fund-id: uint }
  {
    owner: principal,
    initial-deposit: uint,
    balance: uint,
    unlock-height: uint,
    created-at: uint,
    lock-duration-years: uint,
    apy-rate: uint,
    total-rewards-earned: uint,
    last-reward-claim-height: uint,
    is-active: bool,
  }
)

;; User's funds mapping (can have multiple retirement funds)
(define-map user-fund-ids
  {
    user: principal,
    index: uint,
  }
  { fund-id: uint }
)

(define-map user-fund-count
  { user: principal }
  { count: uint }
)

;; Read-only functions

(define-read-only (get-fund-count)
  (var-get fund-count)
)

(define-read-only (get-fund-info (fund-id uint))
  (map-get? retirement-funds { fund-id: fund-id })
)

(define-read-only (get-user-fund-count (user principal))
  (default-to { count: u0 } (map-get? user-fund-count { user: user }))
)

(define-read-only (get-user-fund
    (user principal)
    (index uint)
  )
  (map-get? user-fund-ids {
    user: user,
    index: index,
  })
)

(define-read-only (is-unlocked (fund-id uint))
  (match (map-get? retirement-funds { fund-id: fund-id })
    fund (>= block-height (get unlock-height fund))
    false
  )
)

;; Calculate APY rate based on lock duration
(define-read-only (calculate-apy-rate (lock-duration-blocks uint))
  (let ((duration-years (/ lock-duration-blocks BLOCKS-PER-YEAR)))
    (if (>= duration-years u20)
      APY-20-YEARS
      (if (>= duration-years u15)
        APY-15-YEARS
        (if (>= duration-years u10)
          APY-10-YEARS
          APY-5-YEARS
        )
      )
    )
  )
)

;; Calculate pending rewards based on time and APY
(define-read-only (calculate-pending-rewards (fund-id uint))
  (match (map-get? retirement-funds { fund-id: fund-id })
    fund (let (
        (balance (get balance fund))
        (apy-rate (get apy-rate fund))
        (blocks-passed (- block-height (get last-reward-claim-height fund)))
        (years-passed-scaled (* blocks-passed SCALING-FACTOR))
        (years-divisor (* BLOCKS-PER-YEAR SCALING-FACTOR))
        ;; Reward = Balance * APY * (Blocks Passed / Blocks Per Year)
        ;; APY is scaled by 100, so divide by 10000
        (reward-amount (/ (* (* balance apy-rate) years-passed-scaled) (* years-divisor u10000)))
      )
      reward-amount
    )
    u0
  )
)

;; Calculate early withdrawal fee (20%)
(define-read-only (calculate-early-withdrawal-fee (amount uint))
  (/ (* amount EARLY-WITHDRAWAL-FEE) FEE-DENOMINATOR)
)

;; Calculate total balance including rewards
(define-read-only (get-total-balance (fund-id uint))
  (match (map-get? retirement-funds { fund-id: fund-id })
    fund (+ (get balance fund) (calculate-pending-rewards fund-id))
    u0
  )
)

;; Public functions

(define-public (create-retirement-fund
    (initial-deposit uint)
    (lock-duration-years uint)
  )
  (let (
      (fund-id (+ (var-get fund-count) u1))
      (sender tx-sender)
      (lock-duration-blocks (* lock-duration-years BLOCKS-PER-YEAR))
      (unlock-height (+ block-height lock-duration-blocks))
      (apy-rate (calculate-apy-rate lock-duration-blocks))
      (sbtc-contract (var-get sbtc-token))
    )
    ;; Validations
    (asserts! (> initial-deposit u0) ERR-INVALID-AMOUNT)
    (asserts! (>= lock-duration-years u5) ERR-INVALID-DURATION)

    ;; Transfer sBTC from user to contract
    (try! (contract-call? .sbtc-token-betavss transfer initial-deposit sender
      (as-contract tx-sender) none
    ))

    ;; Create fund
    (map-set retirement-funds { fund-id: fund-id } {
      owner: sender,
      initial-deposit: initial-deposit,
      balance: initial-deposit,
      unlock-height: unlock-height,
      created-at: block-height,
      lock-duration-years: lock-duration-years,
      apy-rate: apy-rate,
      total-rewards-earned: u0,
      last-reward-claim-height: block-height,
      is-active: true,
    })

    ;; Get user's current fund count
    (let ((user-count (get count (get-user-fund-count sender))))
      ;; Map user to fund with index
      (map-set user-fund-ids {
        user: sender,
        index: user-count,
      } { fund-id: fund-id }
      )

      ;; Increment user's fund count
      (map-set user-fund-count { user: sender } { count: (+ user-count u1) })
    )

    ;; Increment global counter
    (var-set fund-count fund-id)
    (ok fund-id)
  )
)

(define-public (contribute
    (fund-id uint)
    (amount uint)
  )
  (let (
      (fund (unwrap! (map-get? retirement-funds { fund-id: fund-id })
        ERR-FUND-NOT-FOUND
      ))
      (sender tx-sender)
    )
    ;; Validations
    (asserts! (is-eq sender (get owner fund)) ERR-NOT-AUTHORIZED)
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get is-active fund) ERR-FUND-LOCKED)

    ;; Transfer sBTC contribution
    (try! (contract-call? .sbtc-token-betavss transfer amount sender
      (as-contract tx-sender) none
    ))

    ;; Update fund
    (map-set retirement-funds { fund-id: fund-id }
      (merge fund { balance: (+ (get balance fund) amount) })
    )

    (ok true)
  )
)

;; Claim accumulated rewards
(define-public (claim-rewards (fund-id uint))
  (let (
      (fund (unwrap! (map-get? retirement-funds { fund-id: fund-id })
        ERR-FUND-NOT-FOUND
      ))
      (sender tx-sender)
      (pending-rewards (calculate-pending-rewards fund-id))
    )
    ;; Validations
    (asserts! (is-eq sender (get owner fund)) ERR-NOT-AUTHORIZED)
    (asserts! (> pending-rewards u0) ERR-INVALID-AMOUNT)
    (asserts! (get is-active fund) ERR-FUND-LOCKED)

    ;; Update fund with claimed rewards added to balance
    (map-set retirement-funds { fund-id: fund-id }
      (merge fund {
        balance: (+ (get balance fund) pending-rewards),
        total-rewards-earned: (+ (get total-rewards-earned fund) pending-rewards),
        last-reward-claim-height: block-height,
      })
    )

    (ok pending-rewards)
  )
)

;; Normal withdrawal after unlock period (no fee)
(define-public (withdraw
    (fund-id uint)
    (amount uint)
  )
  (let (
      (fund (unwrap! (map-get? retirement-funds { fund-id: fund-id })
        ERR-FUND-NOT-FOUND
      ))
      (sender tx-sender)
      (pending-rewards (calculate-pending-rewards fund-id))
      (total-available (+ (get balance fund) pending-rewards))
    )
    ;; Validations
    (asserts! (is-eq sender (get owner fund)) ERR-NOT-AUTHORIZED)
    (asserts! (>= block-height (get unlock-height fund)) ERR-FUND-LOCKED)
    (asserts! (<= amount total-available) ERR-INVALID-AMOUNT)

    ;; First claim any pending rewards
    (and
      (> pending-rewards u0)
      (is-ok (claim-rewards fund-id))
    )

    ;; Transfer sBTC withdrawal
    (try! (as-contract (contract-call? .sbtc-token-betavss transfer amount tx-sender sender none)))

    ;; Update fund
    (let ((updated-fund (unwrap! (map-get? retirement-funds { fund-id: fund-id })
        ERR-FUND-NOT-FOUND
      )))
      (map-set retirement-funds { fund-id: fund-id }
        (merge updated-fund { balance: (- (get balance updated-fund) amount) })
      )
    )

    (ok true)
  )
)

;; Early withdrawal with 20% fee
(define-public (withdraw-early
    (fund-id uint)
    (amount uint)
  )
  (let (
      (fund (unwrap! (map-get? retirement-funds { fund-id: fund-id })
        ERR-FUND-NOT-FOUND
      ))
      (sender tx-sender)
      (fee-amount (calculate-early-withdrawal-fee amount))
      (net-amount (- amount fee-amount))
    )
    ;; Validations
    (asserts! (is-eq sender (get owner fund)) ERR-NOT-AUTHORIZED)
    (asserts! (< block-height (get unlock-height fund)) ERR-INVALID-UNLOCK-HEIGHT)
    (asserts! (<= amount (get balance fund)) ERR-INVALID-AMOUNT)
    (asserts! (get is-active fund) ERR-FUND-LOCKED)

    ;; Transfer net amount to user (after fee)
    (try! (as-contract (contract-call? .sbtc-token-betavss transfer net-amount tx-sender sender none)))

    ;; Fee stays in contract (can be collected by admin or burned)

    ;; Update fund
    (map-set retirement-funds { fund-id: fund-id }
      (merge fund { balance: (- (get balance fund) amount) })
    )

    (ok {
      withdrawn: net-amount,
      fee: fee-amount,
    })
  )
)

(define-public (close-fund (fund-id uint))
  (let (
      (fund (unwrap! (map-get? retirement-funds { fund-id: fund-id })
        ERR-FUND-NOT-FOUND
      ))
      (sender tx-sender)
      (pending-rewards (calculate-pending-rewards fund-id))
      (total-balance (+ (get balance fund) pending-rewards))
    )
    ;; Validations
    (asserts! (is-eq sender (get owner fund)) ERR-NOT-AUTHORIZED)
    (asserts! (>= block-height (get unlock-height fund)) ERR-FUND-LOCKED)

    ;; Claim any pending rewards first
    (and
      (> pending-rewards u0)
      (is-ok (claim-rewards fund-id))
    )

    ;; Transfer remaining balance
    (let ((updated-fund (unwrap! (map-get? retirement-funds { fund-id: fund-id })
        ERR-FUND-NOT-FOUND
      )))
      (and
        (> (get balance updated-fund) u0)
        (is-ok (as-contract (contract-call? .sbtc-token-betavss transfer (get balance updated-fund)
          tx-sender sender none
        )))
      )

      ;; Deactivate fund
      (map-set retirement-funds { fund-id: fund-id }
        (merge updated-fund {
          balance: u0,
          is-active: false,
        })
      )
    )

    (ok true)
  )
)

;; Admin function to set sBTC token contract
(define-public (set-sbtc-token (token-contract principal))
  (begin
    (asserts!
      (is-eq tx-sender
        (get owner
          (unwrap! (map-get? retirement-funds { fund-id: u1 }) ERR-NOT-AUTHORIZED)
        ))
      ERR-NOT-AUTHORIZED
    )
    (var-set sbtc-token token-contract)
    (ok true)
  )
)
