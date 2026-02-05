import {Address} from "./accounts";
import {TransactionHash} from "./transactions";

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

export type ConsensusEventName =
  | "NewTransaction"
  | "TransactionAccepted"
  | "TransactionActivated"
  | "TransactionUndetermined"
  | "TransactionLeaderTimeout";

export type ConsensusEventMap = {
  NewTransaction: NewTransactionEvent;
  TransactionAccepted: TransactionAcceptedEvent;
  TransactionActivated: TransactionActivatedEvent;
  TransactionUndetermined: TransactionUndeterminedEvent;
  TransactionLeaderTimeout: TransactionLeaderTimeoutEvent;
};

export type ConsensusEventStream<T> = {
  [Symbol.asyncIterator](): AsyncIterator<T>;
  unsubscribe: () => void;
};
