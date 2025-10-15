;; sBTC Token Contract v5
;; SIP-010 compatible fungible token for Stacks blockchain
;; This token follows the SIP-010 standard (similar to ERC-20)

;; Import SIP-010 trait
(use-trait sip-010-trait .sip-trait-alphavss.sip-010-trait)

;; Define the fungible token
;; Using Clarity's built-in fungible token support
(define-fungible-token sbtc-token)

;; Constants
(define-constant CONTRACT_OWNER tx-sender)
(define-constant TOKEN_NAME "sBTC")
(define-constant TOKEN_SYMBOL "sBTC")
(define-constant TOKEN_DECIMALS u8)
(define-constant TOKEN_MAX_SUPPLY u2100000000000000) ;; 21M sBTC with 8 decimals

;; Error codes
(define-constant ERR_OWNER_ONLY (err u100))
(define-constant ERR_NOT_TOKEN_OWNER (err u101))
(define-constant ERR_INSUFFICIENT_BALANCE (err u102))
(define-constant ERR_INVALID_AMOUNT (err u103))

;; Data variables
(define-data-var token-uri (optional (string-utf8 256)) (some u"https://stacks.co/sbtc"))

;; Authorized minters (for rewards distribution)
(define-map authorized-minters
  principal
  bool
)

;; SIP-010 Standard Functions

;; Transfer tokens
;; @param amount: amount of tokens to transfer (in satoshis)
;; @param sender: principal sending tokens
;; @param recipient: principal receiving tokens  
;; @param memo: optional memo for the transfer
(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender))
      ERR_NOT_TOKEN_OWNER
    )
    (try! (ft-transfer? sbtc-token amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

;; Get name of token
(define-read-only (get-name)
  (ok TOKEN_NAME)
)

;; Get symbol of token
(define-read-only (get-symbol)
  (ok TOKEN_SYMBOL)
)

;; Get number of decimals
(define-read-only (get-decimals)
  (ok TOKEN_DECIMALS)
)

;; Get balance of account
;; @param who: principal to check balance for
(define-read-only (get-balance (who principal))
  (ok (ft-get-balance sbtc-token who))
)

;; Get total supply
(define-read-only (get-total-supply)
  (ok (ft-get-supply sbtc-token))
)

;; Get token URI
(define-read-only (get-token-uri)
  (ok (var-get token-uri))
)

;; Admin functions

;; Mint tokens to recipient (admin or authorized minter)
;; @param amount: amount of tokens to mint
;; @param recipient: principal to receive minted tokens
(define-public (mint
    (amount uint)
    (recipient principal)
  )
  (begin
    ;; Check if caller is owner OR authorized minter
    (asserts!
      (or
        (is-eq tx-sender CONTRACT_OWNER)
        (is-eq (default-to false (map-get? authorized-minters contract-caller))
          true
        )
      )
      ERR_OWNER_ONLY
    )
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (asserts! (<= (+ (ft-get-supply sbtc-token) amount) TOKEN_MAX_SUPPLY)
      ERR_INVALID_AMOUNT
    )
    (try! (ft-mint? sbtc-token amount recipient))
    (print {
      type: "sip010_mint_event",
      token-contract: (as-contract tx-sender),
      minter: contract-caller,
      amount: amount,
      recipient: recipient,
    })
    (ok true)
  )
)

;; WARNING: TEST ONLY - Mint tokens for testing (anyone can call)
;; This function allows anyone to mint tokens for testing purposes
;; DO NOT USE IN PRODUCTION - This is only for development/testing
;; @param amount: amount of tokens to mint (max 10,000 sBTC per call)
(define-public (test-mint (amount uint))
  (begin
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    ;; Limit to 10,000 sBTC (10000 * 10^8 = 1,000,000,000,000 satoshis) per mint for safety
    (asserts! (<= amount u1000000000000) ERR_INVALID_AMOUNT)
    (asserts! (<= (+ (ft-get-supply sbtc-token) amount) TOKEN_MAX_SUPPLY)
      ERR_INVALID_AMOUNT
    )
    (try! (ft-mint? sbtc-token amount tx-sender))
    (print {
      type: "sip010_test_mint_event",
      token-contract: (as-contract tx-sender),
      amount: amount,
      recipient: tx-sender,
      note: "TEST MINT - FOR DEVELOPMENT ONLY",
    })
    (ok true)
  )
)

;; Set authorized minter (admin only)
;; @param minter: principal to authorize/revoke  
;; @param authorized: true to authorize, false to revoke
(define-public (set-authorized-minter
    (minter principal)
    (authorized bool)
  )
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (map-set authorized-minters minter authorized)
    (print {
      type: "authorized_minter_updated",
      minter: minter,
      authorized: authorized,
    })
    (ok true)
  )
)

;; Check if principal is authorized minter
(define-read-only (is-authorized-minter (minter principal))
  (ok (default-to false (map-get? authorized-minters minter)))
)

;; Burn tokens from owner (admin only)
;; @param amount: amount of tokens to burn
;; @param owner: principal whose tokens to burn
(define-public (burn
    (amount uint)
    (owner principal)
  )
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (asserts! (> amount u0) ERR_INVALID_AMOUNT)
    (try! (ft-burn? sbtc-token amount owner))
    (print {
      type: "sip010_burn_event",
      token-contract: (as-contract tx-sender),
      amount: amount,
      owner: owner,
    })
    (ok true)
  )
)

;; Set token URI (admin only)
;; @param uri: new token URI
(define-public (set-token-uri (uri (string-utf8 256)))
  (begin
    (asserts! (is-eq tx-sender CONTRACT_OWNER) ERR_OWNER_ONLY)
    (ok (var-set token-uri (some uri)))
  )
)

;; Initialize contract with initial mint to deployer for testing
(begin
  ;; Mint 1000 sBTC to contract owner for testing
  (unwrap-panic (ft-mint? sbtc-token u100000000000 CONTRACT_OWNER))
)
