import {GenLayerTransaction, GenLayerRawTransaction, DecodedCallData, DecodedDeployData,transactionsStatusNumberToName, transactionResultNumberToName, voteTypeNumberToName, VoteType} from "../types/transactions";
import {b64ToArray, calldataToUserFriendlyJson, resultToUserFriendlyJson} from "../utils/jsonifier";
import {fromRlp, fromHex, Hex, Address} from "viem";
import * as calldataAbi from "../abi/calldata";

// Fields to remove from simplified transaction receipts
const FIELDS_TO_REMOVE = [
  "raw", "contract_state", "base64", "consensus_history", "tx_data",
  "eq_blocks_outputs", "r", "s", "v", "created_timestamp",
  "current_timestamp", "tx_execution_hash", "random_seed", "states",
  "contract_code", "appeal_failed", "appeal_leader_timeout",
  "appeal_processing_time", "appeal_undetermined", "appealed",
  "timestamp_appeal", "config_rotation_rounds", "rotation_count",
  "queue_position", "queue_type", "leader_timeout_validators",
  "triggered_by", "num_of_initial_validators",
  "timestamp_awaiting_finalization", "last_vote_timestamp",
  "read_state_block_range", "tx_slot", "blockHash", "blockNumber",
  "to", "transactionIndex"
];

// Field name mappings for cross-language compatibility with genlayer-py
const FIELD_NAME_MAPPINGS: Record<string, string> = {
  statusName: "status_name",
  typeHex: "type"
};

export const decodeInputData = (
  rlpEncodedAppData: Hex | undefined | null,
  recipient: Address,
): DecodedDeployData | DecodedCallData | null => {
  if (!rlpEncodedAppData || rlpEncodedAppData === "0x" || rlpEncodedAppData.length <= 2) {
    return null;
  }
  try {
    const rlpDecodedArray = fromRlp(rlpEncodedAppData) as Hex[];

    if (rlpDecodedArray.length === 3) {
      return {
        code: fromHex(rlpDecodedArray[0], "string") as `0x${string}`,
        constructorArgs:
          rlpDecodedArray[1] && rlpDecodedArray[1] !== "0x"
            ? calldataAbi.decode(fromHex(rlpDecodedArray[1], "bytes"))
            : null,
        leaderOnly: rlpDecodedArray[2] === "0x01",
        type: "deploy",
        contractAddress: recipient,
      };
    } else if (rlpDecodedArray.length === 2) {
      return {
        callData:
          rlpDecodedArray[0] && rlpDecodedArray[0] !== "0x"
            ? calldataAbi.decode(fromHex(rlpDecodedArray[0], "bytes"))
            : null,
        leaderOnly: rlpDecodedArray[1] === "0x01",
        type: "call",
      };
    } else {
      console.warn(
        "[decodeInputData] WRITE: Unexpected RLP array length:",
        rlpDecodedArray.length,
        rlpDecodedArray,
      );
      return null;
    }
  } catch (e) {
    console.error(
      "[decodeInputData] Error during comprehensive decoding:",
      e,
      "Raw RLP App Data:",
      rlpEncodedAppData,
    );
    return null;
  }
};

export const decodeTransaction = (tx: GenLayerRawTransaction): GenLayerTransaction => {
  const txDataDecoded = decodeInputData(tx.txData, tx.recipient);

  const decodedTx = {
    ...tx,
    txData: tx.txData,
    txDataDecoded: txDataDecoded,

    currentTimestamp: tx.currentTimestamp.toString(),
    numOfInitialValidators: tx.numOfInitialValidators.toString(),
    txSlot: tx.txSlot.toString(),
    createdTimestamp: tx.createdTimestamp.toString(),
    lastVoteTimestamp: tx.lastVoteTimestamp.toString(),
    queuePosition: tx.queuePosition.toString(),
    numOfRounds: tx.numOfRounds.toString(),

    readStateBlockRange: {
      ...tx.readStateBlockRange,
      activationBlock: tx.readStateBlockRange.activationBlock.toString(),
      processingBlock: tx.readStateBlockRange.processingBlock.toString(),
      proposalBlock: tx.readStateBlockRange.proposalBlock.toString(),
    },

    statusName:
      transactionsStatusNumberToName[String(tx.status) as keyof typeof transactionsStatusNumberToName],
    resultName:
      transactionResultNumberToName[String(tx.result) as keyof typeof transactionResultNumberToName],

    lastRound: {
      ...tx.lastRound,
      round: tx.lastRound.round.toString(),
      leaderIndex: tx.lastRound.leaderIndex.toString(),
      votesCommitted: tx.lastRound.votesCommitted.toString(),
      votesRevealed: tx.lastRound.votesRevealed.toString(),
      appealBond: tx.lastRound.appealBond.toString(),
      rotationsLeft: tx.lastRound.rotationsLeft.toString(),
      validatorVotesName: tx.lastRound.validatorVotes.map(
        vote => voteTypeNumberToName[String(vote) as keyof typeof voteTypeNumberToName],
      ) as VoteType[],
    },
  };
  return decodedTx as GenLayerTransaction;
};

