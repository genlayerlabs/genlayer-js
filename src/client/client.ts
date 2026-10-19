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
import {stakingActions} from "../staking/actions";
import {vestingActions} from "../vesting/actions";
import {GenLayerClient, GenLayerChain} from "@/types";
import {chainActions} from "@/chains/actions";
import {assertNetworkIdentity} from "./networkIdentity";
import {localnet} from "@/chains";

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

// Methods that require the wallet provider (signing/account access).
// All other methods (reads, queries) go directly to the GenLayer RPC.
const PROVIDER_METHODS = new Set([
  "eth_accounts",
  "eth_requestAccounts",
  "eth_sendTransaction",
  "eth_signTransaction",
  "personal_sign",
  "eth_signTypedData_v4",
]);

const assertChainMatch = async (
  provider: EthereumProvider | {request: (args: {method: string; params?: any[]}) => Promise<any>},
  chainConfig: GenLayerChain,
) => {
  // Studio chains manage wallet switching externally (useChainEnforcer).
  // The SDK chain ID (e.g., localnet=61127) may differ from the per-instance
  // chain ID MetaMask is on (e.g., 61997/61998/61999). Skip validation for Studio.
  if (chainConfig.isStudio) return;

  const expectedChainIdHex = `0x${chainConfig.id.toString(16)}`;
  try {
    const currentChainId = await provider.request({method: "eth_chainId"});
    if (currentChainId !== expectedChainIdHex) {
      const currentId = parseInt(currentChainId as string, 16);
      throw new Error(
        `Wallet is on chain ${currentId} but client is configured for chain ${chainConfig.id} (${chainConfig.name}). ` +
          `Call client.connect("${chainConfig.name}") or switch your wallet to the correct network before sending transactions.`,
      );
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("Wallet is on chain")) throw err;
  }
};

const getCustomTransportConfig = (config: ClientConfig, chainConfig: GenLayerChain) => {
  const isAddress = typeof config.account !== "object";

  const rpc = async ({method, params = []}: {method: string; params?: any[]}) => {
    const retryable =
      /^(eth_get\w+|eth_call|eth_chainId|eth_blockNumber|eth_gasPrice|eth_estimateGas|net_version)$/.test(
        method,
      );
    for (let attempt = 0; ; attempt++) {
      const response = await fetch(chainConfig.rpcUrls.default.http[0], {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({jsonrpc: "2.0", id: Date.now(), method, params}),
      });
      if (response.status === 429 && retryable && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after"));
        const delay = retryAfter > 0 ? Math.min(retryAfter * 1000, 10000) : 1000 * 2 ** attempt;
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      if (!response.ok) throw new Error(`RPC HTTP ${response.status}`);
      const data = await response.json();
      if (data.error) throw data.error;
      return data.result;
    }
  };
  let identityCheck: Promise<void> | undefined;
  return {
    async request({method, params = []}: {method: string; params: any[]}) {
      if (chainConfig.genesisHash) {
        // Recheck before every broadcast, including locally signed transactions.
        if (
          !identityCheck ||
          method === "eth_sendRawTransaction" ||
          method === "eth_sendTransaction" ||
          method === "eth_signTransaction"
        ) {
          identityCheck = assertNetworkIdentity(rpc, chainConfig).catch(error => {
            identityCheck = undefined;
            throw error;
          });
        }
        await identityCheck;
      }
      if (PROVIDER_METHODS.has(method) && isAddress) {
        const provider = config.provider || (typeof window !== "undefined" ? window.ethereum : undefined);
        if (provider) {
          try {
            if (method === "eth_sendTransaction" || method === "eth_signTransaction") {
              await assertChainMatch(provider, chainConfig);
              await assertNetworkIdentity(args => provider.request(args), chainConfig);
            }
            return await provider.request({method, params});
          } catch (err) {
            console.warn(`Error using provider for method ${method}:`, err);
            throw err;
          }
        }
      }

      try {
        return await rpc({method, params});
      } catch (err) {
        console.error(`GenLayer RPC error (${method}):`, (err as Error).message || err);
        throw err;
      }
    },
  };
};

/**
 * Creates a GenLayer client instance for interacting with the network.
 *
 * @param config - Client configuration options
 * @param config.chain - Chain to connect to (localnet, testnetBradbury, etc.)
 * @param config.endpoint - Custom RPC endpoint URL
 * @param config.account - Account or address for signing transactions
 * @param config.provider - EthereumProvider for wallet integration
 * @returns Configured client with contract, transaction, and staking methods
 */
export const createClient = (config: ClientConfig = {chain: localnet}): GenLayerClient<GenLayerChain> => {
  const source = config.chain || localnet;
  const chainConfig = config.endpoint
    ? {...source, rpcUrls: {...source.rpcUrls, default: {...source.rpcUrls.default, http: [config.endpoint]}}}
    : source;

  const customTransport = custom(getCustomTransportConfig(config, chainConfig as GenLayerChain), {
    retryCount: 0,
    retryDelay: 0,
  });
  const publicClient = createPublicClient(chainConfig as GenLayerChain, customTransport).extend(
    publicActions,
  );

  const baseClient = createViemClient({
    chain: chainConfig,
    transport: customTransport,
    ...(config.account ? {account: config.account} : {}),
  });

  const clientWithBasicActions = baseClient
    .extend(publicActions)
    .extend(walletActions)
    .extend(client => accountActions(client as unknown as GenLayerClient<GenLayerChain>, publicClient));

  const clientWithTransactionActions = {
    ...clientWithBasicActions,
    ...transactionActions(clientWithBasicActions as unknown as GenLayerClient<GenLayerChain>, publicClient),
    ...chainActions(clientWithBasicActions as unknown as GenLayerClient<GenLayerChain>),
    ...genlayerWalletActions(clientWithBasicActions as unknown as GenLayerClient<GenLayerChain>),
  } as unknown as GenLayerClient<GenLayerChain>;

  const clientWithAllActions = {
    ...clientWithTransactionActions,
    ...contractActions(
      clientWithTransactionActions as unknown as GenLayerClient<GenLayerChain>,
      publicClient,
    ),
  } as unknown as GenLayerClient<GenLayerChain>;

  const clientWithReceiptActions = {
    ...clientWithAllActions,
    ...receiptActions(clientWithAllActions as unknown as GenLayerClient<GenLayerChain>, publicClient),
  } as unknown as GenLayerClient<GenLayerChain>;

  const finalClient = {
    ...clientWithReceiptActions,
    ...stakingActions(clientWithReceiptActions as unknown as GenLayerClient<GenLayerChain>, publicClient),
    ...vestingActions(clientWithReceiptActions as unknown as GenLayerClient<GenLayerChain>, publicClient),
  } as unknown as GenLayerClient<GenLayerChain>;

  return finalClient;
};

export const createPublicClient = (
  chainConfig: GenLayerChain,
  customTransport: Transport,
): PublicClient<Transport, Chain> => {
  return createPublicViemClient({chain: chainConfig, transport: customTransport});
};
