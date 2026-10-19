import {Address, defineChain} from "viem";
import {GenLayerChain} from "@/types";
import {STAKING_ABI} from "@/abi/staking";

const TESTNET_JSON_RPC_URL = "https://rpc.testnet-chain.genlayer.com";
// WebSocket not available on testnet GenLayer RPC nodes

const STAKING_CONTRACT = {
  address: "0xD8fBa96C0dBB0257028dBc0107060b958e5c7113" as Address,
  abi: STAKING_ABI,
};
const FEE_MANAGER_CONTRACT = {
  address: "0x7678587A847712f2A96082AC07883A88D0fc7245" as Address,
  abi: [
    {
      type: "function" as const,
      name: "calculateMinAppealBond",
      stateMutability: "view" as const,
      inputs: [
        { name: "_txId", type: "bytes32" },
        { name: "_round", type: "uint256" },
        { name: "_status", type: "uint8" },
      ],
      outputs: [
        { name: "totalFeesToPay", type: "uint256" },
      ],
    },
  ],
};
const ROUNDS_STORAGE_CONTRACT = {
  address: "0x4038d4F72C7aAbA5a442cC0dA946012B9E3f4B8a" as Address,
  abi: [
    {
      type: "function" as const,
      name: "getLastRoundData",
      stateMutability: "view" as const,
      inputs: [
        { name: "txId", type: "bytes32" },
      ],
      outputs: [
        { name: "round", type: "uint256" },
        {
          name: "roundData",
          type: "tuple",
          components: [
          { name: "round", type: "uint256" },
          { name: "leaderIndex", type: "uint256" },
          { name: "votesCommitted", type: "uint256" },
          { name: "votesRevealed", type: "uint256" },
          { name: "appealBond", type: "uint256" },
          { name: "rotationsLeft", type: "uint256" },
          { name: "result", type: "uint8" },
          { name: "roundValidators", type: "address[]" },
          { name: "validatorVotes", type: "uint8[]" },
          { name: "validatorVotesHash", type: "bytes32[]" },
          { name: "validatorResultHash", type: "bytes32[]" },
          ],
        },
      ],
    },
    {
      type: "function" as const,
      name: "getRoundData",
      stateMutability: "view" as const,
      inputs: [
        { name: "txId", type: "bytes32" },
        { name: "round", type: "uint256" },
      ],
      outputs: [
        {
          name: "",
          type: "tuple",
          components: [
          { name: "round", type: "uint256" },
          { name: "leaderIndex", type: "uint256" },
          { name: "votesCommitted", type: "uint256" },
          { name: "votesRevealed", type: "uint256" },
          { name: "appealBond", type: "uint256" },
          { name: "rotationsLeft", type: "uint256" },
          { name: "result", type: "uint8" },
          { name: "roundValidators", type: "address[]" },
          { name: "validatorVotes", type: "uint8[]" },
          { name: "validatorVotesHash", type: "bytes32[]" },
          { name: "validatorResultHash", type: "bytes32[]" },
          ],
        },
      ],
    },
    {
      type: "function" as const,
      name: "getRoundNumber",
      stateMutability: "view" as const,
      inputs: [
        { name: "txId", type: "bytes32" },
      ],
      outputs: [
        { name: "", type: "uint256" },
      ],
    },
  ],
};
const APPEALS_CONTRACT = {
  address: "0xdc953c3bCf8837987853ca05a78D52fFC3E18651" as Address,
  abi: [
    {
      type: "function" as const,
      name: "canAppeal",
      stateMutability: "view" as const,
      inputs: [
        { name: "_txId", type: "bytes32" },
        { name: "_expectedDecisionId", type: "uint256" },
      ],
      outputs: [
        { name: "", type: "bool" },
      ],
    },
  ],
};
const EXPLORER_URL = "https://scan.testnet-chain.genlayer.com";
const CONSENSUS_MAIN_CONTRACT = {
  address: "0x2E2766cbc3E5e61Ce93bBcdCBb3eAcB82082A019" as Address,
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
    "inputs": [
      {
        "internalType": "uint256",
        "name": "attemptedConsumption",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "budget",
        "type": "uint256"
      }
    ],
    "name": "ExecutionBudgetExceeded",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InsufficientFees",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidDeploymentWithSalt",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidInitialization",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRegistry",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidRevealLeaderData",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "LegacyProposeReceiptRetired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MessageEnvelopeRequired",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "MessageFeesTotalMustBeNonZero",
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
    "name": "ProtocolNotSealed",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RegistryBindingLocked",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RollupBudgetBelowFloor",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "Unauthorized",
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
        "name": "appealer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "AppealBondReturned",
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
        "indexed": true,
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "appealer",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "bondReturned",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "profitUnpaid",
        "type": "uint256"
      }
    ],
    "name": "AppealerProfitPayoutFailed",
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
        "internalType": "uint8",
        "name": "commandKind",
        "type": "uint8"
      },
      {
        "indexed": false,
        "internalType": "bytes4",
        "name": "errorSelector",
        "type": "bytes4"
      },
      {
        "indexed": false,
        "internalType": "bytes32",
        "name": "failureFingerprint",
        "type": "bytes32"
      }
    ],
    "name": "BatchCommandFailed",
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
        "name": "finalized",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "progressed",
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
        "indexed": false,
        "internalType": "uint256",
        "name": "attempted",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "resolved",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "failed",
        "type": "uint256"
      }
    ],
    "name": "BatchResolutionCompleted",
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
        "indexed": true,
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "sender",
        "type": "address"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "FeesRefunded",
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
        "internalType": "uint256",
        "name": "decisionId",
        "type": "uint256"
      },
      {
        "indexed": true,
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "FinalizationEffectsDeferred",
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
        "name": "firstAnnouncedAt",
        "type": "uint256"
      }
    ],
    "name": "NewTransactionAlreadyAnnounced",
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
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "receiptFee",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "gasPrice",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "estimatedGas",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "uint256",
        "name": "receiptBytes",
        "type": "uint256"
      }
    ],
    "name": "ReceiptFeeEstimated",
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
        "indexed": false,
        "internalType": "uint256",
        "name": "chunkIndex",
        "type": "uint256"
      },
      {
        "indexed": false,
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      },
      {
        "indexed": false,
        "internalType": "uint256[]",
        "name": "amounts",
        "type": "uint256[]"
      }
    ],
    "name": "UnifiedFeesDistributed",
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
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "UserValueRefunded",
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
        "internalType": "bytes",
        "name": "_vrfProof",
        "type": "bytes"
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
        "type": "bytes32"
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
        "internalType": "bytes32",
        "name": "_txId",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
        "type": "bytes32"
      }
    ],
    "name": "activatorIdleness",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
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
            "name": "numOfInitialValidators",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxRotations",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "validUntil",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "saltNonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userValue",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "leaderTimeunitsAllocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "validatorTimeunitsAllocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "appealRounds",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "executionBudgetPerRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "executionConsumed",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "totalMessageFees",
                "type": "uint256"
              },
              {
                "internalType": "uint256[]",
                "name": "rotations",
                "type": "uint256[]"
              },
              {
                "internalType": "uint256",
                "name": "maxPriceGenPerTimeUnit",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "storageFeeMaxGasPrice",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "receiptFeeMaxGasPrice",
                "type": "uint256"
              }
            ],
            "internalType": "struct IFeeManager.FeesDistribution",
            "name": "feesDistribution",
            "type": "tuple"
          },
          {
            "internalType": "bytes",
            "name": "txCalldata",
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
                "internalType": "bool",
                "name": "onAcceptance",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "parentIndex",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "budget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              }
            ],
            "internalType": "struct IMessages.MessageFeeAllocationNode[]",
            "name": "messageAllocations",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.AddTransactionParams",
        "name": "_params",
        "type": "tuple"
      }
    ],
    "name": "addTransaction",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      }
    ],
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
        "internalType": "bytes32",
        "name": "_commitHash",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_validatorIndex",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
        "type": "bytes32"
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
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "expectedDecisionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "expectedGeneration",
        "type": "uint256"
      }
    ],
    "name": "continueAcceptanceMessages",
    "outputs": [
      {
        "internalType": "bool",
        "name": "complete",
        "type": "bool"
      }
    ],
    "stateMutability": "nonpayable",
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
    "name": "continueRecomputation",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
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
            "name": "numOfInitialValidators",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "maxRotations",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "validUntil",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "saltNonce",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "userValue",
            "type": "uint256"
          },
          {
            "components": [
              {
                "internalType": "uint256",
                "name": "leaderTimeunitsAllocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "validatorTimeunitsAllocation",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "appealRounds",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "executionBudgetPerRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "executionConsumed",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "totalMessageFees",
                "type": "uint256"
              },
              {
                "internalType": "uint256[]",
                "name": "rotations",
                "type": "uint256[]"
              },
              {
                "internalType": "uint256",
                "name": "maxPriceGenPerTimeUnit",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "storageFeeMaxGasPrice",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "receiptFeeMaxGasPrice",
                "type": "uint256"
              }
            ],
            "internalType": "struct IFeeManager.FeesDistribution",
            "name": "feesDistribution",
            "type": "tuple"
          },
          {
            "internalType": "bytes",
            "name": "txCalldata",
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
                "internalType": "bool",
                "name": "onAcceptance",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "parentIndex",
                "type": "uint256"
              },
              {
                "internalType": "address",
                "name": "recipient",
                "type": "address"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "budget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              }
            ],
            "internalType": "struct IMessages.MessageFeeAllocationNode[]",
            "name": "messageAllocations",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.AddTransactionParams",
        "name": "_params",
        "type": "tuple"
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
        "internalType": "bytes32",
        "name": "_txId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_expectedDecisionId",
        "type": "uint256"
      }
    ],
    "name": "estimateAppealCharge",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "bond",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "funding",
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
      },
      {
        "internalType": "uint256",
        "name": "_gasLimit",
        "type": "uint256"
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
        "components": [
          {
            "internalType": "bytes32",
            "name": "txId",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "expectedDecisionId",
            "type": "uint256"
          }
        ],
        "internalType": "struct IFinalizationPhase.FinalizeTransactionParams",
        "name": "command",
        "type": "tuple"
      }
    ],
    "name": "finalizeDecisionBatchItem",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "outcome",
        "type": "uint8"
      }
    ],
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
            "name": "expectedDecisionId",
            "type": "uint256"
          }
        ],
        "internalType": "struct IFinalizationPhase.FinalizeTransactionParams[]",
        "name": "_commands",
        "type": "tuple[]"
      }
    ],
    "name": "finalizeDecisions",
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
        "name": "_expectedDecisionId",
        "type": "uint256"
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
        "name": "txId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "expectedDecisionId",
        "type": "uint256"
      }
    ],
    "name": "finalizeTransactionDeferred",
    "outputs": [],
    "stateMutability": "payable",
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "_txId",
        "type": "bytes32"
      }
    ],
    "name": "flushInternalMessages",
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
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      }
    ],
    "name": "invalidatePreemptedHead",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "caller",
        "type": "address"
      }
    ],
    "name": "isAuthorizedGhostCaller",
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
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
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
            "internalType": "bytes32",
            "name": "expectedAttemptId",
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
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "declaredBudget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "allocationSubtree",
                "type": "bytes"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "bool",
                "name": "useBalance",
                "type": "bool"
              }
            ],
            "internalType": "struct IMessages.SubmittedMessage[]",
            "name": "messages",
            "type": "tuple[]"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.LeaderRevealVoteParams",
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
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
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
        "internalType": "address[]",
        "name": "recipients",
        "type": "address[]"
      }
    ],
    "name": "promoteNextPendingTransactions",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "",
        "type": "address"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      }
    ],
    "name": "proposeReceipt",
    "outputs": [],
    "stateMutability": "pure",
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
        "internalType": "uint256",
        "name": "_storageFeeUsed",
        "type": "uint256"
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
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
        "type": "bytes32"
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
        "internalType": "bytes",
        "name": "_eqBlocksOutputs",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "_vrfProof",
        "type": "bytes"
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
        "type": "bytes32"
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
        "components": [
          {
            "internalType": "bytes32",
            "name": "txId",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "txExecutionHash",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "processingBlock",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "storageFeeUsed",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "eqBlocksOutputs",
            "type": "bytes"
          },
          {
            "internalType": "bytes",
            "name": "vrfProof",
            "type": "bytes"
          },
          {
            "internalType": "uint256",
            "name": "reportedMessageFeesTotal",
            "type": "uint256"
          },
          {
            "internalType": "bytes32",
            "name": "expectedAttemptId",
            "type": "bytes32"
          },
          {
            "internalType": "uint256",
            "name": "messageBytes",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "messageCount",
            "type": "uint256"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.MessageEnvelopeProposal",
        "name": "p",
        "type": "tuple"
      }
    ],
    "name": "proposeReceiptWithMessageEnvelope",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
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
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      },
      {
        "internalType": "bytes",
        "name": "",
        "type": "bytes"
      },
      {
        "internalType": "uint256",
        "name": "reportedTotal",
        "type": "uint256"
      },
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "name": "proposeReceiptWithMessages",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "protocolComponentId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
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
        "components": [
          {
            "internalType": "bytes32",
            "name": "txId",
            "type": "bytes32"
          },
          {
            "internalType": "bytes32",
            "name": "expectedAttemptId",
            "type": "bytes32"
          }
        ],
        "internalType": "struct IIdlenessPhase.ProcessIdlenessParams",
        "name": "command",
        "type": "tuple"
      }
    ],
    "name": "resolveTransactionBatchItem",
    "outputs": [
      {
        "internalType": "uint8",
        "name": "outcome",
        "type": "uint8"
      }
    ],
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
            "internalType": "bytes32",
            "name": "expectedAttemptId",
            "type": "bytes32"
          }
        ],
        "internalType": "struct IIdlenessPhase.ProcessIdlenessParams[]",
        "name": "_commands",
        "type": "tuple[]"
      }
    ],
    "name": "resolveTransactions",
    "outputs": [],
    "stateMutability": "nonpayable",
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
    "name": "retryFinalizationPromotion",
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
      },
      {
        "internalType": "bytes32",
        "name": "_expectedAttemptId",
        "type": "bytes32"
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
      },
      {
        "internalType": "uint256",
        "name": "_expectedDecisionId",
        "type": "uint256"
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
        "internalType": "bytes32",
        "name": "_txId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "_expectedDecisionId",
        "type": "uint256"
      }
    ],
    "name": "topUpAndProgressFinalization",
    "outputs": [
      {
        "internalType": "bool",
        "name": "finalized",
        "type": "bool"
      }
    ],
    "stateMutability": "payable",
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
        "name": "_expectedDecisionId",
        "type": "uint256"
      },
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "leaderTimeunitsAllocation",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "validatorTimeunitsAllocation",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "appealRounds",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "executionBudgetPerRound",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "executionConsumed",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalMessageFees",
            "type": "uint256"
          },
          {
            "internalType": "uint256[]",
            "name": "rotations",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "maxPriceGenPerTimeUnit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "storageFeeMaxGasPrice",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "receiptFeeMaxGasPrice",
            "type": "uint256"
          }
        ],
        "internalType": "struct IFeeManager.FeesDistribution",
        "name": "",
        "type": "tuple"
      }
    ],
    "name": "topUpAndSubmitAppeal",
    "outputs": [],
    "stateMutability": "payable",
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
        "components": [
          {
            "internalType": "uint256",
            "name": "leaderTimeunitsAllocation",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "validatorTimeunitsAllocation",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "appealRounds",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "executionBudgetPerRound",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "executionConsumed",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "totalMessageFees",
            "type": "uint256"
          },
          {
            "internalType": "uint256[]",
            "name": "rotations",
            "type": "uint256[]"
          },
          {
            "internalType": "uint256",
            "name": "maxPriceGenPerTimeUnit",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "storageFeeMaxGasPrice",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "receiptFeeMaxGasPrice",
            "type": "uint256"
          }
        ],
        "internalType": "struct IFeeManager.FeesDistribution",
        "name": "_feesDistribution",
        "type": "tuple"
      }
    ],
    "name": "topUpFees",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "internalType": "address",
        "name": "to",
        "type": "address"
      },
      {
        "internalType": "uint256",
        "name": "amount",
        "type": "uint256"
      }
    ],
    "name": "transferEthOnBehalf",
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
  address: "0xc5FA6f82BEe53598825d6edf7E3e24613082c75B" as Address,
  abi: [
  {
    "inputs": [],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
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
    "name": "InvalidRegistry",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "InvalidTransactionStatus",
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      },
      {
        "internalType": "uint8",
        "name": "status",
        "type": "uint8"
      }
    ],
    "name": "PhaseDeadlineNotInitialized",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "RegistryBindingLocked",
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
      },
      {
        "internalType": "uint256",
        "name": "_expectedDecisionId",
        "type": "uint256"
      }
    ],
    "name": "canFinalize",
    "outputs": [
      {
        "internalType": "bool",
        "name": "ready",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "evaluatedAt",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "appealDeadline",
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
        "name": "_txId",
        "type": "bytes32"
      }
    ],
    "name": "estimateAppealBond",
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
        "name": "_txId",
        "type": "bytes32"
      }
    ],
    "name": "estimateLatestAppealCharge",
    "outputs": [
      {
        "internalType": "uint256",
        "name": "decisionId",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "bond",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "funding",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "appealDeadline",
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
        "name": "_txId",
        "type": "bytes32"
      }
    ],
    "name": "getCurrentActivator",
    "outputs": [
      {
        "internalType": "address",
        "name": "newActivator",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "activatorIsIdle",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "slots",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "secondsUntilNextBoundary",
        "type": "uint256"
      },
      {
        "internalType": "enum ITransactions.TransactionStatus",
        "name": "currentStatus",
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
    "name": "getCurrentLeader",
    "outputs": [
      {
        "internalType": "address",
        "name": "newLeader",
        "type": "address"
      },
      {
        "internalType": "bool",
        "name": "leaderIsIdle",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "slots",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "secondsUntilNextBoundary",
        "type": "uint256"
      },
      {
        "internalType": "enum ITransactions.TransactionStatus",
        "name": "currentStatus",
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
    "name": "getCurrentValidators",
    "outputs": [
      {
        "internalType": "address[]",
        "name": "validators",
        "type": "address[]"
      },
      {
        "internalType": "uint256",
        "name": "leaderIndex",
        "type": "uint256"
      },
      {
        "internalType": "uint256[]",
        "name": "idleIndexes",
        "type": "uint256[]"
      },
      {
        "internalType": "bool",
        "name": "leaderIsIdle",
        "type": "bool"
      },
      {
        "internalType": "uint256",
        "name": "slots",
        "type": "uint256"
      },
      {
        "internalType": "uint256",
        "name": "secondsUntilNextBoundary",
        "type": "uint256"
      },
      {
        "internalType": "enum ITransactions.TransactionStatus",
        "name": "currentStatus",
        "type": "uint8"
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
            "name": "observedAt",
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
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "declaredBudget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "allocationSubtree",
                "type": "bytes"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "bool",
                "name": "useBalance",
                "type": "bool"
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
            "name": "observedAt",
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
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "declaredBudget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "allocationSubtree",
                "type": "bytes"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "bool",
                "name": "useBalance",
                "type": "bool"
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
            "name": "observedAt",
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
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "declaredBudget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "allocationSubtree",
                "type": "bytes"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "bool",
                "name": "useBalance",
                "type": "bool"
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
            "name": "observedAt",
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
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "declaredBudget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "allocationSubtree",
                "type": "bytes"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "bool",
                "name": "useBalance",
                "type": "bool"
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
    "name": "getStoredTransactionData",
    "outputs": [
      {
        "components": [
          {
            "internalType": "uint256",
            "name": "observedAt",
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
              },
              {
                "internalType": "bytes",
                "name": "feeParams",
                "type": "bytes"
              },
              {
                "internalType": "uint256",
                "name": "declaredBudget",
                "type": "uint256"
              },
              {
                "internalType": "bytes",
                "name": "allocationSubtree",
                "type": "bytes"
              },
              {
                "internalType": "bytes32",
                "name": "callKey",
                "type": "bytes32"
              },
              {
                "internalType": "bool",
                "name": "useBalance",
                "type": "bool"
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
      }
    ],
    "name": "getStoredTransactionStatus",
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
          },
          {
            "internalType": "uint256",
            "name": "lockedStorageUnitPrice",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "storageFeeUsed",
            "type": "uint256"
          },
          {
            "internalType": "uint256",
            "name": "lockedReceiptGasPrice",
            "type": "uint256"
          },
          {
            "internalType": "address",
            "name": "txSigner",
            "type": "address"
          },
          {
            "internalType": "enum ITransactions.QueueContext",
            "name": "queueContext",
            "type": "uint8"
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
    "name": "getTransactionLifecycle",
    "outputs": [
      {
        "components": [
          {
            "internalType": "enum ITransactions.TransactionStatus",
            "name": "storedStatus",
            "type": "uint8"
          },
          {
            "components": [
              {
                "internalType": "bytes32",
                "name": "txId",
                "type": "bytes32"
              },
              {
                "internalType": "enum ITransactions.TransactionStatus",
                "name": "storedStatus",
                "type": "uint8"
              },
              {
                "internalType": "enum ITransactions.TransactionStatus",
                "name": "projectedStatus",
                "type": "uint8"
              },
              {
                "internalType": "enum IIdlenessPhase.ResolutionAction",
                "name": "action",
                "type": "uint8"
              },
              {
                "internalType": "enum ITransactions.ResultType",
                "name": "result",
                "type": "uint8"
              },
              {
                "internalType": "bytes32",
                "name": "resultHash",
                "type": "bytes32"
              },
              {
                "internalType": "enum ITransactionManager.ResolutionSource",
                "name": "source",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "sourceRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "sourceGeneration",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "sourceRoundContextHash",
                "type": "bytes32"
              },
              {
                "internalType": "bytes32",
                "name": "roundPlanHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "resultRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "resultGeneration",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "basisDecisionId",
                "type": "uint256"
              },
              {
                "internalType": "enum ITransactionManager.ResolutionContext",
                "name": "context",
                "type": "uint8"
              },
              {
                "internalType": "bytes32",
                "name": "attemptId",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "boundaryAt",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "evaluatedAt",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "snapshotBlock",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "decisionWindow",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "appealDeadline",
                "type": "uint256"
              },
              {
                "internalType": "bool",
                "name": "materializesDecision",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "actionOutcomeDeterministic",
                "type": "bool"
              },
              {
                "internalType": "bool",
                "name": "nonCurrentEvaluation",
                "type": "bool"
              }
            ],
            "internalType": "struct IIdlenessPhase.ResolutionPlan",
            "name": "resolution",
            "type": "tuple"
          },
          {
            "components": [
              {
                "internalType": "bool",
                "name": "exists",
                "type": "bool"
              },
              {
                "internalType": "uint256",
                "name": "decisionId",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "basisDecisionId",
                "type": "uint256"
              },
              {
                "internalType": "enum ITransactionManager.ResolutionContext",
                "name": "context",
                "type": "uint8"
              },
              {
                "internalType": "enum ITransactionManager.ResolutionSource",
                "name": "source",
                "type": "uint8"
              },
              {
                "internalType": "bytes32",
                "name": "sourceAttemptId",
                "type": "bytes32"
              },
              {
                "internalType": "enum ITransactions.TransactionStatus",
                "name": "sourceStatus",
                "type": "uint8"
              },
              {
                "internalType": "enum ITransactions.TransactionStatus",
                "name": "status",
                "type": "uint8"
              },
              {
                "internalType": "uint256",
                "name": "sourceRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "sourceGeneration",
                "type": "uint256"
              },
              {
                "internalType": "bytes32",
                "name": "sourceRoundContextHash",
                "type": "bytes32"
              },
              {
                "internalType": "bytes32",
                "name": "roundPlanHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "resultRound",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "resultGeneration",
                "type": "uint256"
              },
              {
                "internalType": "enum ITransactions.ResultType",
                "name": "result",
                "type": "uint8"
              },
              {
                "internalType": "bytes32",
                "name": "resultHash",
                "type": "bytes32"
              },
              {
                "internalType": "uint256",
                "name": "effectiveAt",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "materializedAt",
                "type": "uint256"
              },
              {
                "internalType": "uint256",
                "name": "appealDeadline",
                "type": "uint256"
              }
            ],
            "internalType": "struct ITransactionManager.DecisionRecord",
            "name": "latestDecision",
            "type": "tuple"
          },
          {
            "internalType": "bool",
            "name": "decisionActive",
            "type": "bool"
          },
          {
            "internalType": "uint256",
            "name": "executionGeneration",
            "type": "uint256"
          }
        ],
        "internalType": "struct ConsensusData.TransactionLifecycle",
        "name": "lifecycle",
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
    "inputs": [
      {
        "internalType": "bytes32",
        "name": "txId",
        "type": "bytes32"
      },
      {
        "internalType": "uint256",
        "name": "round",
        "type": "uint256"
      },
      {
        "internalType": "address",
        "name": "validator",
        "type": "address"
      }
    ],
    "name": "isRoundValidator",
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
    "name": "protocolComponentId",
    "outputs": [
      {
        "internalType": "bytes32",
        "name": "",
        "type": "bytes32"
      }
    ],
    "stateMutability": "pure",
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

export const testnetBradbury: GenLayerChain = defineChain({
  id: 0x107d,
  isStudio: false,
  name: "Genlayer Bradbury Testnet",
  rpcUrls: {
    default: {
      http: [TESTNET_JSON_RPC_URL],
    },
  },
  nativeCurrency: {
    name: "GEN Token",
    symbol: "GEN",
    decimals: 18,
  },
  blockExplorers: {
    default: {
      name: "GenLayer Bradbury Explorer",
      url: EXPLORER_URL,
    },
  },
  testnet: true,
  consensusMainContract: CONSENSUS_MAIN_CONTRACT,
  consensusDataContract: CONSENSUS_DATA_CONTRACT,
  stakingContract: STAKING_CONTRACT,
  feeManagerContract: FEE_MANAGER_CONTRACT,
  roundsStorageContract: ROUNDS_STORAGE_CONTRACT,
  appealsContract: APPEALS_CONTRACT,
  defaultNumberOfInitialValidators: 5,
  defaultConsensusMaxRotations: 3,
});
