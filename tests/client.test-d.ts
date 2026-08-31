import {createClient} from "../src/client/client";
import {localnet} from "@/chains/localnet";
import {createAccount, generatePrivateKey} from "../src/accounts/account";
import {TransactionHash, TransactionStatus} from "../src/types/transactions";

test("type checks", () => {
  const client = createClient({
    chain: localnet,
    account: createAccount(generatePrivateKey()),
  });

  const exampleAddress = "0x1234567890123456789012345678901234567890";

  // This should fail type checking - "whatever" is not a valid filter
  // @ts-expect-error "whatever" is not a valid filter type
  void client.request({
    method: "sim_getTransactionsForAddress",
    params: [exampleAddress, "whatever"],
  });

  // This should pass type checking - "all", "to" and "from" are valid filters
  void client.request({
    method: "sim_getTransactionsForAddress",
    params: [exampleAddress, "all"],
  });

  void client.request({
    method: "sim_getTransactionsForAddress",
    params: [exampleAddress, "to"],
  });

  void client.request({
    method: "sim_getTransactionsForAddress",
    params: [exampleAddress, "from"],
  });

  void client.transfer({
    to: exampleAddress,
    value: 1n,
  });

  // @ts-expect-error value must be a bigint
  void client.transfer({to: exampleAddress, value: 1});

  void client.getContractSchema(exampleAddress);

  void client.getContractSchemaForCode("class SomeContract...");

  // Existing consumer-facing active-validator methods remain available, and
  // the append-only joined registry is an explicitly named separate read.
  void client.getActiveValidators();
  void client.getActiveValidatorsCount();
  void client.getJoinedValidators();
  void client.getJoinedValidatorsCount();

  // Finalization readiness is an action, not a transaction status.
  // @ts-expect-error READY_TO_FINALIZE was removed from the train status enum
  void TransactionStatus.READY_TO_FINALIZE;

  void client.waitForTransactionReceipt({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
  });

  void client.waitForTransactionReceipt({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
    waitUntil: "decided",
    fullTransaction: true,
  });

  void client.waitForTransactionReceipt({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
    status: TransactionStatus.FINALIZED,
  });

  void client.waitForTransactionReceipt({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
    status: TransactionStatus.FINALIZED,
    interval: 1000,
  });

  void client.waitForTransactionReceipt({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
    status: TransactionStatus.FINALIZED,
    interval: 1000,
    retries: 10,
  });

  void client.waitForDecision({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
    fullTransaction: true,
  });

  void client.waitForFinalization({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
    retries: 10,
  });

  void client.advanced.getTransactionLifecycle({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
    timestamp: 1_700_000_000,
  }).then(lifecycle => {
    void lifecycle.storedStatus;
    void lifecycle.storedStatusCode;
    void lifecycle.projectedStatus;
    void lifecycle.projectedStatusCode;
    void lifecycle.resolutionAction;
    void lifecycle.resolutionActionCode;
    void lifecycle.resolutionSource;
    void lifecycle.resolutionSourceCode;
    void lifecycle.decisionId;
    void lifecycle.decisionActive;
    void lifecycle.evaluatedAt;
    // @ts-expect-error finalization is represented by resolutionAction === "Finalize"
    void lifecycle.finalization;
    // @ts-expect-error there is no separate readiness field
    void lifecycle.canFinalize;
  });

  // @ts-expect-error raw lifecycle access is intentionally kept out of the primary client namespace
  void client.getTransactionLifecycle;

  void client.getTransaction({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
  }).then(transaction => {
    if (transaction.lifecycle.state === "processing") {
      void transaction.lifecycle.phase;
      // @ts-expect-error processing transactions do not expose an outcome
      void transaction.lifecycle.outcome;
    }
    // Protocol projection/action is intentionally absent from the primary model.
    // @ts-expect-error use advanced.getTransactionLifecycle for raw resolution details
    void transaction.resolutionAction;
    // @ts-expect-error use advanced.getTransactionLifecycle for the resolution action
    void transaction.canFinalize;
  });

  // @ts-expect-error missing hash
  void client.waitForTransactionReceipt({
    status: TransactionStatus.FINALIZED,
  });

  // cancelTransaction type checks
  void client.cancelTransaction({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
  });

  void client.request({
    method: "sim_cancelTransaction",
    params: ["0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash],
  });
});
