# Transaction Methods

Methods for fetching transactions, waiting for receipts, estimating gas, and debugging execution traces.

### waitForTransactionReceipt

Polls until a transaction reaches the specified status. Returns the transaction receipt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |
| status | `TransactionStatus` | yes |  |
| interval | `number` | no |  |
| retries | `number` | no |  |
| fullTransaction | `boolean` | no |  |

**Returns:** `GenLayerTransaction`

---

### getTransaction

Fetches transaction data including status, execution result, and consensus details.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |

**Returns:** `GenLayerTransaction`

---

### getTriggeredTransactionIds

Returns transaction IDs of child transactions created from emitted messages.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |

**Returns:** `TransactionHash[]`

---

### debugTraceTransaction

Fetches the full execution trace including return data, stdout, stderr, and GenVM logs.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |
| round | `number` | no |  |

**Returns:** `DebugTraceResult`

---

### cancelTransaction

Cancels a pending transaction. Studio networks only.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |

**Returns:** `{transaction_hash: string; status: string}`

---

### estimateTransactionGas

Estimates gas required for a transaction.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| from | `Address` | no |  |
| to | `Address` | yes |  |
| data | ``0x${string}`` | no |  |
| value | `bigint` | no |  |

**Returns:** `bigint`

---

