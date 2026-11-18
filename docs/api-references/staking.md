# Staking Methods

Methods for validator and delegator staking operations, epoch queries, and network status.

### validatorJoin

Joins as a validator with the specified stake amount.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| amount | `bigint \| string` | yes |  |
| registration | `OperatorRegistrationProof` | yes |  |

**Returns:** `ValidatorJoinResult`

---

### validatorDeposit

Adds additional self-stake to an active validator position. The
underlying Staking contract requires msg.sender == ValidatorWallet,
so the call is routed through the wallet's own validatorDeposit
forwarder (which re-enters Staking with the correct sender).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| amount | `bigint \| string` | yes |  |
| validator | `Address` | yes |  |

**Returns:** `StakingTransactionResult`

---

### validatorExit

Exits a validator position by burning the specified shares. Same
msg.sender constraint as validatorDeposit — routed via the wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| shares | `bigint \| string` | yes |  |
| validator | `Address` | yes |  |

**Returns:** `StakingTransactionResult`

---

### validatorClaim

Claims pending validator withdrawals.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | no |  |

**Returns:** `StakingTransactionResult & {claimedAmount: bigint}`

---

### validatorPrime

Primes a validator for participation in the next epoch.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |

**Returns:** `StakingTransactionResult`

---

### setOperator

@deprecated Use initiateOperatorTransfer followed by completeOperatorTransfer.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |
| operator | `Address` | yes |  |

**Returns:** `StakingTransactionResult`

---

### initiateOperatorTransfer

Starts the two-step operator rotation. The proof is checked against the
wallet-bound context before submission so a registration built for the
wrong registrar fails locally instead of as an opaque on-chain revert.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| options | `InitiateOperatorTransferOptions` | yes |  |

**Returns:** `StakingTransactionResult`

---

### completeOperatorTransfer

Completes a pending rotation. Callable by the wallet owner or the pending
operator, and only once the factory's operatorTransferDelay has elapsed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| options | `CompleteOperatorTransferOptions` | yes |  |

**Returns:** `StakingTransactionResult`

---

### cancelOperatorTransfer

Abandons a pending rotation, leaving the current operator in place.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| options | `CancelOperatorTransferOptions` | yes |  |

**Returns:** `StakingTransactionResult`

---

### getPendingOperator

Reads the pending operator and when its transfer was initiated.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |

**Returns:** `PendingOperatorInfo`

---

### setIdentity

Sets validator identity information (name, website, social links).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |
| moniker | `string` | yes |  |
| logoUri | `string` | no |  |
| website | `string` | no |  |
| description | `string` | no |  |
| email | `string` | no |  |
| twitter | `string` | no |  |
| telegram | `string` | no |  |
| github | `string` | no |  |
| extraCid | `string` | no |  |

**Returns:** `StakingTransactionResult`

---

### delegatorJoin

Delegates stake to a validator.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |
| amount | `bigint \| string` | yes |  |

**Returns:** `DelegatorJoinResult`

---

### delegatorExit

Exits a delegation by burning the specified shares.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |
| shares | `bigint \| string` | yes |  |

**Returns:** `StakingTransactionResult`

---

### delegatorClaim

Claims pending delegator withdrawals.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |
| delegator | `Address` | no |  |

**Returns:** `StakingTransactionResult`

---

### isValidator

Checks whether an address is a registered/joined validator wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | `Address` | yes |  |

**Returns:** `boolean`

---

### getValidatorInfo

Returns comprehensive information about a validator including stake, identity, and status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |

**Returns:** `ValidatorInfo`

---

### getCurrentEpoch

Returns the current epoch number.

_No parameters._

**Returns:** `bigint`

---

### isValidatorBelowMin

Checks whether a validator's self-stake is below the configured validator minimum.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |

**Returns:** `boolean`

---

### getStakeInfo

Returns delegation stake information for a delegator-validator pair.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| delegator | `Address` | yes |  |
| validator | `Address` | yes |  |

**Returns:** `StakeInfo`

---

### getEpochInfo

Returns current epoch information including timing, stake requirements, and inflation data.

_No parameters._

**Returns:** `EpochInfo`

---

### getEpochData

Returns detailed data for a specific epoch.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| epochNumber | `bigint` | yes |  |

**Returns:** `EpochData`

---

### getActiveValidators

Returns validators currently eligible for consensus duties.

_No parameters._

**Returns:** `Address[]`

---

### getActiveValidatorsCount

Returns the count of validators currently eligible for consensus duties.

_No parameters._

**Returns:** `bigint`

---

### getJoinedValidators

Returns every validator identity in the append-only joined registry.

_No parameters._

**Returns:** `Address[]`

---

### getJoinedValidatorsCount

Returns the size of the append-only joined validator registry.

_No parameters._

**Returns:** `bigint`

---

### getQuarantinedValidators

Returns addresses of validators currently in quarantine.

_No parameters._

**Returns:** `Address[]`

---

### getBannedValidators

Returns banned validators with ban duration and permanent ban status.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startIndex | `bigint` | no |  |
| size | `bigint` | no |  |

**Returns:** `BannedValidatorInfo[]`

---

### getQuarantinedValidatorsDetailed

Returns detailed quarantine information with pagination.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| startIndex | `bigint` | no |  |
| size | `bigint` | no |  |

**Returns:** `BannedValidatorInfo[]`

---

