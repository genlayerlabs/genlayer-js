# Staking Methods

Methods for validator and delegator staking operations, epoch queries, and network status.

### validatorJoin

Joins as a validator with the specified stake amount.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| amount | `bigint \| string` | yes |  |
| operator | `Address` | no |  |

**Returns:** `ValidatorJoinResult`

---

### validatorDeposit

Adds additional self-stake to an active validator position.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| amount | `bigint \| string` | yes |  |

**Returns:** `StakingTransactionResult`

---

### validatorExit

Exits a validator position by burning the specified shares.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| shares | `bigint \| string` | yes |  |

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

Sets the operator address for a validator wallet.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| validator | `Address` | yes |  |
| operator | `Address` | yes |  |

**Returns:** `StakingTransactionResult`

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

Checks if an address is an active validator.

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

Returns addresses of all currently active validators.

_No parameters._

**Returns:** `Address[]`

---

### getActiveValidatorsCount

Returns the count of active validators.

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

