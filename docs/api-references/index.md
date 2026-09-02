# GenLayerJS


## About

GenLayerJS SDK is a TypeScript library designed for developers building decentralized applications (Dapps) on the GenLayer protocol. This SDK provides a comprehensive set of tools to interact with the GenLayer network, including client creation, transaction handling, event subscriptions, and more, all while leveraging the power of Viem as the underlying blockchain client.

## Prerequisites

Before installing GenLayerJS SDK, ensure you have the following prerequisites installed:

- Node.js (>= 16.x)
- npm (>= 7.x)

## ️ Installation and Usage

To install the GenLayerJS SDK, use the following command:
```bash
$ npm install genlayer-js
```
Here’s how to initialize the client and connect to the GenLayer Simulator:

### Reading a Transaction
```typescript
import { localnet } from 'genlayer-js/chains';
import { createClient } from "genlayer-js";

const client = createClient({
  chain: localnet,
});

const transactionHash = "0x...";

const transaction = await client.getTransaction({ hash: transactionHash })
```

### Waiting for Transaction Receipt
```typescript
import { localnet } from 'genlayer-js/chains';
import { createClient } from "genlayer-js";
import { TransactionStatus } from "genlayer-js/types";

const client = createClient({
  chain: localnet,
});

// Get simplified receipt (default - removes binary data, keeps execution results)
const receipt = await client.waitForTransactionReceipt({
  hash: "0x...",
  status: TransactionStatus.FINALIZED,
  fullTransaction: false // Default - simplified for readability
});

// Get complete receipt with all fields
const fullReceipt = await client.waitForTransactionReceipt({
  hash: "0x...",
  status: TransactionStatus.FINALIZED,
  fullTransaction: true // Complete receipt with all internal data
});
```

### Reading a contract
```typescript
import { localnet } from 'genlayer-js/chains';
import { createClient } from "genlayer-js";

const client = createClient({
  chain: localnet,
});

const result = await client.readContract({
  // account: account, Account is optional when reading from contracts
  address: contractAddress,
  functionName: 'get_complete_storage',
  args: []
  stateStatus: "accepted",
})
```

### Writing a transaction
```typescript
import { localnet } from 'genlayer-js/chains';
import { createClient, createAccount } from "genlayer-js";

const client = createClient({
  network: localnet,
});

const account = createAccount();
const transactionHash = await client.writeContract({
  account: account, // using this account for this transaction
  address: contractAddress,
  functionName: 'account',
  args: ['new_storage'],
  value: 0, // value is optional, if you want to send some native token to the contract
});

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.FINALIZED, // or ACCEPTED
  fullTransaction: false // False by default - returns simplified receipt for better readability
})

```

### Fee presets for transactions

Apps can build a trusted fee preset once they know the transaction shape, then
submit the same preset with the transaction. The user may still override these
values in wallet or app UI before signing.

```typescript
const estimate = await client.estimateTransactionFees({
  leaderTimeunitsAllocation: 100n,
  validatorTimeunitsAllocation: 200n,
});

const txHash = await client.writeContract({
  account,
  address: contractAddress,
  functionName: "update_storage",
  args: ["new_storage"],
  fees: {
    distribution: estimate.distribution,
    feeValue: estimate.feeValue,
  },
});
```

When `rotations` is omitted from an estimate, the SDK funds every round through
the chain's `defaultConsensusMaxRotations`. Pass `rotations` explicitly—including
`[0n]`—when the transaction should use a lower rotation budget.

If `fees.distribution` is provided without `feeValue`, the SDK derives the fee
deposit from FeeManager on network backends, or from `sim_getFeeConfig` on
Studio. Use `messageAllocations` with `estimateTransactionFees` for transactions
that can emit funded messages.

Use the SDK call-key helpers when targeting a specific emitted message. Internal
messages are keyed by the GenVM method name; external EVM messages are keyed by
the first 4 bytes of the calldata selector.

```typescript
import {
  MessageType,
  deriveExternalMessageCallKey,
  deriveInternalMessageCallKey,
  encodeExternalMessageFeeParams,
  encodeInternalMessageFeeParams,
} from "genlayer-js";

const estimate = await client.estimateTransactionFees({
  messageAllocations: [
    {
      messageType: MessageType.Internal,
      recipient: childContractAddress,
      callKey: deriveInternalMessageCallKey("settle_campaign"),
      budget: 700_000n,
      feeParams: encodeInternalMessageFeeParams({
        leaderTimeunitsAllocation: 100n,
        validatorTimeunitsAllocation: 200n,
      }),
    },
    {
      messageType: MessageType.External,
      recipient: tokenAddress,
      callKey: deriveExternalMessageCallKey("0xa9059cbb"),
      budget: 210_000n,
      feeParams: encodeExternalMessageFeeParams({
        gasLimit: 21_000n,
        maxGasPrice: 10n,
      }),
    },
  ],
});
```

