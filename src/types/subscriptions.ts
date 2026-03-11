import {Address} from "@/types/accounts";
import {TransactionHash} from "@/types/transactions";

export type NewTransactionEvent = {
  txId: TransactionHash;
  recipient: Address;
  activator: Address;
};

export type TransactionAcceptedEvent = {
  txId: TransactionHash;
};

export type TransactionActivatedEvent = {
  txId: TransactionHash;
  leader: Address;
};

export type TransactionUndeterminedEvent = {
  txId: TransactionHash;
};

export type TransactionLeaderTimeoutEvent = {
  txId: TransactionHash;
};

export type TransactionFinalizedEvent = {
  txId: TransactionHash;
};

export type AppealStartedEvent = {
  txId: TransactionHash;
  appellant: Address;
  bond: bigint;
  validators: Address[];
};

export type ConsensusEventName =
  | "NewTransaction"
  | "TransactionAccepted"
  | "TransactionActivated"
  | "TransactionUndetermined"
  | "TransactionLeaderTimeout"
  | "TransactionFinalized"
  | "AppealStarted";

export type ConsensusEventMap = {
  NewTransaction: NewTransactionEvent;
  TransactionAccepted: TransactionAcceptedEvent;
  TransactionActivated: TransactionActivatedEvent;
  TransactionUndetermined: TransactionUndeterminedEvent;
  TransactionLeaderTimeout: TransactionLeaderTimeoutEvent;
  TransactionFinalized: TransactionFinalizedEvent;
  AppealStarted: AppealStartedEvent;
};

export type ConsensusEventStream<T> = {
  [Symbol.asyncIterator](): AsyncIterator<T>;
  unsubscribe: () => void;
};
