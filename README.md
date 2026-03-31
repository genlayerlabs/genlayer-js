# GenLayerJS

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![Discord](https://dcbadge.vercel.app/api/server/8Jm4v89VAu?compact=true&style=flat)](https://discord.gg/VpfmXEMN66)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/genlaboratory.svg?style=social&label=Follow%20%40GenLayer)](https://x.com/GenLayer)
[![GitHub star chart](https://img.shields.io/github/stars/genlayerlabs/genlayer-js?style=social)](https://star-history.com/#genlayerlabs/genlayer-js)

## 👀 About

GenLayerJS SDK is a TypeScript library designed for developers building decentralized applications (Dapps) on the GenLayer protocol. This SDK provides a comprehensive set of tools to interact with the GenLayer network, including client creation, transaction handling, event subscriptions, and more, all while leveraging the power of Viem as the underlying blockchain client.

## Prerequisites

Before installing GenLayerJS SDK, ensure you have the following prerequisites installed:

- Node.js (>= 16.x)
- npm (>= 7.x)

## 🛠️ Installation and Usage

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

### Checking execution results

A transaction can be finalized by consensus but still have a failed execution. Always check `txExecutionResult` before reading contract state:

```typescript
import { ExecutionResult, TransactionStatus } from "genlayer-js/types";

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.FINALIZED,
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

When building a browser dApp, pass the wallet address and EIP-1193 provider. The SDK routes signing operations through the wallet and all reads directly to the GenLayer RPC.

```typescript
import { createClient } from "genlayer-js";
import { testnetBradbury } from "genlayer-js/chains";
import { TransactionStatus } from "genlayer-js/types";

// Get address and provider from your wallet connection
const address = "0x..."; // from wallet
const provider = window.ethereum; // or from a wallet SDK

const client = createClient({
  chain: testnetBradbury,
  account: address as `0x${string}`,
  provider,
});

// Reads go directly to GenLayer RPC — no wallet involved
const result = await client.readContract({
  address: contractAddress,
  functionName: "get_storage",
  args: [],
});

// Writes are signed by the wallet (MetaMask popup)
const txHash = await client.writeContract({
  address: contractAddress,
  functionName: "update_storage",
  args: ["new_value"],
  value: BigInt(0),
});

const receipt = await client.waitForTransactionReceipt({
  hash: txHash,
  status: TransactionStatus.ACCEPTED,
});
```

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

// Get active validators
const validators = await client.getActiveValidators();

// Check if address is a validator
const isValidator = await client.isValidator("0x...");

// Get validator info
const validatorInfo = await client.getValidatorInfo("0x...");

// Join as validator (requires account with funds)
const result = await client.validatorJoin({ amount: "42000gen" });

// Join as delegator
const delegateResult = await client.delegatorJoin({
  validator: "0x...",
  amount: "42gen",
});
```

## 🚀 Key Features

* **Client Creation**: Easily create and configure a client to connect to GenLayer's network.
* **Transaction Handling**: Send and manage transactions on the GenLayer network.
* **Staking**: Full staking support for validators and delegators on testnet-bradbury and testnet-asimov.
* **Wallet Integration***: Seamless integration with MetaMask for managing user accounts.
* **Gas Estimation***: Estimate gas fees for executing transactions on GenLayer.

_* under development_

## 📖 Documentation

For detailed information on how to use GenLayerJS SDK, please refer to our [documentation](https://docs.genlayer.com/).



## Contributing

We welcome contributions to GenLayerJS SDK! Whether it's new features, improved infrastructure, or better documentation, your input is valuable. Please read our [CONTRIBUTING](https://github.com/genlayerlabs/genlayer-js/blob/main/CONTRIBUTING.md) guide for guidelines on how to submit your contributions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
