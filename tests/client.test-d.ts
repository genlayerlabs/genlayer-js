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

  void client.getContractSchema(exampleAddress);

  void client.getContractSchemaForCode("class SomeContract...");

  void client.waitForTransactionReceipt({
    hash: "0x1234567890123456789012345678901234567890123456789012345678901234" as TransactionHash,
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
