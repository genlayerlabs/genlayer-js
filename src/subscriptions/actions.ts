import {
  createPublicClient,
  webSocket,
  Log,
  decodeEventLog,
  Abi,
  Address as ViemAddress,
  PublicClient,
  WebSocketTransport,
} from "viem";
import {
  GenLayerClient,
  GenLayerChain,
  ConsensusEventStream,
  ConsensusEventMap,
  NewTransactionEvent,
  TransactionAcceptedEvent,
  TransactionActivatedEvent,
  TransactionUndeterminedEvent,
  TransactionLeaderTimeoutEvent,
  AppealStartedEvent,
  TransactionHash,
  Address,
} from "@/types";

const MAX_EVENT_QUEUE_SIZE = 1000;

export class WebSocketNotConfiguredError extends Error {
  constructor() {
    super(
      "WebSocket URL not configured for this chain. Add a webSocket URL to rpcUrls.default.webSocket in the chain configuration, or pass webSocketEndpoint when creating the client.",
    );
    this.name = "WebSocketNotConfiguredError";
  }
}

export class ConsensusContractNotInitializedError extends Error {
  constructor() {
    super(
      "Consensus main contract not initialized. Ensure the client is properly initialized before subscribing to events.",
    );
    this.name = "ConsensusContractNotInitializedError";
  }
}

// WeakMap to store shared WebSocket clients per GenLayerClient
const wsClientCache = new WeakMap<GenLayerClient<GenLayerChain>, PublicClient<WebSocketTransport>>();

function getOrCreateWsClient(client: GenLayerClient<GenLayerChain>): PublicClient<WebSocketTransport> {
  let wsClient = wsClientCache.get(client);
  if (wsClient) {
    return wsClient;
  }

  const wsUrl = client.chain.rpcUrls.default.webSocket?.[0];
  if (!wsUrl) {
    throw new WebSocketNotConfiguredError();
  }

  wsClient = createPublicClient({
    chain: client.chain,
    transport: webSocket(wsUrl),
  }) as PublicClient<WebSocketTransport>;

  wsClientCache.set(client, wsClient);
  return wsClient;
}

function createEventStream<T>(
  client: GenLayerClient<GenLayerChain>,
  eventName: keyof ConsensusEventMap,
  mapEvent: (log: Log) => T,
): ConsensusEventStream<T> {
  if (!client.chain.consensusMainContract?.address || !client.chain.consensusMainContract?.abi) {
    throw new ConsensusContractNotInitializedError();
  }

  const wsClient = getOrCreateWsClient(client);

  const eventQueue: T[] = [];
  let resolveNext: ((value: IteratorResult<T>) => void) | null = null;
  let rejectNext: ((error: Error) => void) | null = null;
  let isUnsubscribed = false;
  let unwatch: (() => void) | null = null;
  let lastError: Error | null = null;

  const processLog = (logs: Log[]) => {
    for (const log of logs) {
      try {
        const event = mapEvent(log);
        if (resolveNext) {
          resolveNext({value: event, done: false});
          resolveNext = null;
          rejectNext = null;
        } else {
          // Prevent unbounded queue growth
          if (eventQueue.length >= MAX_EVENT_QUEUE_SIZE) {
            console.warn(`[genlayer-js] ${eventName} event queue full (${MAX_EVENT_QUEUE_SIZE}), dropping oldest event`);
            eventQueue.shift(); // Drop oldest event
          }
          eventQueue.push(event);
        }
      } catch (err) {
        console.debug(`[genlayer-js] Failed to decode ${eventName} event:`, err);
      }
    }
  };

  const handleError = (error: Error) => {
    console.error(`[genlayer-js] WebSocket error for ${eventName}:`, error);
    lastError = error;
    if (rejectNext) {
      rejectNext(error);
      resolveNext = null;
      rejectNext = null;
    }
    // Evict the dead WebSocket client so the next subscription creates a fresh one
    wsClientCache.delete(client);
    // Auto-terminate stream on WebSocket failure so subsequent next() calls
    // return {done: true} instead of hanging indefinitely
    isUnsubscribed = true;
    if (unwatch) {
      unwatch();
      unwatch = null;
    }
  };

  unwatch = wsClient.watchContractEvent({
    address: client.chain.consensusMainContract.address as ViemAddress,
    abi: client.chain.consensusMainContract.abi as Abi,
    eventName,
    onLogs: processLog,
    onError: handleError,
  });

  const stream: ConsensusEventStream<T> = {
    [Symbol.asyncIterator]() {
      return {
        next(): Promise<IteratorResult<T>> {
          if (isUnsubscribed) {
            return Promise.resolve({value: undefined as unknown as T, done: true});
          }

          if (lastError) {
            const error = lastError;
            lastError = null;
            return Promise.reject(error);
          }

          if (eventQueue.length > 0) {
            return Promise.resolve({value: eventQueue.shift()!, done: false});
          }

          return new Promise<IteratorResult<T>>((resolve, reject) => {
            resolveNext = resolve;
            rejectNext = reject;
          });
        },
        return(): Promise<IteratorResult<T>> {
          stream.unsubscribe();
          return Promise.resolve({value: undefined as unknown as T, done: true});
        },
      };
    },
    unsubscribe() {
      isUnsubscribed = true;
      if (unwatch) {
        unwatch();
        unwatch = null;
      }
      if (resolveNext) {
        resolveNext({value: undefined as unknown as T, done: true});
        resolveNext = null;
        rejectNext = null;
      }
    },
  };

  return stream;
}

