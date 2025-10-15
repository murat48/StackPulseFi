;; Education Fund Contract - sBTC Based with APY Rewards
;; Simplified version focusing on yield generation and early withdrawal

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u401))
(define-constant ERR-FUND-NOT-FOUND (err u404))
(define-constant ERR-FUND-LOCKED (err u403))
(define-constant ERR-INVALID-AMOUNT (err u400))
(define-constant ERR-INVALID-UNLOCK-HEIGHT (err u402))
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

;; Fund structure - Simplified for education
(define-map education-funds
  { fund-id: uint }
  {
    creator: principal,
    guardian: principal,
    initial-deposit: uint,
    balance: uint,
    unlock-height: uint,
    created-at: uint,
    lock-duration-years: uint,
    apy-rate: uint,
    goal-amount: uint,
    total-rewards-earned: uint,
    last-reward-claim-height: uint,
    is-active: bool,
    fund-name: (string-ascii 50),
  }
)

;; Creator's funds mapping (can have multiple education funds)
(define-map creator-funds
  {
    creator: principal,
    index: uint,
  }
  { fund-id: uint }
)

(define-map creator-fund-count
  { creator: principal }
  { count: uint }
)

;; Read-only functions

(define-read-only (get-fund-count)
  (var-get fund-count)
)

(define-read-only (get-fund-info (fund-id uint))
  (map-get? education-funds { fund-id: fund-id })
)

(define-read-only (get-creator-fund-count (creator principal))
  (default-to { count: u0 } (map-get? creator-fund-count { creator: creator }))
)

(define-read-only (get-creator-fund
    (creator principal)
    (index uint)
  )
  (map-get? creator-funds {
    creator: creator,
    index: index,
  })
)

