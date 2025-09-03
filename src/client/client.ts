import {
  Account,
  createClient as createViemClient,
  createPublicClient as createPublicViemClient,
  publicActions,
  custom,
  Address,
  walletActions,
  Transport,
  PublicClient,
  Chain,
} from "viem";
import {accountActions} from "../accounts/actions";
import {contractActions} from "../contracts/actions";
import {receiptActions, transactionActions} from "../transactions/actions";
import {walletActions as genlayerWalletActions} from "../wallet/actions";
import {BaseActionsClient, GenLayerClient, GenLayerChain} from "@/types";
import {chainActions} from "@/chains/actions";
import {localnet} from "@/chains";

function mergeActions<TBase extends object, TExt extends object>(base: TBase, ext: TExt): TBase & TExt {
  return Object.assign({}, base, ext) as TBase & TExt;
}

// Define the configuration interface for the client
interface ClientConfig {
  chain?: {
    id: number;
    name: string;
    rpcUrls: {default: {http: readonly string[]}};
    nativeCurrency: {name: string; symbol: string; decimals: number};
    blockExplorers?: {default: {name: string; url: string}};
  };
  endpoint?: string; // Custom RPC endpoint
  account?: Account | Address;
  provider?: EthereumProvider; // Custom provider for wallet framework integration
}

const getCustomTransportConfig = (config: ClientConfig) => {
  const isAddress = typeof config.account !== "object";

  return {
    async request({method, params = []}: {method: string; params: any[]}) {
      if (method.startsWith("eth_") && isAddress) {
        try {
          const provider = config.provider || window.ethereum;
          if (!provider) {
            throw new Error('No wallet provider available');
          }
          return await provider.request({method, params});
        } catch (err) {
          console.warn(`Error using provider for method ${method}:`, err);
          throw err;
        }
      } else {
        if (!config.chain) {
          throw new Error("Chain is not set");
        }

        try {
          const response = await fetch(config.chain.rpcUrls.default.http[0], {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              jsonrpc: "2.0",
              id: Date.now(),
              method,
              params,
            }),
          });

          const data = await response.json();

          if (data.error) {
            throw new Error(data.error.message);
          }

          return data.result;
        } catch (err) {
          console.error(`Error fetching ${method} from GenLayer RPC:`, err);
          throw err;
        }
      }
    },
  };
};

export const createClient = (config: ClientConfig = {chain: localnet}): GenLayerClient<GenLayerChain> => {
  const chainConfig = (config.chain || localnet) as GenLayerChain;
  if (config.endpoint) {
    chainConfig.rpcUrls.default.http = [config.endpoint];
  }

  const customTransport = custom(getCustomTransportConfig(config), {retryCount: 0, retryDelay: 0});
  const publicClient = createPublicClient(chainConfig as GenLayerChain, customTransport).extend(
    publicActions,
  );

  const baseClient = createViemClient({
    chain: chainConfig,
    transport: customTransport,
    ...(config.account ? {account: config.account} : {}),
  });

  // Extend only with viem actions, then merge custom actions to avoid protected name conflicts
  const baseWithViem = baseClient.extend(publicActions).extend(walletActions) as BaseActionsClient<GenLayerChain>;
  const withAccounts = mergeActions(baseWithViem, accountActions(baseWithViem));
  const withWallet = mergeActions(withAccounts, genlayerWalletActions(withAccounts));
  const withChain = mergeActions(withWallet, chainActions(withWallet));
  const withContracts = mergeActions(withChain, contractActions(withChain, publicClient));
  const withTx = mergeActions(withContracts, transactionActions(withContracts, publicClient));
  const finalClient = mergeActions(withTx, receiptActions(withTx, publicClient));
  const finalClientTyped: GenLayerClient<GenLayerChain> = finalClient as GenLayerClient<GenLayerChain>;

  // Initialize in the background
  finalClientTyped.initializeConsensusSmartContract().catch(error => {
    console.error("Failed to initialize consensus smart contract:", error);
  });
  return finalClientTyped;
};

export const createPublicClient = (
  chainConfig: GenLayerChain,
  customTransport: Transport,
): PublicClient<Transport, Chain> => {
  return createPublicViemClient({chain: chainConfig, transport: customTransport});
};
