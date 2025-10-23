# GenLayerJS

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](https://opensource.org/license/mit/)
[![Discord](https://dcbadge.vercel.app/api/server/8Jm4v89VAu?compact=true&style=flat)](https://discord.gg/qjCU4AWnKE)
[![Twitter](https://img.shields.io/twitter/url/https/twitter.com/genlayerlabs.svg?style=social&label=Follow%20%40GenLayer)](https://x.com/GenLayer)
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
## 🚀 Key Features

* **Client Creation**: Easily create and configure a client to connect to GenLayer’s network.
* **Transaction Handling**: Send and manage transactions on the GenLayer network.
* **Wallet Integration***: Seamless integration with MetaMask for managing user accounts.
* **Gas Estimation***: Estimate gas fees for executing transactions on GenLayer.

_* under development_

## 📖 Documentation

For detailed information on how to use GenLayerJS SDK, please refer to our [documentation](https://docs.genlayer.com/).



## Contributing

We welcome contributions to GenLayerJS SDK! Whether it's new features, improved infrastructure, or better documentation, your input is valuable. Please read our [CONTRIBUTING](https://github.com/genlayerlabs/genlayer-js/blob/main/CONTRIBUTING.md) guide for guidelines on how to submit your contributions.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