You can also pass the same preset to Studio/localnet simulation. On Studio,
`includeReceipt` uses `sim_call` so the returned object includes the GenVM
receipt and fee accounting report:

```typescript
const recommended = await client.estimateTransactionFeesForWrite({
  account,
  address: contractAddress,
  functionName: "update_storage",
  args: ["new_storage"],
});

await client.writeContract({
  account,
  address: contractAddress,
  functionName: "update_storage",
  args: ["new_storage"],
  fees: {
    distribution: recommended.distribution,
    messageAllocations: recommended.messageAllocations,
    feeValue: recommended.feeValue,
  },
});
```

For tests or tools that need to inspect the raw simulation, use the explicit
two-step flow:

```typescript
const simulation = await client.simulateWriteContract({
  account,
  address: contractAddress,
  functionName: "update_storage",
  args: ["new_storage"],
  fees: {
    distribution: estimate.distribution,
    feeValue: estimate.feeValue,
  },
  includeReceipt: true,
});

console.log(simulation.feeAccounting);

const recommended = await client.estimateTransactionFeesFromSimulation({
  simulation,
});

await client.writeContract({
  account,
  address: contractAddress,
  functionName: "update_storage",
  args: ["new_storage"],
  fees: {
    distribution: recommended.distribution,
    messageAllocations: recommended.messageAllocations,
    feeValue: recommended.feeValue,
  },
});
```

For transactions that are already submitted, use the fee-management helpers:

```typescript
await client.topUpFees({
  txId,
  value: 1_100n,
  distribution: {
    leaderTimeunitsAllocation: 100n,
    validatorTimeunitsAllocation: 200n,
    rotations: [0n],
  },
});

await client.topUpAndSubmitAppeal({
  txId,
  value: 1_400n,
  distribution: {
    appealRounds: 1n,
    rotations: [0n, 0n],
  },
});
```

`topUpFees` returns the backend RPC hash. On network backends this is the EVM
transaction hash; on Studio/localnet it is the target GenLayer transaction id.

### Checking execution results

A transaction can be finalized by consensus but still have a failed execution. Always check `txExecutionResult` before reading contract state:

```typescript
import { ExecutionResult } from "genlayer-js/types";

const receipt = await client.waitForFinalization({
  hash: txHash,
});

if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_RETURN) {
  // Execution succeeded — safe to read state
  const result = await client.readContract({
    address: contractAddress,
    functionName: "get_storage",
    args: [],
  });
} else if (receipt.txExecutionResultName === ExecutionResult.FINISHED_WITH_ERROR) {
  // Execution failed — contract state was not modified
  console.error("Contract execution failed");
} else {
  // NOT_VOTED — execution hasn't completed
  console.warn("Execution result not yet available");
}
```

### Fetching emitted messages and triggered transactions

Transactions can emit messages to other contracts. These messages create new child transactions when processed:

```typescript
const tx = await client.getTransaction({ hash: txHash });

// The default model is derived from the exact stored state. Processing entries
// have a phase; decided entries have an outcome.
console.log(tx.lifecycle);
// {state: "processing", phase: "revealing"}
// {state: "decided", outcome: "accepted"}

// Advanced protocol consumers can explicitly request timestamp projection and
// the exact resolution action/source. Current Studio can prove only the stored
// status, so unsupported action/decision fields remain inactive there.
const protocolLifecycle = await client.advanced.getTransactionLifecycle({ hash: txHash });
console.log(protocolLifecycle.storedStatus);
console.log(protocolLifecycle.projectedStatus);
console.log(protocolLifecycle.resolutionSource);
if (protocolLifecycle.resolutionAction === "Finalize") {
  // Finalize is the protocol's current action/capability, not a transaction status.
}

// The train retains the authoritative execution hash, not the old receipt
// bytes. `txReceipt` is therefore unavailable on train transactions.
console.log(tx.txExecutionHash);

// Messages emitted by the contract during execution
console.log(tx.messages);
// [{messageType, recipient, value, data, onAcceptance, saltNonce}, ...]

// Child transaction IDs created from those messages (separate call)
const childTxIds = await client.getTriggeredTransactionIds({ hash: txHash });
console.log(childTxIds);
// ["0xabc...", "0xdef..."]
```

### Debugging transaction execution

Use `debugTraceTransaction` to inspect the full execution trace of a transaction, including return data, errors, and GenVM logs:

```typescript
const trace = await client.debugTraceTransaction({
  hash: txHash,
  round: 0, // optional, defaults to 0
});

console.log(trace.result_code);  // 0=success, 1=user error, 2=VM error
console.log(trace.return_data);  // hex-encoded contract return data
console.log(trace.stderr);       // standard error output
console.log(trace.genvm_log);    // detailed GenVM execution logs
```

