import {Address} from "./accounts";

export type ContractParamsArraySchemaElement = ContractParamsSchema | {$rep: ContractParamsSchema};

export type ContractParamsSchema =
  | "null"
  | "bool"
  | "int"
  | "address"
  | "string"
  | "bytes"
  | "any"
  | "array"
  | "dict"
  | {$or: ContractParamsSchema[]}
  | {$dict: ContractParamsSchema}
  | {[key: string]: ContractParamsSchema}
  | ContractParamsArraySchemaElement[];

export interface ContractMethodBase {
  params: [string, ContractParamsSchema][];
  kwparams: {[key: string]: ContractParamsSchema};
}

export interface ContractMethod extends ContractMethodBase {
  ret: ContractParamsSchema;
  readonly: boolean;
  payable?: boolean;
  min_gas_leader?: number;
  min_gas_validator?: number;
}

export type ContractSchema = {
  ctor: ContractMethodBase;
  methods: Record<string, ContractMethod>;
};

/** A contract's developer NFT. Consensus v0.6 mints one per deployed contract, with the contract address as token id. */
export interface ContractNft {
  nftId: bigint;
  contract: Address;
  owner: Address;
  claimableRewards: bigint;
  lastClaimedEpoch: bigint;
}

/** A developer NFT on a pre-v0.6 NFTMinter, which kept one NFT per developer. */
export interface DeveloperNft {
  nftId: bigint;
  developer: Address;
  claimableRewards: bigint;
  lastClaimedEpoch: bigint;
  ghosts: Address[];
}
