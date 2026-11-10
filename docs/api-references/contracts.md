# Contract Methods

Methods for deploying, reading, writing, and simulating GenLayer intelligent contracts.

### getContractCode

Retrieves the source code of a deployed contract.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | `Address` | yes |  |

**Returns:** `string`

---

### getContractSchema

Gets the schema (methods and constructor) of a deployed contract.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | `Address` | yes |  |

**Returns:** `ContractSchema`

---

### getContractSchemaForCode

Generates a schema for contract code without deploying it.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| contractCode | `string \| Uint8Array` | yes |  |

**Returns:** `ContractSchema`

---

### readContract

Executes a read-only contract call without modifying state.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| address | `Address` | yes |  |
| functionName | `string` | yes |  |
| args | `CalldataEncodable[]` | no |  |
| kwargs | `Map<string, CalldataEncodable> \| {[key: string]: CalldataEncodable}` | no |  |
| rawReturn | `RawReturn` | no |  |
| jsonSafeReturn | `boolean` | no |  |
| leaderOnly | `boolean` | no |  |
| transactionHashVariant | `TransactionHashVariant` | no |  |

**Returns:** `RawReturn extends true ? 0x${string} : CalldataEncodable`

---

### simulateWriteContract

Simulates a state-modifying contract call without executing on-chain.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| address | `Address` | yes |  |
| functionName | `string` | yes |  |
| args | `CalldataEncodable[]` | no |  |
| kwargs | `Map<string, CalldataEncodable> \| {[key: string]: CalldataEncodable}` | no |  |
| rawReturn | `RawReturn` | no |  |
| includeReceipt | `IncludeReceipt` | no |  |
| value | `BigNumberish` | no |  |
| leaderOnly | `boolean` | no |  |
| fees | `TransactionFeeOptions` | no |  |
| transactionHashVariant | `TransactionHashVariant` | no |  |

**Returns:** `IncludeReceipt extends true
      ? SimulateWriteContractResult<RawReturn>
      : RawReturn extends true ? 0x${string} : CalldataEncodable`

---

### writeContract

Executes a state-modifying function on a contract through consensus. Returns the transaction hash.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| address | `Address` | yes |  |
| functionName | `string` | yes |  |
| args | `CalldataEncodable[]` | no |  |
| kwargs | `Map<string, CalldataEncodable> \| {[key: string]: CalldataEncodable}` | no |  |
| value | `bigint` | no |  |
| leaderOnly | `boolean` | no |  |
| consensusMaxRotations | `number` | no |  |
| validUntil | `BigNumberish` | no |  |
| fees | `TransactionFeeOptions` | no |  |

**Returns:** `0x${string}`

---

### deployContract

Deploys a new intelligent contract to GenLayer. Returns the transaction hash.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| code | `string \| Uint8Array` | yes |  |
| args | `CalldataEncodable[]` | no |  |
| kwargs | `Map<string, CalldataEncodable> \| {[key: string]: CalldataEncodable}` | no |  |
| leaderOnly | `boolean` | no |  |
| consensusMaxRotations | `number` | no |  |
| validUntil | `BigNumberish` | no |  |
| fees | `TransactionFeeOptions` | no |  |

---

### getCurrentFeePolicy

Returns the active fee price policy used to build user-side caps.

_No parameters._

**Returns:** `FeePolicyQuote`

---

### estimateFeesDistribution

Builds a fee distribution with caps derived from the active fee policy.
Omitted rotations fund the chain's configured consensus maximum.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| args | `FeeEstimateOptions` | no |  |

**Returns:** `FeesDistribution`

---

### estimateTransactionFees

Builds a complete transaction `fees` object, including feeValue.
Studio has no on-chain FeeManager in the chain definition, so this uses
the same deterministic round-fee math as Studio trusted mode there.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| args | `FeeEstimateOptions` | no |  |

**Returns:** `TransactionFeeEstimate`

---

### estimateTransactionFeesFromSimulation

Builds a trusted fee preset from a representative Studio simulation.
This turns the returned fee accounting/report into execution and message
budgets while preserving mode-2 message allocations when the simulation
was run with them.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| args | `SimulationFeeEstimateOptions` | yes |  |

**Returns:** `TransactionFeeEstimate`

---

### estimateTransactionFeesForWrite

