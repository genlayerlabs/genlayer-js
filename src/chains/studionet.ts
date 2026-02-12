import {Address, defineChain} from "viem";
import {GenLayerChain} from "@/types";

// chains/localnet.ts
const SIMULATOR_JSON_RPC_URL = "https://studio.genlayer.com/api";
const EXPLORER_URL = "https://genlayer-explorer.vercel.app";
const CONSENSUS_MAIN_CONTRACT = {
  address: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575" as Address,
  abi: [
    {
      "inputs": [],
      "stateMutability": "nonpayable",
      "type": "constructor"
    },
    {
      "inputs": [],
      "name": "CallerNotMessages",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "CanNotAppeal",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidDeploymentWithSalt",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidGhostContract",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInitialization",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidRevealLeaderData",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidVote",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotInitializing",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldActivator",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newActivator",
          "type": "address"
        }
      ],
      "name": "ActivatorReplaced",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "addressManager",
          "type": "address"
        }
      ],
      "name": "AddressManagerSet",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "enum ITransactions.TransactionStatus",
          "name": "newStatus",
          "type": "uint8"
        }
      ],
      "name": "AllVotesCommitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "appellant",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "bond",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "address[]",
          "name": "validators",
          "type": "address[]"
        }
      ],
      "name": "AppealStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "attempted",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "succeeded",
          "type": "uint256"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "failed",
          "type": "uint256"
        }
      ],
      "name": "BatchFinalizationCompleted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "txSlot",
          "type": "uint256"
        }
      ],
      "name": "CreatedTransaction",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "version",
          "type": "uint64"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "activator",
          "type": "address"
        }
      ],
      "name": "InternalMessageProcessed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldLeader",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newLeader",
          "type": "address"
        }
      ],
      "name": "LeaderIdlenessProcessed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "activator",
          "type": "address"
        }
      ],
      "name": "NewTransaction",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "ProcessIdlenessAccepted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "TransactionAccepted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "leader",
          "type": "address"
        }
      ],
      "name": "TransactionActivated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "cancelledBy",
          "type": "address"
        }
      ],
      "name": "TransactionCancelled",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "TransactionFinalizationFailed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "TransactionFinalized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "TransactionLeaderRevealed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newLeader",
          "type": "address"
        }
      ],
      "name": "TransactionLeaderRotated",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "TransactionLeaderTimeout",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "bytes32[]",
          "name": "txIds",
          "type": "bytes32[]"
        }
      ],
      "name": "TransactionNeedsRecomputation",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "address[]",
          "name": "validators",
          "type": "address[]"
        }
      ],
      "name": "TransactionReceiptProposed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "TransactionUndetermined",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tribunalIndex",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "validator",
          "type": "address"
        }
      ],
      "name": "TribunalAppealVoteCommitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "tribunalIndex",
          "type": "uint256"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "validator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum ITransactions.VoteType",
          "name": "voteType",
          "type": "uint8"
        }
      ],
      "name": "TribunalAppealVoteRevealed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "oldValidator",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newValidator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "validatorIndex",
          "type": "uint256"
        }
      ],
      "name": "ValidatorReplaced",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "uint256",
          "name": "value",
          "type": "uint256"
        }
      ],
      "name": "ValueWithdrawalFailed",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "validator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isLastVote",
          "type": "bool"
        }
      ],
      "name": "VoteCommitted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "validator",
          "type": "address"
        },
        {
          "indexed": false,
          "internalType": "enum ITransactions.VoteType",
          "name": "voteType",
          "type": "uint8"
        },
        {
          "indexed": false,
          "internalType": "bool",
          "name": "isLastVote",
          "type": "bool"
        },
        {
          "indexed": false,
          "internalType": "enum ITransactions.ResultType",
          "name": "result",
          "type": "uint8"
        }
      ],
      "name": "VoteRevealed",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "EVENTS_BATCH_SIZE",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "VERSION",
      "outputs": [
        {
          "internalType": "string",
          "name": "",
          "type": "string"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "acceptOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "_operator",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "_vrfProof",
          "type": "bytes"
        }
      ],
      "name": "activateTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_sender",
          "type": "address"
        },
        {
          "internalType": "address",
          "name": "_recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_numOfInitialValidators",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_maxRotations",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "_calldata",
          "type": "bytes"
        },
        {
          "internalType": "uint256",
          "name": "_validUntil",
          "type": "uint256"
        }
      ],
      "name": "addTransaction",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "addressManager",
      "outputs": [
        {
          "internalType": "contract IAddressManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "cancelTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_tribunalIndex",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_commitHash",
          "type": "bytes32"
        }
      ],
      "name": "commitTribunalAppealVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "_commitHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_validatorIndex",
          "type": "uint256"
        }
      ],
      "name": "commitVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_sender",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_numOfInitialValidators",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_maxRotations",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "_calldata",
          "type": "bytes"
        },
        {
          "internalType": "uint256",
          "name": "_saltNonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_validUntil",
          "type": "uint256"
        }
      ],
      "name": "deploySalted",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "_value",
          "type": "uint256"
        },
        {
          "internalType": "bytes",
          "name": "_data",
          "type": "bytes"
        }
      ],
      "name": "executeMessage",
      "outputs": [
        {
          "internalType": "bool",
          "name": "success",
          "type": "bool"
        }
      ],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32[]",
          "name": "_txIds",
          "type": "bytes32[]"
        }
      ],
      "name": "finalizeIdlenessTxs",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "finalizeTransaction",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "flushExternalMessages",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "getAddressManager",
      "outputs": [
        {
          "internalType": "contract IAddressManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "txId",
          "type": "bytes32"
        }
      ],
      "name": "getPendingTransactionValue",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_addressManager",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "addr",
          "type": "address"
        }
      ],
      "name": "isGhostContract",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "leaderIdleness",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "components": [
            {
              "internalType": "bytes32",
              "name": "txId",
              "type": "bytes32"
            },
            {
              "internalType": "uint256",
              "name": "saltAsAValidator",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "txExecutionHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "messagesAndOtherFieldsHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "otherExecutionFieldsHash",
              "type": "bytes32"
            },
            {
              "internalType": "enum ITransactions.VoteType",
              "name": "resultValue",
              "type": "uint8"
            },
            {
              "components": [
                {
                  "internalType": "enum IMessages.MessageType",
                  "name": "messageType",
                  "type": "uint8"
                },
                {
                  "internalType": "address",
                  "name": "recipient",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "value",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "data",
                  "type": "bytes"
                },
                {
                  "internalType": "bool",
                  "name": "onAcceptance",
                  "type": "bool"
                },
                {
                  "internalType": "uint256",
                  "name": "saltNonce",
                  "type": "uint256"
                }
              ],
              "internalType": "struct IMessages.SubmittedMessage[]",
              "name": "messages",
              "type": "tuple[]"
            }
          ],
          "internalType": "struct IConsensusMain.LeaderRevealVoteParams",
          "name": "leaderRevealVoteParams",
          "type": "tuple"
        }
      ],
      "name": "leaderRevealVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pendingOwner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "processIdleness",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "_txExecutionHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_processingBlock",
          "type": "uint256"
        },
        {
          "internalType": "address",
          "name": "_operator",
          "type": "address"
        },
        {
          "internalType": "bytes",
          "name": "_eqBlocksOutputs",
          "type": "bytes"
        },
        {
          "internalType": "bytes",
          "name": "_vrfProof",
          "type": "bytes"
        }
      ],
      "name": "proposeReceipt",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32[]",
          "name": "_txIds",
          "type": "bytes32[]"
        }
      ],
      "name": "redButtonFinalize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "ghost",
          "type": "address"
        }
      ],
      "name": "registerGhostContract",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_tribunalIndex",
          "type": "uint256"
        },
        {
          "internalType": "bytes32",
          "name": "_voteHash",
          "type": "bytes32"
        },
        {
          "internalType": "enum ITransactions.VoteType",
          "name": "_voteType",
          "type": "uint8"
        },
        {
          "internalType": "bytes32",
          "name": "_otherExecutionFieldsHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_nonce",
          "type": "uint256"
        }
      ],
      "name": "revealTribunalAppealVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "bytes32",
          "name": "_voteHash",
          "type": "bytes32"
        },
        {
          "internalType": "enum ITransactions.VoteType",
          "name": "_voteType",
          "type": "uint8"
        },
        {
          "internalType": "bytes32",
          "name": "_otherExecutionFieldsHash",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_nonce",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "_validatorIndex",
          "type": "uint256"
        }
      ],
      "name": "revealVote",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_addressManager",
          "type": "address"
        }
      ],
      "name": "setAddressManager",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "submitAppeal",
      "outputs": [],
      "stateMutability": "payable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "stateMutability": "payable",
      "type": "receive"
    }
  ],
  bytecode: "",
};

