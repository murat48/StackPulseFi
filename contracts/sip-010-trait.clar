;; SIP-010 Fungible Token Standard v6
;; This trait defines the interface that all SIP-010 compliant tokens must implement
;; Similar to ERC-20 on Ethereum

(define-trait sip-010-trait
  (
    ;; Transfer tokens from sender to recipient
    ;; @param amount: number of tokens to transfer
    ;; @param sender: principal sending the tokens
    ;; @param recipient: principal receiving the tokens
    ;; @param memo: optional memo (up to 34 bytes)
    ;; @returns: (response bool uint) - success or error code
    (transfer (uint principal principal (optional (buff 34))) (response bool uint))
    
    ;; Get the human-readable token name
    ;; @returns: (response (string-ascii 32) uint)
    (get-name () (response (string-ascii 32) uint))
    
    ;; Get the token symbol/ticker
    ;; @returns: (response (string-ascii 32) uint)
    (get-symbol () (response (string-ascii 32) uint))
    
    ;; Get the number of decimal places
    ;; @returns: (response uint uint)
    (get-decimals () (response uint uint))
    
    ;; Get the balance of a specific address
    ;; @param who: principal to check balance for
    ;; @returns: (response uint uint) - balance or error code
    (get-balance (principal) (response uint uint))
    
    ;; Get the total supply of tokens
    ;; @returns: (response uint uint) - total supply or error code
    (get-total-supply () (response uint uint))
    
    ;; Get the token metadata URI
    ;; @returns: (response (optional (string-utf8 256)) uint)
    (get-token-uri () (response (optional (string-utf8 256)) uint))
  )
)


