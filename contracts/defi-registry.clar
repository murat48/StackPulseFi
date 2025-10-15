;; DeFi Registry Contract
;; Stores and manages metadata for DeFi protocols on Stacks

;; Constants
(define-constant contract-owner tx-sender)
(define-constant err-owner-only (err u100))
(define-constant err-protocol-not-found (err u101))
(define-constant err-protocol-exists (err u102))
(define-constant err-invalid-data (err u103))

;; Data Variables
(define-data-var protocol-counter uint u0)

;; Data Maps
(define-map protocols
  { protocol-id: uint }
  {
    name: (string-ascii 64),
    protocol-type: (string-ascii 32),
    contract-address: principal,
    tvl: uint,
    apy: uint,
    is-active: bool,
    audit-status: (string-ascii 32),
    registered-at: uint,
    updated-at: uint
  }
)

(define-map protocol-metadata
  { protocol-id: uint }
  {
    website: (string-ascii 128),
    description: (string-utf8 256),
    risk-score: uint,
    liquidity: uint,
    volume-24h: uint
  }
)

(define-map protocol-name-to-id
  { name: (string-ascii 64) }
  { protocol-id: uint }
)

;; Read-only functions

(define-read-only (get-protocol (protocol-id uint))
  (map-get? protocols { protocol-id: protocol-id })
)

(define-read-only (get-protocol-metadata (protocol-id uint))
  (map-get? protocol-metadata { protocol-id: protocol-id })
)

(define-read-only (get-protocol-by-name (name (string-ascii 64)))
  (match (map-get? protocol-name-to-id { name: name })
    entry (get-protocol (get protocol-id entry))
    none
  )
)

(define-read-only (get-protocol-count)
  (ok (var-get protocol-counter))
)

(define-read-only (is-protocol-active (protocol-id uint))
  (match (get-protocol protocol-id)
    protocol (ok (get is-active protocol))
    (err err-protocol-not-found)
  )
)

;; Public functions

(define-public (register-protocol
  (name (string-ascii 64))
  (protocol-type (string-ascii 32))
  (contract-address principal)
  (tvl uint)
  (apy uint)
  (audit-status (string-ascii 32))
  (website (string-ascii 128))
  (description (string-utf8 256))
)
  (let
    (
      (protocol-id (var-get protocol-counter))
      (current-block block-height)
    )
    ;; Check if caller is contract owner
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Check if protocol name already exists
    (asserts! (is-none (map-get? protocol-name-to-id { name: name })) err-protocol-exists)
    
    ;; Store protocol data
    (map-set protocols
      { protocol-id: protocol-id }
      {
        name: name,
        protocol-type: protocol-type,
        contract-address: contract-address,
        tvl: tvl,
        apy: apy,
        is-active: true,
        audit-status: audit-status,
        registered-at: current-block,
        updated-at: current-block
      }
    )
    
    ;; Store metadata
    (map-set protocol-metadata
      { protocol-id: protocol-id }
      {
        website: website,
        description: description,
        risk-score: u50,
        liquidity: u0,
        volume-24h: u0
      }
    )
    
    ;; Store name mapping
    (map-set protocol-name-to-id
      { name: name }
      { protocol-id: protocol-id }
    )
    
    ;; Increment counter
    (var-set protocol-counter (+ protocol-id u1))
    
    (ok protocol-id)
  )
)

(define-public (update-protocol-metrics
  (protocol-id uint)
  (tvl uint)
  (apy uint)
  (liquidity uint)
  (volume-24h uint)
)
  (let
    (
      (protocol (unwrap! (get-protocol protocol-id) err-protocol-not-found))
      (metadata (unwrap! (get-protocol-metadata protocol-id) err-protocol-not-found))
    )
    ;; Check if caller is contract owner
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Update protocol data
    (map-set protocols
      { protocol-id: protocol-id }
      (merge protocol {
        tvl: tvl,
        apy: apy,
        updated-at: block-height
      })
    )
    
    ;; Update metadata
    (map-set protocol-metadata
      { protocol-id: protocol-id }
      (merge metadata {
        liquidity: liquidity,
        volume-24h: volume-24h
      })
    )
    
    (ok true)
  )
)

(define-public (update-risk-score
  (protocol-id uint)
  (risk-score uint)
)
  (let
    (
      (metadata (unwrap! (get-protocol-metadata protocol-id) err-protocol-not-found))
    )
    ;; Check if caller is contract owner
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Validate risk score (0-100)
    (asserts! (<= risk-score u100) err-invalid-data)
    
    ;; Update risk score
    (map-set protocol-metadata
      { protocol-id: protocol-id }
      (merge metadata { risk-score: risk-score })
    )
    
    (ok true)
  )
)

(define-public (toggle-protocol-status (protocol-id uint))
  (let
    (
      (protocol (unwrap! (get-protocol protocol-id) err-protocol-not-found))
    )
    ;; Check if caller is contract owner
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Toggle active status
    (map-set protocols
      { protocol-id: protocol-id }
      (merge protocol {
        is-active: (not (get is-active protocol)),
        updated-at: block-height
      })
    )
    
    (ok true)
  )
)

(define-public (update-audit-status
  (protocol-id uint)
  (audit-status (string-ascii 32))
)
  (let
    (
      (protocol (unwrap! (get-protocol protocol-id) err-protocol-not-found))
    )
    ;; Check if caller is contract owner
    (asserts! (is-eq tx-sender contract-owner) err-owner-only)
    
    ;; Update audit status
    (map-set protocols
      { protocol-id: protocol-id }
      (merge protocol {
        audit-status: audit-status,
        updated-at: block-height
      })
    )
    
    (ok true)
  )
)

;; Initialize contract
(begin
  (print "DeFi Registry Contract Initialized")
)