### Using with a wallet provider (MetaMask)

When building a browser dApp, create two clients: one for reads (no wallet needed) and one for writes (signed by the wallet). This follows the standard viem pattern and keeps concerns separated.

```typescript
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

// Read client — talks directly to GenLayer RPC, no wallet needed
const readClient = createClient({
  chain: testnetBradbury,
});

// Write client — signs transactions through the wallet
const writeClient = createClient({
  chain: testnetBradbury,
  account: address as `0x${string}`, // from wallet connection
  provider: window.ethereum,          // or from a wallet SDK
});

// Use readClient for all reads
const result = await readClient.readContract({
  address: contractAddress,
  functionName: "get_storage",
  args: [],
});

const tx = await readClient.getTransaction({ hash: txHash });

// Use writeClient for transactions (MetaMask popup)
const txHash = await writeClient.writeContract({
  address: contractAddress,
  functionName: "update_storage",
  args: ["new_value"],
  value: BigInt(0),
});

// Either client can wait for receipts
const receipt = await readClient.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.ACCEPTED,
});
```

### Switching the wallet to the correct network

When using MetaMask or another browser wallet, the wallet may be connected to a different chain than what your client is configured for. Use `client.connect()` to switch the wallet to the correct GenLayer network before sending transactions:

```typescript
import { createClient } from "genlayer-js";
import { studionet } from "genlayer-js/chains";

const client = createClient({
  chain: studionet,
  account: address as `0x${string}`,
});

// Switch MetaMask to the correct chain (adds the network if not present)
await client.connect("studionet");

// Now transactions will go to the right network
const txHash = await client.writeContract({
  address: contractAddress,
  functionName: "create_profile",
  args: ["alice", "Hello world"],
  value: BigInt(0),
});
```

Available networks: `"localnet"`, `"studionet"`, `"studioDevnet"`, `"testnetAsimov"`, `"testnetBradbury"`.

> **Note:** If the wallet is on the wrong chain when you call `writeContract`, the SDK will throw a clear error telling you which chain the wallet is on vs. which chain the client expects. Call `client.connect()` to resolve this.

### Staking Operations

The SDK provides staking functionality for validators and delegators on testnet-bradbury (and testnet-asimov).

```typescript
import { testnetBradbury } from 'genlayer-js/chains';
import { createClient, createAccount } from "genlayer-js";

const account = createAccount();
const client = createClient({
  chain: testnetBradbury,
  account,
});

// Get epoch info (includes timing estimates and inflation data)
const epochInfo = await client.getEpochInfo();
// {
//   currentEpoch: 2n,
//   epochMinDuration: 86400n,        // 1 day in seconds
//   currentEpochStart: Date,
//   currentEpochEnd: Date | null,
//   nextEpochEstimate: Date | null,
//   validatorMinStake: "0.01 GEN",
//   delegatorMinStake: "42 GEN",
//   activeValidatorsCount: 6n,
//   inflation: "1000 GEN",           // Total inflation for current epoch
//   inflationRaw: 1000000000000000000000n,
//   totalWeight: 500000000000000000000000n,  // Total stake weight
//   totalClaimed: "500 GEN",         // Total claimed rewards
// }

// Get validators currently eligible for consensus duties
const validators = await client.getActiveValidators();

// Inspect every identity in the append-only joined registry
const joinedValidators = await client.getJoinedValidators();

// Check if address is a validator
const isValidator = await client.isValidator("0x...");

// Get validator info
const validatorInfo = await client.getValidatorInfo("0x...");

// Join as validator (requires an owner account with funds and the operator key)
const registration = await createOperatorRegistration({
  privateKey: operatorPrivateKey,
  ...(await client.getValidatorRegistrationContext()),
});
const result = await client.validatorJoin({ amount: "42000gen", registration });

// Join as delegator
const delegateResult = await client.delegatorJoin({
  validator: "0x...",
  amount: "42gen",
});
```

## Key Features

* **Client Creation**: Easily create and configure a client to connect to GenLayer's network.
* **Transaction Handling**: Send and manage transactions on the GenLayer network.
* **Staking**: Full staking support for validators and delegators on testnet-bradbury and testnet-asimov.
* **Wallet Integration***: Seamless integration with MetaMask for managing user accounts.
* **Gas Estimation***: Estimate gas fees for executing transactions on GenLayer.

_* under development_

## Documentation

For detailed information on how to use GenLayerJS SDK, please refer to our [documentation](https://docs.genlayer.com/).



## Contributing

We welcome contributions to GenLayerJS SDK! Whether it's new features, improved infrastructure, or better documentation, your input is valuable. Please read our [CONTRIBUTING](https://github.com/genlayerlabs/genlayer-js/blob/main/CONTRIBUTING.md) guide for guidelines on how to submit your contributions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
