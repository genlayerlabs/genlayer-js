# GenLayerJS SDK API Reference

Version: 0.26.2

## Contracts

### `getContractCode`

Retrieves the source code of a deployed contract. Localnet only.

---

### `getContractSchema`

Gets the schema (methods and constructor) of a deployed contract. Localnet only.

---

### `getContractSchemaForCode`

Generates a schema for contract code without deploying it. Localnet only.

---

### `readContract`

Executes a read-only contract call without modifying state.

---

### `simulateWriteContract`

Simulates a state-modifying contract call without executing on-chain.

---

### `writeContract`

Executes a state-modifying function on a contract through consensus. Returns the transaction hash.

---

### `deployContract`

Deploys a new intelligent contract to GenLayer. Returns the transaction hash.

---

### `getMinAppealBond`

Calculates the minimum bond required to appeal a transaction.

---

### `appealTransaction`

Appeals a consensus transaction to trigger a new round of validation.

---

## Transactions

### `waitForTransactionReceipt`

Polls until a transaction reaches the specified status. Returns the transaction receipt.

---

### `getTransaction`

Fetches transaction data including status, execution result, and consensus details.

---

### `getTriggeredTransactionIds`

Returns transaction IDs of child transactions created from emitted messages.

---

### `debugTraceTransaction`

Fetches the full execution trace including return data, stdout, stderr, and GenVM logs.

---

### `cancelTransaction`

Cancels a pending transaction. Studio networks only.

---

### `estimateTransactionGas`

Estimates gas required for a transaction.

---

## Staking

### `validatorJoin`

Joins as a validator with the specified stake amount.

---

### `validatorDeposit`

Adds additional self-stake to an active validator position.

---

### `validatorExit`

Exits a validator position by burning the specified shares.

---

### `validatorClaim`

Claims pending validator withdrawals.

---

### `validatorPrime`

Primes a validator for participation in the next epoch.

---

### `setOperator`

Sets the operator address for a validator wallet.

---

### `setIdentity`

Sets validator identity information (name, website, social links).

---

### `delegatorJoin`

Delegates stake to a validator.

---

### `delegatorExit`

Exits a delegation by burning the specified shares.

---

### `delegatorClaim`

Claims pending delegator withdrawals.

---

### `isValidator`

Checks if an address is an active validator.

---

### `getValidatorInfo`

Returns comprehensive information about a validator including stake, identity, and status.

---

### `getStakeInfo`

Returns delegation stake information for a delegator-validator pair.

---

### `getEpochInfo`

Returns current epoch information including timing, stake requirements, and inflation data.

---

### `getEpochData`

Returns detailed data for a specific epoch.

---

### `getActiveValidators`

Returns addresses of all currently active validators.

---

### `getActiveValidatorsCount`

Returns the count of active validators.

---

### `getQuarantinedValidators`

Returns addresses of validators currently in quarantine.

---

### `getBannedValidators`

Returns banned validators with ban duration and permanent ban status.

---

### `getQuarantinedValidatorsDetailed`

Returns detailed quarantine information with pagination.

---

### `getStakingContract`

Returns the underlying staking contract instance for direct interactions.

---

## Enums

### TransactionStatus

`UNINITIALIZED` | `PENDING` | `PROPOSING` | `COMMITTING` | `REVEALING` | `ACCEPTED` | `UNDETERMINED` | `FINALIZED` | `CANCELED` | `APPEAL_REVEALING` | `APPEAL_COMMITTING` | `READY_TO_FINALIZE` | `VALIDATORS_TIMEOUT` | `LEADER_TIMEOUT`

---

### ExecutionResult

`NOT_VOTED` | `FINISHED_WITH_RETURN` | `FINISHED_WITH_ERROR`

---

### TransactionResult

`IDLE` | `AGREE` | `DISAGREE` | `TIMEOUT` | `DETERMINISTIC_VIOLATION` | `NO_MAJORITY` | `MAJORITY_AGREE` | `MAJORITY_DISAGREE`

---

