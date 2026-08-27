# Transaction Methods

Methods for fetching transactions, waiting for receipts, estimating gas, and debugging execution traces.

### waitForTransactionReceipt

Polls until a transaction reaches the specified status. Returns the transaction receipt.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |
| status | `TransactionStatus` | no |  |
| waitUntil | `TransactionReceiptWaitUntil` | no |  |
| interval | `number` | no |  |
| retries | `number` | no |  |
| fullTransaction | `boolean` | no |  |

**Returns:** `GenLayerTransaction`

---

### waitForDecision

Polls until the stored transaction state contains a materialized decision.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |
| interval | `number` | no |  |
| retries | `number` | no |  |
| fullTransaction | `boolean` | no |  |

**Returns:** `GenLayerTransaction`

---

### waitForFinalization

Polls until the stored transaction state is finalized.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |
| interval | `number` | no |  |
| retries | `number` | no |  |
| fullTransaction | `boolean` | no |  |

**Returns:** `GenLayerTransaction`

---

### getTransactionLifecycle

`advanced.getTransactionLifecycle` exposes stored/projected status,
resolution action/source, and active decision identity. Studio uses the
node RPC; contract networks use one fixed-block lifecycle read. `Finalize`
is an action, not a status or separate readiness field.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |
| timestamp | `number` | no |  |

**Returns:** `TransactionProtocolLifecycle`

---

### getTransaction

Fetches a transaction with a simple stored lifecycle and split round data.
Use advanced.getTransactionLifecycle for protocol projection/action details.

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

### getTransactionQueuePosition

Returns the queue slot position of a transaction in the pending queue.

| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| hash | `TransactionHash` | yes |  |

**Returns:** `number`

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