export const simplifyTransactionReceipt = (tx: GenLayerTransaction): GenLayerTransaction => {
  /**
   * Simplify transaction receipt by removing non-essential fields while preserving functionality.
   *
   * Removes: Binary data, internal timestamps, appeal fields, processing details, historical data
   * Preserves: Transaction IDs, status, execution results, node configs, readable data
   */
  const simplifyObject = (obj: any, path = ""): any => {
    if (obj === null || obj === undefined) return obj;
    
    if (Array.isArray(obj)) {
      return obj.map(item => simplifyObject(item, path)).filter(item => item !== undefined);
    }
    
    if (typeof obj === "object") {
      const result: any = {};
      
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        // Always remove these fields
        if (FIELDS_TO_REMOVE.includes(key)) {
          continue;
        }
        
        // Remove node_config only from top level (keep it in consensus_data)
        if (key === "node_config" && !path.includes("consensus_data")) {
          continue;
        }
        
        // Special handling for consensus_data - keep execution results and votes
        if (key === "consensus_data" && typeof value === "object" && value !== null) {
          const simplifiedConsensus: any = {};
          
          // Keep votes
          if ("votes" in value) {
            simplifiedConsensus.votes = value.votes;
          }
          
          // Process leader_receipt to keep only essential fields
          if ("leader_receipt" in value && Array.isArray(value.leader_receipt)) {
            simplifiedConsensus.leader_receipt = value.leader_receipt.map((receipt: any) => {
              const simplifiedReceipt: any = {};
              
              // Keep essential execution info
              ["execution_result", "genvm_result", "mode", "vote", "node_config"].forEach(field => {
                if (field in receipt) {
                  simplifiedReceipt[field] = receipt[field];
                }
              });
              
              // Keep readable calldata
              if (receipt.calldata && typeof receipt.calldata === "object" && "readable" in receipt.calldata) {
                simplifiedReceipt.calldata = { readable: receipt.calldata.readable };
              }
              
              // Keep readable outputs
              if (receipt.eq_outputs) {
                simplifiedReceipt.eq_outputs = simplifyObject(receipt.eq_outputs, currentPath);
              }
              if (receipt.result) {
                simplifiedReceipt.result = simplifyObject(receipt.result, currentPath);
              }
              
              return simplifiedReceipt;
            });
          }
          
          // Process validators to keep execution results
          if ("validators" in value && Array.isArray(value.validators)) {
            const simplifiedValidators = value.validators.map((validator: any) => {
              const simplifiedValidator: any = {};
              ["execution_result", "genvm_result", "mode", "vote", "node_config"].forEach(field => {
                if (field in validator) {
                  simplifiedValidator[field] = validator[field];
                }
              });
              return simplifiedValidator;
            }).filter((validator: any) => Object.keys(validator).length > 0);
            
            if (simplifiedValidators.length > 0) {
              simplifiedConsensus.validators = simplifiedValidators;
            }
          }
          
          result[key] = simplifiedConsensus;
          continue;
        }
        
        const simplifiedValue = simplifyObject(value, currentPath);
        // Include the value if it's not undefined and not an empty object
        // Special case: include numeric 0 values (like value: 0)
        const shouldInclude = simplifiedValue !== undefined && 
          !(typeof simplifiedValue === "object" && simplifiedValue !== null && Object.keys(simplifiedValue).length === 0);
        
        if (shouldInclude || simplifiedValue === 0) {
          // Map field names for cross-language compatibility
          const mappedKey = FIELD_NAME_MAPPINGS[key] || key;
          result[mappedKey] = simplifiedValue;
        }
      }
      
      return result;
    }
    
    return obj;
  };
  
  return simplifyObject({...tx});
};

export const decodeLocalnetTransaction = (tx: GenLayerTransaction): GenLayerTransaction => {
  if (!tx.data) return tx;
  try {
    const leaderReceipt = tx.consensus_data?.leader_receipt;
    if (leaderReceipt) {
      const receipts = Array.isArray(leaderReceipt) ? leaderReceipt : [leaderReceipt];
      receipts.forEach((receipt) => {
        if (receipt.result && typeof receipt.result === "string") {
          receipt.result = resultToUserFriendlyJson(receipt.result);
        }
        if (receipt.calldata && typeof receipt.calldata === "string") {
          receipt.calldata = {
            base64: receipt.calldata as string,
            ...calldataToUserFriendlyJson(b64ToArray(receipt.calldata as string)),
          };
        }
        if (receipt.eq_outputs) {
          const decodedOutputs: any = {};
          for (const [key, value] of Object.entries(receipt.eq_outputs)) {
            if (typeof value === "object" && value !== null) {
              decodedOutputs[key] = value;
            } else {
              try {
                decodedOutputs[key] = resultToUserFriendlyJson(value as string);
              } catch (e) {
                console.warn(`Error decoding eq_output ${key}: ${e}`);
                decodedOutputs[key] = value;
              }
            }
          }
          receipt.eq_outputs = decodedOutputs;
        }
      });
    }
    if (tx.data?.calldata && typeof tx.data.calldata === "string") {
      tx.data.calldata = {
        base64: tx.data.calldata as string,
        ...calldataToUserFriendlyJson(b64ToArray(tx.data.calldata as string)),
      };
    }
  } catch (e) {
    console.error("Error in decodeLocalnetTransaction:", e);
  }
  return tx;
}; 