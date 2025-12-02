import {Chain} from "viem";
import {Address} from "./accounts";

export type GenLayerChain = Chain & {
  isStudio: boolean;
  consensusMainContract: {
    address: Address;
    abi: any[];
    bytecode: string;
  } | null;
  consensusDataContract: {
    address: Address;
    abi: any[];
    bytecode: string;
  } | null;
  stakingContract: {
    address: Address;
    abi: readonly unknown[];
  } | null;
  defaultNumberOfInitialValidators: number;
  defaultConsensusMaxRotations: number;
};
