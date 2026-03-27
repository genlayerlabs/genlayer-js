# Contract Methods

Methods for deploying, reading, writing, and simulating GenLayer intelligent contracts.

### getContractCode

Retrieves the source code of a deployed contract. Localnet only.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | `Address` | yes |  |

**Returns:** `string`

---

### getContractSchema

Gets the schema (methods and constructor) of a deployed contract. Localnet only.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| address | `Address` | yes |  |

**Returns:** `ContractSchema`

---

### getContractSchemaForCode

Generates a schema for contract code without deploying it. Localnet only.

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
| leaderOnly | `boolean` | no |  |
| transactionHashVariant | `TransactionHashVariant` | no |  |

**Returns:** `RawReturn extends true ? 0x${string} : CalldataEncodable`

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
| value | `bigint` | yes |  |
| leaderOnly | `boolean` | no |  |
| consensusMaxRotations | `number` | no |  |

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

---

### getMinAppealBond

Calculates the minimum bond required to appeal a transaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| txId | ``0x${string}`` | yes |  |

**Returns:** `bigint`

---

### appealTransaction

Appeals a consensus transaction to trigger a new round of validation.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| account | `Account` | no |  |
| txId | ``0x${string}`` | yes |  |
| value | `bigint` | no |  |

---