const CONSENSUS_DATA_CONTRACT = {
  address: "0x88B0F18613Db92Bf970FfE264E02496e20a74D16" as Address,
  abi: [
    {
      "inputs": [],
      "name": "AccessControlBadConfirmation",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "internalType": "bytes32",
          "name": "neededRole",
          "type": "bytes32"
        }
      ],
      "name": "AccessControlUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "InvalidInitialization",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "NotInitializing",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "owner",
          "type": "address"
        }
      ],
      "name": "OwnableInvalidOwner",
      "type": "error"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "OwnableUnauthorizedAccount",
      "type": "error"
    },
    {
      "inputs": [],
      "name": "ReentrancyGuardReentrantCall",
      "type": "error"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": false,
          "internalType": "uint64",
          "name": "version",
          "type": "uint64"
        }
      ],
      "name": "Initialized",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferStarted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "address",
          "name": "previousOwner",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "OwnershipTransferred",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "previousAdminRole",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "newAdminRole",
          "type": "bytes32"
        }
      ],
      "name": "RoleAdminChanged",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleGranted",
      "type": "event"
    },
    {
      "anonymous": false,
      "inputs": [
        {
          "indexed": true,
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "account",
          "type": "address"
        },
        {
          "indexed": true,
          "internalType": "address",
          "name": "sender",
          "type": "address"
        }
      ],
      "name": "RoleRevoked",
      "type": "event"
    },
    {
      "inputs": [],
      "name": "DEFAULT_ADMIN_ROLE",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "acceptOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "addressManager",
      "outputs": [
        {
          "internalType": "contract IAddressManager",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_currentTimestamp",
          "type": "uint256"
        }
      ],
      "name": "canFinalize",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        }
      ],
      "name": "getLatestAcceptedTransaction",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "currentTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "initialRotations",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "txSlot",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastVoteTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "randomSeed",
              "type": "bytes32"
            },
            {
              "internalType": "enum ITransactions.ResultType",
              "name": "result",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txExecutionHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "txCalldata",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "eqBlocksOutputs",
              "type": "bytes"
            },
            {
              "components": [
                {
                  "internalType": "enum IMessages.MessageType",
                  "name": "messageType",
                  "type": "uint8"
                },
                {
                  "internalType": "address",
                  "name": "recipient",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "value",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "data",
                  "type": "bytes"
                },
                {
                  "internalType": "bool",
                  "name": "onAcceptance",
                  "type": "bool"
                },
                {
                  "internalType": "uint256",
                  "name": "saltNonce",
                  "type": "uint256"
                }
              ],
              "internalType": "struct IMessages.SubmittedMessage[]",
              "name": "messages",
              "type": "tuple[]"
            },
            {
              "internalType": "enum IQueues.QueueType",
              "name": "queueType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "queuePosition",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "activator",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "lastLeader",
              "type": "address"
            },
            {
              "internalType": "enum ITransactions.TransactionStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txId",
              "type": "bytes32"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "activationBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "processingBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "proposalBlock",
                  "type": "uint256"
                }
              ],
              "internalType": "struct ITransactions.ReadStateBlockRange",
              "name": "readStateBlockRange",
              "type": "tuple"
            },
            {
              "internalType": "uint256",
              "name": "numOfRounds",
              "type": "uint256"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "round",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "leaderIndex",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesCommitted",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesRevealed",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "appealBond",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "rotationsLeft",
                  "type": "uint256"
                },
                {
                  "internalType": "enum ITransactions.ResultType",
                  "name": "result",
                  "type": "uint8"
                },
                {
                  "internalType": "address[]",
                  "name": "roundValidators",
                  "type": "address[]"
                },
                {
                  "internalType": "enum ITransactions.VoteType[]",
                  "name": "validatorVotes",
                  "type": "uint8[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorVotesHash",
                  "type": "bytes32[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorResultHash",
                  "type": "bytes32[]"
                }
              ],
              "internalType": "struct ITransactions.RoundData",
              "name": "lastRound",
              "type": "tuple"
            },
            {
              "internalType": "address[]",
              "name": "consumedValidators",
              "type": "address[]"
            }
          ],
          "internalType": "struct ConsensusData.TransactionData",
          "name": "inputData",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "startIndex",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "pageSize",
          "type": "uint256"
        }
      ],
      "name": "getLatestAcceptedTransactions",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "currentTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "initialRotations",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "txSlot",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastVoteTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "randomSeed",
              "type": "bytes32"
            },
            {
              "internalType": "enum ITransactions.ResultType",
              "name": "result",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txExecutionHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "txCalldata",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "eqBlocksOutputs",
              "type": "bytes"
            },
            {
              "components": [
                {
                  "internalType": "enum IMessages.MessageType",
                  "name": "messageType",
                  "type": "uint8"
                },
                {
                  "internalType": "address",
                  "name": "recipient",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "value",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "data",
                  "type": "bytes"
                },
                {
                  "internalType": "bool",
                  "name": "onAcceptance",
                  "type": "bool"
                },
                {
                  "internalType": "uint256",
                  "name": "saltNonce",
                  "type": "uint256"
                }
              ],
              "internalType": "struct IMessages.SubmittedMessage[]",
              "name": "messages",
              "type": "tuple[]"
            },
            {
              "internalType": "enum IQueues.QueueType",
              "name": "queueType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "queuePosition",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "activator",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "lastLeader",
              "type": "address"
            },
            {
              "internalType": "enum ITransactions.TransactionStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txId",
              "type": "bytes32"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "activationBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "processingBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "proposalBlock",
                  "type": "uint256"
                }
              ],
              "internalType": "struct ITransactions.ReadStateBlockRange",
              "name": "readStateBlockRange",
              "type": "tuple"
            },
            {
              "internalType": "uint256",
              "name": "numOfRounds",
              "type": "uint256"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "round",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "leaderIndex",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesCommitted",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesRevealed",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "appealBond",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "rotationsLeft",
                  "type": "uint256"
                },
                {
                  "internalType": "enum ITransactions.ResultType",
                  "name": "result",
                  "type": "uint8"
                },
                {
                  "internalType": "address[]",
                  "name": "roundValidators",
                  "type": "address[]"
                },
                {
                  "internalType": "enum ITransactions.VoteType[]",
                  "name": "validatorVotes",
                  "type": "uint8[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorVotesHash",
                  "type": "bytes32[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorResultHash",
                  "type": "bytes32[]"
                }
              ],
              "internalType": "struct ITransactions.RoundData",
              "name": "lastRound",
              "type": "tuple"
            },
            {
              "internalType": "address[]",
              "name": "consumedValidators",
              "type": "address[]"
            }
          ],
          "internalType": "struct ConsensusData.TransactionData[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        }
      ],
      "name": "getLatestAcceptedTxCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        }
      ],
      "name": "getLatestFinalizedTransaction",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "currentTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "initialRotations",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "txSlot",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastVoteTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "randomSeed",
              "type": "bytes32"
            },
            {
              "internalType": "enum ITransactions.ResultType",
              "name": "result",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txExecutionHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "txCalldata",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "eqBlocksOutputs",
              "type": "bytes"
            },
            {
              "components": [
                {
                  "internalType": "enum IMessages.MessageType",
                  "name": "messageType",
                  "type": "uint8"
                },
                {
                  "internalType": "address",
                  "name": "recipient",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "value",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "data",
                  "type": "bytes"
                },
                {
                  "internalType": "bool",
                  "name": "onAcceptance",
                  "type": "bool"
                },
                {
                  "internalType": "uint256",
                  "name": "saltNonce",
                  "type": "uint256"
                }
              ],
              "internalType": "struct IMessages.SubmittedMessage[]",
              "name": "messages",
              "type": "tuple[]"
            },
            {
              "internalType": "enum IQueues.QueueType",
              "name": "queueType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "queuePosition",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "activator",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "lastLeader",
              "type": "address"
            },
            {
              "internalType": "enum ITransactions.TransactionStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txId",
              "type": "bytes32"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "activationBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "processingBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "proposalBlock",
                  "type": "uint256"
                }
              ],
              "internalType": "struct ITransactions.ReadStateBlockRange",
              "name": "readStateBlockRange",
              "type": "tuple"
            },
            {
              "internalType": "uint256",
              "name": "numOfRounds",
              "type": "uint256"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "round",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "leaderIndex",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesCommitted",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesRevealed",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "appealBond",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "rotationsLeft",
                  "type": "uint256"
                },
                {
                  "internalType": "enum ITransactions.ResultType",
                  "name": "result",
                  "type": "uint8"
                },
                {
                  "internalType": "address[]",
                  "name": "roundValidators",
                  "type": "address[]"
                },
                {
                  "internalType": "enum ITransactions.VoteType[]",
                  "name": "validatorVotes",
                  "type": "uint8[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorVotesHash",
                  "type": "bytes32[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorResultHash",
                  "type": "bytes32[]"
                }
              ],
              "internalType": "struct ITransactions.RoundData",
              "name": "lastRound",
              "type": "tuple"
            },
            {
              "internalType": "address[]",
              "name": "consumedValidators",
              "type": "address[]"
            }
          ],
          "internalType": "struct ConsensusData.TransactionData",
          "name": "inputData",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "startIndex",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "pageSize",
          "type": "uint256"
        }
      ],
      "name": "getLatestFinalizedTransactions",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "currentTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "initialRotations",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "txSlot",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastVoteTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "randomSeed",
              "type": "bytes32"
            },
            {
              "internalType": "enum ITransactions.ResultType",
              "name": "result",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txExecutionHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "txCalldata",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "eqBlocksOutputs",
              "type": "bytes"
            },
            {
              "components": [
                {
                  "internalType": "enum IMessages.MessageType",
                  "name": "messageType",
                  "type": "uint8"
                },
                {
                  "internalType": "address",
                  "name": "recipient",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "value",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "data",
                  "type": "bytes"
                },
                {
                  "internalType": "bool",
                  "name": "onAcceptance",
                  "type": "bool"
                },
                {
                  "internalType": "uint256",
                  "name": "saltNonce",
                  "type": "uint256"
                }
              ],
              "internalType": "struct IMessages.SubmittedMessage[]",
              "name": "messages",
              "type": "tuple[]"
            },
            {
              "internalType": "enum IQueues.QueueType",
              "name": "queueType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "queuePosition",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "activator",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "lastLeader",
              "type": "address"
            },
            {
              "internalType": "enum ITransactions.TransactionStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txId",
              "type": "bytes32"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "activationBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "processingBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "proposalBlock",
                  "type": "uint256"
                }
              ],
              "internalType": "struct ITransactions.ReadStateBlockRange",
              "name": "readStateBlockRange",
              "type": "tuple"
            },
            {
              "internalType": "uint256",
              "name": "numOfRounds",
              "type": "uint256"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "round",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "leaderIndex",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesCommitted",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesRevealed",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "appealBond",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "rotationsLeft",
                  "type": "uint256"
                },
                {
                  "internalType": "enum ITransactions.ResultType",
                  "name": "result",
                  "type": "uint8"
                },
                {
                  "internalType": "address[]",
                  "name": "roundValidators",
                  "type": "address[]"
                },
                {
                  "internalType": "enum ITransactions.VoteType[]",
                  "name": "validatorVotes",
                  "type": "uint8[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorVotesHash",
                  "type": "bytes32[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorResultHash",
                  "type": "bytes32[]"
                }
              ],
              "internalType": "struct ITransactions.RoundData",
              "name": "lastRound",
              "type": "tuple"
            },
            {
              "internalType": "address[]",
              "name": "consumedValidators",
              "type": "address[]"
            }
          ],
          "internalType": "struct ConsensusData.TransactionData[]",
          "name": "",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "recipient",
          "type": "address"
        }
      ],
      "name": "getLatestFinalizedTxCount",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "",
          "type": "uint256"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        }
      ],
      "name": "getRoleAdmin",
      "outputs": [
        {
          "internalType": "bytes32",
          "name": "",
          "type": "bytes32"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "getTransactionAllData",
      "outputs": [
        {
          "components": [
            {
              "internalType": "enum ITransactions.ResultType",
              "name": "result",
              "type": "uint8"
            },
            {
              "internalType": "enum ITransactions.VoteType",
              "name": "txExecutionResult",
              "type": "uint8"
            },
            {
              "internalType": "enum ITransactions.TransactionStatus",
              "name": "previousStatus",
              "type": "uint8"
            },
            {
              "internalType": "enum ITransactions.TransactionStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "address",
              "name": "txOrigin",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "activator",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "txSlot",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "initialRotations",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "numOfInitialValidators",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "epoch",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "id",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "randomSeed",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "txExecutionHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes32",
              "name": "resultHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "txCalldata",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "eqBlocksOutputs",
              "type": "bytes"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "activationBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "processingBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "proposalBlock",
                  "type": "uint256"
                }
              ],
              "internalType": "struct ITransactions.ReadStateBlockRange[]",
              "name": "readStateBlockRanges",
              "type": "tuple[]"
            },
            {
              "internalType": "uint256",
              "name": "validUntil",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "value",
              "type": "uint256"
            }
          ],
          "internalType": "struct ITransactions.Transaction",
          "name": "transaction",
          "type": "tuple"
        },
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "round",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "leaderIndex",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "votesCommitted",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "votesRevealed",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "appealBond",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "rotationsLeft",
              "type": "uint256"
            },
            {
              "internalType": "enum ITransactions.ResultType",
              "name": "result",
              "type": "uint8"
            },
            {
              "internalType": "address[]",
              "name": "roundValidators",
              "type": "address[]"
            },
            {
              "internalType": "enum ITransactions.VoteType[]",
              "name": "validatorVotes",
              "type": "uint8[]"
            },
            {
              "internalType": "bytes32[]",
              "name": "validatorVotesHash",
              "type": "bytes32[]"
            },
            {
              "internalType": "bytes32[]",
              "name": "validatorResultHash",
              "type": "bytes32[]"
            }
          ],
          "internalType": "struct ITransactions.RoundData[]",
          "name": "roundsData",
          "type": "tuple[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_timestamp",
          "type": "uint256"
        }
      ],
      "name": "getTransactionData",
      "outputs": [
        {
          "components": [
            {
              "internalType": "uint256",
              "name": "currentTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "sender",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "recipient",
              "type": "address"
            },
            {
              "internalType": "uint256",
              "name": "initialRotations",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "txSlot",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "createdTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "uint256",
              "name": "lastVoteTimestamp",
              "type": "uint256"
            },
            {
              "internalType": "bytes32",
              "name": "randomSeed",
              "type": "bytes32"
            },
            {
              "internalType": "enum ITransactions.ResultType",
              "name": "result",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txExecutionHash",
              "type": "bytes32"
            },
            {
              "internalType": "bytes",
              "name": "txCalldata",
              "type": "bytes"
            },
            {
              "internalType": "bytes",
              "name": "eqBlocksOutputs",
              "type": "bytes"
            },
            {
              "components": [
                {
                  "internalType": "enum IMessages.MessageType",
                  "name": "messageType",
                  "type": "uint8"
                },
                {
                  "internalType": "address",
                  "name": "recipient",
                  "type": "address"
                },
                {
                  "internalType": "uint256",
                  "name": "value",
                  "type": "uint256"
                },
                {
                  "internalType": "bytes",
                  "name": "data",
                  "type": "bytes"
                },
                {
                  "internalType": "bool",
                  "name": "onAcceptance",
                  "type": "bool"
                },
                {
                  "internalType": "uint256",
                  "name": "saltNonce",
                  "type": "uint256"
                }
              ],
              "internalType": "struct IMessages.SubmittedMessage[]",
              "name": "messages",
              "type": "tuple[]"
            },
            {
              "internalType": "enum IQueues.QueueType",
              "name": "queueType",
              "type": "uint8"
            },
            {
              "internalType": "uint256",
              "name": "queuePosition",
              "type": "uint256"
            },
            {
              "internalType": "address",
              "name": "activator",
              "type": "address"
            },
            {
              "internalType": "address",
              "name": "lastLeader",
              "type": "address"
            },
            {
              "internalType": "enum ITransactions.TransactionStatus",
              "name": "status",
              "type": "uint8"
            },
            {
              "internalType": "bytes32",
              "name": "txId",
              "type": "bytes32"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "activationBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "processingBlock",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "proposalBlock",
                  "type": "uint256"
                }
              ],
              "internalType": "struct ITransactions.ReadStateBlockRange",
              "name": "readStateBlockRange",
              "type": "tuple"
            },
            {
              "internalType": "uint256",
              "name": "numOfRounds",
              "type": "uint256"
            },
            {
              "components": [
                {
                  "internalType": "uint256",
                  "name": "round",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "leaderIndex",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesCommitted",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "votesRevealed",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "appealBond",
                  "type": "uint256"
                },
                {
                  "internalType": "uint256",
                  "name": "rotationsLeft",
                  "type": "uint256"
                },
                {
                  "internalType": "enum ITransactions.ResultType",
                  "name": "result",
                  "type": "uint8"
                },
                {
                  "internalType": "address[]",
                  "name": "roundValidators",
                  "type": "address[]"
                },
                {
                  "internalType": "enum ITransactions.VoteType[]",
                  "name": "validatorVotes",
                  "type": "uint8[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorVotesHash",
                  "type": "bytes32[]"
                },
                {
                  "internalType": "bytes32[]",
                  "name": "validatorResultHash",
                  "type": "bytes32[]"
                }
              ],
              "internalType": "struct ITransactions.RoundData",
              "name": "lastRound",
              "type": "tuple"
            },
            {
              "internalType": "address[]",
              "name": "consumedValidators",
              "type": "address[]"
            }
          ],
          "internalType": "struct ConsensusData.TransactionData",
          "name": "",
          "type": "tuple"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        },
        {
          "internalType": "uint256",
          "name": "_timestamp",
          "type": "uint256"
        }
      ],
      "name": "getTransactionStatus",
      "outputs": [
        {
          "internalType": "enum ITransactions.TransactionStatus",
          "name": "",
          "type": "uint8"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "_txId",
          "type": "bytes32"
        }
      ],
      "name": "getValidatorsForLastRound",
      "outputs": [
        {
          "internalType": "address[]",
          "name": "validators",
          "type": "address[]"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "grantRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "hasRole",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_addressManager",
          "type": "address"
        }
      ],
      "name": "initialize",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "owner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "pendingOwner",
      "outputs": [
        {
          "internalType": "address",
          "name": "",
          "type": "address"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [],
      "name": "renounceOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "callerConfirmation",
          "type": "address"
        }
      ],
      "name": "renounceRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes32",
          "name": "role",
          "type": "bytes32"
        },
        {
          "internalType": "address",
          "name": "account",
          "type": "address"
        }
      ],
      "name": "revokeRole",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "_addressManager",
          "type": "address"
        }
      ],
      "name": "setAddressManager",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "bytes4",
          "name": "interfaceId",
          "type": "bytes4"
        }
      ],
      "name": "supportsInterface",
      "outputs": [
        {
          "internalType": "bool",
          "name": "",
          "type": "bool"
        }
      ],
      "stateMutability": "view",
      "type": "function"
    },
    {
      "inputs": [
        {
          "internalType": "address",
          "name": "newOwner",
          "type": "address"
        }
      ],
      "name": "transferOwnership",
      "outputs": [],
      "stateMutability": "nonpayable",
      "type": "function"
    }
  ],
  bytecode: "",
};

export const studionet: GenLayerChain = defineChain({
  id: 61_999,
  isStudio: true,
  name: "Genlayer Studio Network",
  rpcUrls: {
    default: {
      http: [SIMULATOR_JSON_RPC_URL],
    },
  },
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "GenLayer Explorer",
      url: EXPLORER_URL,
    },
  },
  testnet: true,
  consensusMainContract: CONSENSUS_MAIN_CONTRACT,
  consensusDataContract: CONSENSUS_DATA_CONTRACT,
  stakingContract: null,
  defaultNumberOfInitialValidators: 5,
  defaultConsensusMaxRotations: 3,
});