Builds a trusted fee preset for a concrete write call in one step.
The method first gives the simulation a baseline fee budget, then uses
the returned Studio/GenVM fee accounting to derive the preset the dapp
should pass with the real transaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| args | `WriteFeeEstimateOptions` | yes |  |

**Returns:** `TransactionFeeEstimate`

---

### getAppealCharge

Returns the full authoritative appeal charge (bond plus appeal funding).

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | ``0x${string}`` | yes |  |

**Returns:** `bigint`

---

### getMinAppealBond

@deprecated Use getAppealCharge. This legacy name also returns bond plus appeal funding.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | ``0x${string}`` | yes |  |

**Returns:** `bigint`

---

### getRoundNumber

Returns the current consensus round number for a transaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | ``0x${string}`` | yes |  |

**Returns:** `bigint`

---

### getRoundData

Returns detailed data for a specific consensus round.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | ``0x${string}`` | yes |  |
| round | `bigint` | yes |  |

---

### getLastRoundData

Returns the current round number and its data for a transaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | ``0x${string}`` | yes |  |

---

### canAppeal

Checks if a transaction can be appealed.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | ``0x${string}`` | yes |  |

**Returns:** `boolean`

---

### getDeveloperNft

Returns a developer's NFT reward record, or null when no NFT is registered.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| developer | `Address` | yes |  |

**Returns:** `DeveloperNft | null`

---

### getClaimableRewardsFromFees

Returns claimable developer-NFT rewards accrued from transaction fees.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| nftId | `BigNumberish` | yes |  |

**Returns:** `bigint`

---

### getClaimableRewardsFromInflation

Returns claimable developer-NFT rewards accrued from inflation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| nftId | `BigNumberish` | yes |  |
| numberOfEpochsToClaim | `BigNumberish` | yes |  |

**Returns:** `bigint`

---

### claimNftRewards

Claims all currently available rewards for a developer NFT. Returns the EVM transaction hash.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| nftId | `BigNumberish` | yes |  |

**Returns:** `0x${string}`

---

### claimNftEpochs

Claims a bounded number of reward epochs for a developer NFT. Returns the EVM transaction hash.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| nftId | `BigNumberish` | yes |  |
| numberOfEpochsToClaim | `BigNumberish` | yes |  |

**Returns:** `0x${string}`

---

### appealTransaction

Appeals a consensus transaction to trigger a new round of validation.
The call is bound to the active decision on both Studio and contract
networks. The schedule-extending entry point is safe for both pre-funded
and unfunded appeals, while submitAppeal rejects an unfunded next round.
When value is omitted, the authoritative appeal charge is used.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txId | ``0x${string}`` | yes |  |
| value | `bigint` | no |  |

---

### topUpFees

Deposits additional fee budget for an existing consensus transaction.
Returns the signed EVM envelope hash on every backend.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txId | ``0x${string}`` | yes |  |
| distribution | `FeesDistributionInput` | yes |  |
| value | `bigint` | yes |  |

**Returns:** `0x${string}`

---

### topUpAndSubmitAppeal

Deposits appeal fee budget and submits an appeal in the same consensus call.
Returns the existing GenLayer transaction id, matching appealTransaction.
The call is bound to the active decision on both Studio and contract
networks. When value is omitted, the authoritative appeal charge is used.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txId | ``0x${string}`` | yes |  |
| distribution | `FeesDistributionInput` | yes |  |
| value | `bigint` | no |  |

**Returns:** `0x${string}`

---

### finalizeTransaction

Finalizes a single GenLayer transaction that is ready to be finalized. Returns the EVM transaction hash.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txId | ``0x${string}`` | yes |  |

**Returns:** `0x${string}`

---

### finalizeIdlenessTxs

@deprecated The train separates attempt-bound resolution from
decision-bound finalization. Use resolveTransactions or
finalizeDecisions after classifying the lifecycle action.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txIds | `readonly `0x${string}`[]` | yes |  |

**Returns:** `0x${string}`

---

### resolveTransactions

Resolves a batch of attempt-bound lifecycle actions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txIds | `readonly `0x${string}`[]` | yes |  |

**Returns:** `0x${string}`

---

### finalizeDecisions

Finalizes a batch of active, decision-bound transactions.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txIds | `readonly `0x${string}`[]` | yes |  |

**Returns:** `0x${string}`

---