export function subscriptionActions(client: GenLayerClient<GenLayerChain>) {
  const decodeLog = <T>(log: Log, eventName: keyof ConsensusEventMap): T => {
    const decoded = decodeEventLog({
      abi: client.chain.consensusMainContract!.abi as Abi,
      data: log.data,
      topics: log.topics,
      eventName,
    });
    return decoded.args as T;
  };

  return {
    subscribeToNewTransaction: (): ConsensusEventStream<NewTransactionEvent> => {
      return createEventStream(client, "NewTransaction", log =>
        decodeLog<NewTransactionEvent>(log, "NewTransaction"),
      );
    },

    subscribeToTransactionAccepted: (): ConsensusEventStream<TransactionAcceptedEvent> => {
      return createEventStream(client, "TransactionAccepted", log => {
        // ABI uses snake_case `tx_id` for this event
        const decoded = decodeLog<{tx_id: `0x${string}`}>(log, "TransactionAccepted");
        return {txId: decoded.tx_id as TransactionHash};
      });
    },

    subscribeToTransactionActivated: (): ConsensusEventStream<TransactionActivatedEvent> => {
      return createEventStream(client, "TransactionActivated", log =>
        decodeLog<TransactionActivatedEvent>(log, "TransactionActivated"),
      );
    },

    subscribeToTransactionUndetermined: (): ConsensusEventStream<TransactionUndeterminedEvent> => {
      return createEventStream(client, "TransactionUndetermined", log => {
        // ABI uses snake_case `tx_id` for this event
        const decoded = decodeLog<{tx_id: `0x${string}`}>(log, "TransactionUndetermined");
        return {txId: decoded.tx_id as TransactionHash};
      });
    },

    subscribeToTransactionLeaderTimeout: (): ConsensusEventStream<TransactionLeaderTimeoutEvent> => {
      return createEventStream(client, "TransactionLeaderTimeout", log => {
        // ABI uses snake_case `tx_id` for this event
        const decoded = decodeLog<{tx_id: `0x${string}`}>(log, "TransactionLeaderTimeout");
        return {txId: decoded.tx_id as TransactionHash};
      });
    },

    subscribeToAppealStarted: (): ConsensusEventStream<AppealStartedEvent> => {
      return createEventStream(client, "AppealStarted", log => {
        const decoded = decodeLog<{
          txId: `0x${string}`;
          appealer: `0x${string}`;
          appealBond: bigint;
          appealValidators: `0x${string}`[];
        }>(log, "AppealStarted");
        return {
          txId: decoded.txId as TransactionHash,
          appealer: decoded.appealer as Address,
          appealBond: decoded.appealBond,
          appealValidators: decoded.appealValidators as Address[],
        };
      });
    },
  };
}