(define-read-only (is-unlocked (fund-id uint))
  (match (map-get? education-funds { fund-id: fund-id })
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
  (match (map-get? education-funds { fund-id: fund-id })
    fund (let (
        (balance (get balance fund))
        (apy-rate (get apy-rate fund))
        (blocks-passed (- block-height (get last-reward-claim-height fund)))
        (years-passed-scaled (* blocks-passed SCALING-FACTOR))
        (years-divisor (* BLOCKS-PER-YEAR SCALING-FACTOR))
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

;; Calculate funding progress
(define-read-only (calculate-progress (fund-id uint))
  (match (map-get? education-funds { fund-id: fund-id })
    fund (let (
        (balance (+ (get balance fund) (calculate-pending-rewards fund-id)))
        (goal (get goal-amount fund))
      )
      (if (is-eq goal u0)
        u100
        (if (>= balance goal)
          u100
          (/ (* balance u100) goal)
        )
      )
    )
    u0
  )
)

;; Calculate total balance including rewards
(define-read-only (get-total-balance (fund-id uint))
  (match (map-get? education-funds { fund-id: fund-id })
    fund (+ (get balance fund) (calculate-pending-rewards fund-id))
    u0
  )
)

;; Public functions

(define-public (create-education-fund
    (initial-deposit uint)
    (guardian principal)
    (lock-duration-years uint)
    (goal-amount uint)
    (fund-name (string-ascii 50))
  )
  (let (
      (fund-id (+ (var-get fund-count) u1))
      (sender tx-sender)
      (current-count (get count (get-creator-fund-count sender)))
      (lock-duration-blocks (* lock-duration-years BLOCKS-PER-YEAR))
      (unlock-height (+ block-height lock-duration-blocks))
      (apy-rate (calculate-apy-rate lock-duration-blocks))
    )
    ;; Validations
    (asserts! (> initial-deposit u0) ERR-INVALID-AMOUNT)
    (asserts! (>= lock-duration-years u5) ERR-INVALID-DURATION)
    (asserts! (not (is-eq guardian sender)) ERR-NOT-AUTHORIZED)

    ;; Transfer sBTC from creator to contract
    (try! (contract-call? .sbtc-token-betavss transfer initial-deposit sender
      (as-contract tx-sender) none
    ))

    ;; Create fund
    (map-set education-funds { fund-id: fund-id } {
      creator: sender,
      guardian: guardian,
      initial-deposit: initial-deposit,
      balance: initial-deposit,
      unlock-height: unlock-height,
      created-at: block-height,
      lock-duration-years: lock-duration-years,
      apy-rate: apy-rate,
      goal-amount: goal-amount,
      total-rewards-earned: u0,
      last-reward-claim-height: block-height,
      is-active: true,
      fund-name: fund-name,
    })

    ;; Map creator to fund
    (map-set creator-funds {
      creator: sender,
      index: current-count,
    } { fund-id: fund-id }
    )

    (map-set creator-fund-count { creator: sender } { count: (+ current-count u1) })

    ;; Increment counter
    (var-set fund-count fund-id)

    (ok fund-id)
  )
)

;; Anyone can contribute to education fund
(define-public (contribute
    (fund-id uint)
    (amount uint)
  )
  (let (
      (fund (unwrap! (map-get? education-funds { fund-id: fund-id }) ERR-FUND-NOT-FOUND))
      (sender tx-sender)
    )
    ;; Validations
    (asserts! (> amount u0) ERR-INVALID-AMOUNT)
    (asserts! (get is-active fund) ERR-FUND-LOCKED)

    ;; Transfer sBTC contribution
    (try! (contract-call? .sbtc-token-betavss transfer amount sender
      (as-contract tx-sender) none
    ))

    ;; Update fund
    (map-set education-funds { fund-id: fund-id }
      (merge fund { balance: (+ (get balance fund) amount) })
    )

    (ok true)
  )
)

;; Claim accumulated rewards
(define-public (claim-rewards (fund-id uint))
  (let (
      (fund (unwrap! (map-get? education-funds { fund-id: fund-id }) ERR-FUND-NOT-FOUND))
      (sender tx-sender)
      (pending-rewards (calculate-pending-rewards fund-id))
    )
    ;; Validations - Only creator or guardian can claim
    (asserts!
      (or (is-eq sender (get creator fund)) (is-eq sender (get guardian fund)))
      ERR-NOT-AUTHORIZED
    )
    (asserts! (> pending-rewards u0) ERR-INVALID-AMOUNT)
    (asserts! (get is-active fund) ERR-FUND-LOCKED)

    ;; Update fund with claimed rewards added to balance
    (map-set education-funds { fund-id: fund-id }
      (merge fund {
        balance: (+ (get balance fund) pending-rewards),
        total-rewards-earned: (+ (get total-rewards-earned fund) pending-rewards),
        last-reward-claim-height: block-height,
      })
    )

    (ok pending-rewards)
  )
)

;; Guardian withdrawal after unlock (no fee)
(define-public (guardian-withdraw
    (fund-id uint)
    (amount uint)
  )
  (let (
      (fund (unwrap! (map-get? education-funds { fund-id: fund-id }) ERR-FUND-NOT-FOUND))
      (sender tx-sender)
      (pending-rewards (calculate-pending-rewards fund-id))
      (total-available (+ (get balance fund) pending-rewards))
    )
    ;; Validations
    (asserts! (is-eq sender (get guardian fund)) ERR-NOT-AUTHORIZED)
    (asserts! (>= block-height (get unlock-height fund)) ERR-FUND-LOCKED)
    (asserts! (<= amount total-available) ERR-INVALID-AMOUNT)

    ;; First claim any pending rewards
    (and
      (> pending-rewards u0)
      (is-ok (claim-rewards fund-id))
    )

    ;; Transfer sBTC to guardian
    (let ((updated-fund (unwrap! (map-get? education-funds { fund-id: fund-id }) ERR-FUND-NOT-FOUND)))
      (try! (as-contract (contract-call? .sbtc-token-betavss transfer amount tx-sender sender none)))

      ;; Update fund
      (map-set education-funds { fund-id: fund-id }
        (merge updated-fund { balance: (- (get balance updated-fund) amount) })
      )
    )

    (ok true)
  )
)

;; Early withdrawal with 20% fee (creator or guardian can initiate)
(define-public (withdraw-early
    (fund-id uint)
    (amount uint)
  )
  (let (
      (fund (unwrap! (map-get? education-funds { fund-id: fund-id }) ERR-FUND-NOT-FOUND))
      (sender tx-sender)
      (fee-amount (calculate-early-withdrawal-fee amount))
      (net-amount (- amount fee-amount))
    )
    ;; Validations - Creator or guardian can do early withdrawal
    (asserts!
      (or (is-eq sender (get creator fund)) (is-eq sender (get guardian fund)))
      ERR-NOT-AUTHORIZED
    )
    (asserts! (< block-height (get unlock-height fund)) ERR-INVALID-UNLOCK-HEIGHT)
    (asserts! (<= amount (get balance fund)) ERR-INVALID-AMOUNT)
    (asserts! (get is-active fund) ERR-FUND-LOCKED)

    ;; Transfer net amount to sender (after fee)
    (try! (as-contract (contract-call? .sbtc-token-betavss transfer net-amount tx-sender sender none)))

    ;; Fee stays in contract

    ;; Update fund
    (map-set education-funds { fund-id: fund-id }
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
      (fund (unwrap! (map-get? education-funds { fund-id: fund-id }) ERR-FUND-NOT-FOUND))
      (sender tx-sender)
      (pending-rewards (calculate-pending-rewards fund-id))
    )
    ;; Validations - Only creator can close
    (asserts! (is-eq sender (get creator fund)) ERR-NOT-AUTHORIZED)
    (asserts! (>= block-height (get unlock-height fund)) ERR-FUND-LOCKED)

    ;; Claim any pending rewards first
    (and
      (> pending-rewards u0)
      (is-ok (claim-rewards fund-id))
    )

    ;; Transfer remaining balance to creator
    (let ((updated-fund (unwrap! (map-get? education-funds { fund-id: fund-id }) ERR-FUND-NOT-FOUND)))
      (and
        (> (get balance updated-fund) u0)
        (is-ok (as-contract (contract-call? .sbtc-token-betavss transfer (get balance updated-fund)
          tx-sender sender none
        )))
      )

      ;; Deactivate fund
      (map-set education-funds { fund-id: fund-id }
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
        (get creator
          (unwrap! (map-get? education-funds { fund-id: u1 }) ERR-NOT-AUTHORIZED)
        ))
      ERR-NOT-AUTHORIZED
    )
    (var-set sbtc-token token-contract)
    (ok true)
  )
)
