import {Address, defineChain} from "viem";
import {GenLayerChain} from "@/types";
import {STAKING_ABI} from "@/abi/staking";

const TESTNET_JSON_RPC_URL = "https://rpc.testnet-chain.genlayer.com";
// Validator WebSocket access is configured separately by its RPC operator.

const STAKING_CONTRACT = {
  address: "0xD8fBa96C0dBB0257028dBc0107060b958e5c7113" as Address,
  abi: STAKING_ABI,
};
const FEE_MANAGER_CONTRACT = {
  address: "0x7678587A847712f2A96082AC07883A88D0fc7245" as Address,
  abi: [
  {
    "name": "calculateMinAppealBond",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_round",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_status",
        "type": "uint8",
        "internalType": "enum ITransactions.TransactionStatus"
      }
    ],
    "outputs": [
      {
        "name": "totalFeesToPay",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  }
],
};
const ROUNDS_STORAGE_CONTRACT = {
  address: "0x4038d4F72C7aAbA5a442cC0dA946012B9E3f4B8a" as Address,
  abi: [
  {
    "name": "getLastRoundData",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "round",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "roundData",
        "type": "tuple",
        "components": [
          {
            "name": "round",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "leaderIndex",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votesCommitted",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votesRevealed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "appealBond",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rotationsLeft",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "roundValidators",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "validatorVotes",
            "type": "uint8[]",
            "internalType": "enum ITransactions.VoteType[]"
          },
          {
            "name": "validatorVotesHash",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          },
          {
            "name": "validatorResultHash",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ],
        "internalType": "struct ITransactions.RoundData"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getRoundData",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "round",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {
            "name": "round",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "leaderIndex",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votesCommitted",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votesRevealed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "appealBond",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rotationsLeft",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "roundValidators",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "validatorVotes",
            "type": "uint8[]",
            "internalType": "enum ITransactions.VoteType[]"
          },
          {
            "name": "validatorVotesHash",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          },
          {
            "name": "validatorResultHash",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ],
        "internalType": "struct ITransactions.RoundData"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getRoundNumber",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  }
],
};
const APPEALS_CONTRACT = {
  address: "0xdc953c3bCf8837987853ca05a78D52fFC3E18651" as Address,
  abi: [
  {
    "name": "canAppeal",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  }
],
};
const EXPLORER_URL = "https://scan.testnet-chain.genlayer.com";
const CONSENSUS_MAIN_CONTRACT = {
  address: "0x2E2766cbc3E5e61Ce93bBcdCBb3eAcB82082A019" as Address,
  abi: [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "CallerNotMessages",
    "type": "error",
    "inputs": []
  },
  {
    "name": "CanNotAppeal",
    "type": "error",
    "inputs": []
  },
  {
    "name": "ExecutionBudgetExceeded",
    "type": "error",
    "inputs": [
      {
        "name": "attemptedConsumption",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "budget",
        "type": "uint256",
        "internalType": "uint256"
      }
    ]
  },
  {
    "name": "InsufficientFees",
    "type": "error",
    "inputs": []
  },
  {
    "name": "InvalidDeploymentWithSalt",
    "type": "error",
    "inputs": []
  },
  {
    "name": "InvalidInitialization",
    "type": "error",
    "inputs": []
  },
  {
    "name": "InvalidRegistry",
    "type": "error",
    "inputs": []
  },
  {
    "name": "InvalidRevealLeaderData",
    "type": "error",
    "inputs": []
  },
  {
    "name": "LegacyProposeReceiptRetired",
    "type": "error",
    "inputs": []
  },
  {
    "name": "MessageEnvelopeRequired",
    "type": "error",
    "inputs": []
  },
  {
    "name": "MessageFeesTotalMustBeNonZero",
    "type": "error",
    "inputs": []
  },
  {
    "name": "NotInitializing",
    "type": "error",
    "inputs": []
  },
  {
    "name": "OwnableInvalidOwner",
    "type": "error",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "name": "OwnableUnauthorizedAccount",
    "type": "error",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "name": "ProtocolNotSealed",
    "type": "error",
    "inputs": []
  },
  {
    "name": "ReentrancyGuardReentrantCall",
    "type": "error",
    "inputs": []
  },
  {
    "name": "RegistryBindingLocked",
    "type": "error",
    "inputs": []
  },
  {
    "name": "RollupBudgetBelowFloor",
    "type": "error",
    "inputs": []
  },
  {
    "name": "Unauthorized",
    "type": "error",
    "inputs": []
  },
  {
    "name": "ActivatorReplaced",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "oldActivator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newActivator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "AddressManagerSet",
    "type": "event",
    "inputs": [
      {
        "name": "addressManager",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "AllVotesCommitted",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newStatus",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ITransactions.TransactionStatus"
      }
    ],
    "anonymous": false
  },
  {
    "name": "AppealBondReturned",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "appealer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "AppealStarted",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "appellant",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "bond",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "validators",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "name": "AppealerProfitPayoutFailed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "appealer",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "bondReturned",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "profitUnpaid",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "BatchCommandFailed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "commandKind",
        "type": "uint8",
        "indexed": true,
        "internalType": "uint8"
      },
      {
        "name": "errorSelector",
        "type": "bytes4",
        "indexed": false,
        "internalType": "bytes4"
      },
      {
        "name": "failureFingerprint",
        "type": "bytes32",
        "indexed": false,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "BatchFinalizationCompleted",
    "type": "event",
    "inputs": [
      {
        "name": "attempted",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "finalized",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "progressed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "failed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "BatchResolutionCompleted",
    "type": "event",
    "inputs": [
      {
        "name": "attempted",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "resolved",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "failed",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "CreatedTransaction",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "txSlot",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "FeesRefunded",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "FinalizationEffectsDeferred",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "decisionId",
        "type": "uint256",
        "indexed": true,
        "internalType": "uint256"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "Initialized",
    "type": "event",
    "inputs": [
      {
        "name": "version",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "name": "InternalMessageProcessed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "activator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "LeaderIdlenessProcessed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "oldLeader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newLeader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "NewTransaction",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "activator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "NewTransactionAlreadyAnnounced",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "firstAnnouncedAt",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "OwnershipTransferStarted",
    "type": "event",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "OwnershipTransferred",
    "type": "event",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "ProcessIdlenessAccepted",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "ReceiptFeeEstimated",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "receiptFee",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "gasPrice",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "estimatedGas",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "receiptBytes",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionAccepted",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionActivated",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "leader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionCancelled",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "cancelledBy",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionFinalized",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionLeaderRevealed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionLeaderRotated",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newLeader",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionLeaderTimeout",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionNeedsRecomputation",
    "type": "event",
    "inputs": [
      {
        "name": "txIds",
        "type": "bytes32[]",
        "indexed": false,
        "internalType": "bytes32[]"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionReceiptProposed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "validators",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TransactionUndetermined",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TribunalAppealVoteCommitted",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "tribunalIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "validator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "TribunalAppealVoteRevealed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "tribunalIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "validator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "voteType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ITransactions.VoteType"
      }
    ],
    "anonymous": false
  },
  {
    "name": "UnifiedFeesDistributed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "chunkIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      },
      {
        "name": "recipients",
        "type": "address[]",
        "indexed": false,
        "internalType": "address[]"
      },
      {
        "name": "amounts",
        "type": "uint256[]",
        "indexed": false,
        "internalType": "uint256[]"
      }
    ],
    "anonymous": false
  },
  {
    "name": "UserValueRefunded",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "ValidatorReplaced",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "oldValidator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newValidator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "validatorIndex",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "ValueWithdrawalFailed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "recipient",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "value",
        "type": "uint256",
        "indexed": false,
        "internalType": "uint256"
      }
    ],
    "anonymous": false
  },
  {
    "name": "VoteCommitted",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "validator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "isLastVote",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      }
    ],
    "anonymous": false
  },
  {
    "name": "VoteRevealed",
    "type": "event",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "validator",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "voteType",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ITransactions.VoteType"
      },
      {
        "name": "isLastVote",
        "type": "bool",
        "indexed": false,
        "internalType": "bool"
      },
      {
        "name": "result",
        "type": "uint8",
        "indexed": false,
        "internalType": "enum ITransactions.ResultType"
      }
    ],
    "anonymous": false
  },
  {
    "name": "EVENTS_BATCH_SIZE",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "VERSION",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "string",
        "internalType": "string"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "acceptOwnership",
    "type": "function",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "activateTransaction",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_vrfProof",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "activatorIdleness",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "addTransaction",
    "type": "function",
    "inputs": [
      {
        "name": "_params",
        "type": "tuple",
        "components": [
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "numOfInitialValidators",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "validUntil",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "saltNonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "userValue",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "feesDistribution",
            "type": "tuple",
            "components": [
              {
                "name": "leaderTimeunitsAllocation",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "validatorTimeunitsAllocation",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealRounds",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "executionBudgetPerRound",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "executionConsumed",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "totalMessageFees",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "rotations",
                "type": "uint256[]",
                "internalType": "uint256[]"
              },
              {
                "name": "maxPriceGenPerTimeUnit",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "storageFeeMaxGasPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "receiptFeeMaxGasPrice",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct IFeeManager.FeesDistribution"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "messageAllocations",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "parentIndex",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "budget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              }
            ],
            "internalType": "struct IMessages.MessageFeeAllocationNode[]"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.AddTransactionParams"
      }
    ],
    "outputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "name": "addressManager",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IAddressManager"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "cancelTransaction",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "commitVote",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_commitHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_validatorIndex",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "continueAcceptanceMessages",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "expectedGeneration",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "complete",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "name": "continueRecomputation",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "deploySalted",
    "type": "function",
    "inputs": [
      {
        "name": "_params",
        "type": "tuple",
        "components": [
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "numOfInitialValidators",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "maxRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "validUntil",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "saltNonce",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "userValue",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "feesDistribution",
            "type": "tuple",
            "components": [
              {
                "name": "leaderTimeunitsAllocation",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "validatorTimeunitsAllocation",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealRounds",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "executionBudgetPerRound",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "executionConsumed",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "totalMessageFees",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "rotations",
                "type": "uint256[]",
                "internalType": "uint256[]"
              },
              {
                "name": "maxPriceGenPerTimeUnit",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "storageFeeMaxGasPrice",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "receiptFeeMaxGasPrice",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct IFeeManager.FeesDistribution"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "messageAllocations",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "parentIndex",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "budget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              }
            ],
            "internalType": "struct IMessages.MessageFeeAllocationNode[]"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.AddTransactionParams"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "estimateAppealCharge",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "bond",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "funding",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "executeMessage",
    "type": "function",
    "inputs": [
      {
        "name": "_recipient",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "_value",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_data",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "_gasLimit",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "name": "finalizeDecisionBatchItem",
    "type": "function",
    "inputs": [
      {
        "name": "command",
        "type": "tuple",
        "components": [
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "expectedDecisionId",
            "type": "uint256",
            "internalType": "uint256"
          }
        ],
        "internalType": "struct IFinalizationPhase.FinalizeTransactionParams"
      }
    ],
    "outputs": [
      {
        "name": "outcome",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "name": "finalizeDecisions",
    "type": "function",
    "inputs": [
      {
        "name": "_commands",
        "type": "tuple[]",
        "components": [
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "expectedDecisionId",
            "type": "uint256",
            "internalType": "uint256"
          }
        ],
        "internalType": "struct IFinalizationPhase.FinalizeTransactionParams[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "finalizeTransaction",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "finalizeTransactionDeferred",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "flushExternalMessages",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "flushInternalMessages",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "getAddressManager",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IAddressManager"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getPendingTransactionValue",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "initialize",
    "type": "function",
    "inputs": [
      {
        "name": "_addressManager",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "invalidatePreemptedHead",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "isAuthorizedGhostCaller",
    "type": "function",
    "inputs": [
      {
        "name": "caller",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "isGhostContract",
    "type": "function",
    "inputs": [
      {
        "name": "addr",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "leaderIdleness",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "leaderRevealVote",
    "type": "function",
    "inputs": [
      {
        "name": "leaderRevealVoteParams",
        "type": "tuple",
        "components": [
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "expectedAttemptId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "saltAsAValidator",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "messagesAndOtherFieldsHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "otherExecutionFieldsHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "resultValue",
            "type": "uint8",
            "internalType": "enum ITransactions.VoteType"
          },
          {
            "name": "messages",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "value",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "saltNonce",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "declaredBudget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "allocationSubtree",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "useBalance",
                "type": "bool",
                "internalType": "bool"
              }
            ],
            "internalType": "struct IMessages.SubmittedMessage[]"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.LeaderRevealVoteParams"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "owner",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "pendingOwner",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "processIdleness",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "promoteNextPendingTransactions",
    "type": "function",
    "inputs": [
      {
        "name": "recipients",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "proposeReceipt",
    "type": "function",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      }
    ],
    "outputs": [],
    "stateMutability": "pure"
  },
  {
    "name": "proposeReceipt",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_txExecutionHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_processingBlock",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_storageFeeUsed",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_eqBlocksOutputs",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "_vrfProof",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "proposeReceipt",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_txExecutionHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_processingBlock",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_eqBlocksOutputs",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "_vrfProof",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "proposeReceiptWithMessageEnvelope",
    "type": "function",
    "inputs": [
      {
        "name": "p",
        "type": "tuple",
        "components": [
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "processingBlock",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "storageFeeUsed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "eqBlocksOutputs",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "vrfProof",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "reportedMessageFeesTotal",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "expectedAttemptId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "messageBytes",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "messageCount",
            "type": "uint256",
            "internalType": "uint256"
          }
        ],
        "internalType": "struct IConsensusMainWithFees.MessageEnvelopeProposal"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "proposeReceiptWithMessages",
    "type": "function",
    "inputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "",
        "type": "bytes",
        "internalType": "bytes"
      },
      {
        "name": "reportedTotal",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "protocolComponentId",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "name": "registerGhostContract",
    "type": "function",
    "inputs": [
      {
        "name": "ghost",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "renounceOwnership",
    "type": "function",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "resolveTransactionBatchItem",
    "type": "function",
    "inputs": [
      {
        "name": "command",
        "type": "tuple",
        "components": [
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "expectedAttemptId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "internalType": "struct IIdlenessPhase.ProcessIdlenessParams"
      }
    ],
    "outputs": [
      {
        "name": "outcome",
        "type": "uint8",
        "internalType": "uint8"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "name": "resolveTransactions",
    "type": "function",
    "inputs": [
      {
        "name": "_commands",
        "type": "tuple[]",
        "components": [
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "expectedAttemptId",
            "type": "bytes32",
            "internalType": "bytes32"
          }
        ],
        "internalType": "struct IIdlenessPhase.ProcessIdlenessParams[]"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "retryFinalizationPromotion",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "revealVote",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_voteHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_voteType",
        "type": "uint8",
        "internalType": "enum ITransactions.VoteType"
      },
      {
        "name": "_otherExecutionFieldsHash",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_nonce",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_validatorIndex",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_expectedAttemptId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "setAddressManager",
    "type": "function",
    "inputs": [
      {
        "name": "_addressManager",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "submitAppeal",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "topUpAndProgressFinalization",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "finalized",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "payable"
  },
  {
    "name": "topUpAndSubmitAppeal",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "",
        "type": "tuple",
        "components": [
          {
            "name": "leaderTimeunitsAllocation",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "validatorTimeunitsAllocation",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "appealRounds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executionBudgetPerRound",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executionConsumed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalMessageFees",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rotations",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "maxPriceGenPerTimeUnit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "storageFeeMaxGasPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "receiptFeeMaxGasPrice",
            "type": "uint256",
            "internalType": "uint256"
          }
        ],
        "internalType": "struct IFeeManager.FeesDistribution"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "topUpFees",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_feesDistribution",
        "type": "tuple",
        "components": [
          {
            "name": "leaderTimeunitsAllocation",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "validatorTimeunitsAllocation",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "appealRounds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executionBudgetPerRound",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "executionConsumed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "totalMessageFees",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rotations",
            "type": "uint256[]",
            "internalType": "uint256[]"
          },
          {
            "name": "maxPriceGenPerTimeUnit",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "storageFeeMaxGasPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "receiptFeeMaxGasPrice",
            "type": "uint256",
            "internalType": "uint256"
          }
        ],
        "internalType": "struct IFeeManager.FeesDistribution"
      }
    ],
    "outputs": [],
    "stateMutability": "payable"
  },
  {
    "name": "transferEthOnBehalf",
    "type": "function",
    "inputs": [
      {
        "name": "to",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "amount",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "success",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "nonpayable"
  },
  {
    "name": "transferOwnership",
    "type": "function",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "type": "receive",
    "stateMutability": "payable"
  }
],
  bytecode: "",
};

const CONSENSUS_DATA_CONTRACT = {
  address: "0xc5FA6f82BEe53598825d6edf7E3e24613082c75B" as Address,
  abi: [
  {
    "type": "constructor",
    "inputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "AccessControlBadConfirmation",
    "type": "error",
    "inputs": []
  },
  {
    "name": "AccessControlUnauthorizedAccount",
    "type": "error",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "neededRole",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ]
  },
  {
    "name": "InvalidInitialization",
    "type": "error",
    "inputs": []
  },
  {
    "name": "InvalidRegistry",
    "type": "error",
    "inputs": []
  },
  {
    "name": "InvalidTransactionStatus",
    "type": "error",
    "inputs": []
  },
  {
    "name": "NotInitializing",
    "type": "error",
    "inputs": []
  },
  {
    "name": "OwnableInvalidOwner",
    "type": "error",
    "inputs": [
      {
        "name": "owner",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "name": "OwnableUnauthorizedAccount",
    "type": "error",
    "inputs": [
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ]
  },
  {
    "name": "PhaseDeadlineNotInitialized",
    "type": "error",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "status",
        "type": "uint8",
        "internalType": "uint8"
      }
    ]
  },
  {
    "name": "ReentrancyGuardReentrantCall",
    "type": "error",
    "inputs": []
  },
  {
    "name": "RegistryBindingLocked",
    "type": "error",
    "inputs": []
  },
  {
    "name": "Initialized",
    "type": "event",
    "inputs": [
      {
        "name": "version",
        "type": "uint64",
        "indexed": false,
        "internalType": "uint64"
      }
    ],
    "anonymous": false
  },
  {
    "name": "OwnershipTransferStarted",
    "type": "event",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "OwnershipTransferred",
    "type": "event",
    "inputs": [
      {
        "name": "previousOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "newOwner",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "RoleAdminChanged",
    "type": "event",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "previousAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "newAdminRole",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      }
    ],
    "anonymous": false
  },
  {
    "name": "RoleGranted",
    "type": "event",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "RoleRevoked",
    "type": "event",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "indexed": true,
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      },
      {
        "name": "sender",
        "type": "address",
        "indexed": true,
        "internalType": "address"
      }
    ],
    "anonymous": false
  },
  {
    "name": "DEFAULT_ADMIN_ROLE",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "acceptOwnership",
    "type": "function",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "addressManager",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "contract IAddressManager"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "canFinalize",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_currentTimestamp",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "_expectedDecisionId",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "ready",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "evaluatedAt",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "appealDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "estimateAppealBond",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "estimateLatestAppealCharge",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "decisionId",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "bond",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "funding",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "appealDeadline",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getCurrentActivator",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "newActivator",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "activatorIsIdle",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "slots",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "secondsUntilNextBoundary",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "currentStatus",
        "type": "uint8",
        "internalType": "enum ITransactions.TransactionStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getCurrentLeader",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "newLeader",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "leaderIsIdle",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "slots",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "secondsUntilNextBoundary",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "currentStatus",
        "type": "uint8",
        "internalType": "enum ITransactions.TransactionStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getCurrentValidators",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "validators",
        "type": "address[]",
        "internalType": "address[]"
      },
      {
        "name": "leaderIndex",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "idleIndexes",
        "type": "uint256[]",
        "internalType": "uint256[]"
      },
      {
        "name": "leaderIsIdle",
        "type": "bool",
        "internalType": "bool"
      },
      {
        "name": "slots",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "secondsUntilNextBoundary",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "currentStatus",
        "type": "uint8",
        "internalType": "enum ITransactions.TransactionStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getLatestAcceptedTransaction",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "inputData",
        "type": "tuple",
        "components": [
          {
            "name": "observedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "initialRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txSlot",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastVoteTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "randomSeed",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "eqBlocksOutputs",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "messages",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "value",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "saltNonce",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "declaredBudget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "allocationSubtree",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "useBalance",
                "type": "bool",
                "internalType": "bool"
              }
            ],
            "internalType": "struct IMessages.SubmittedMessage[]"
          },
          {
            "name": "queueType",
            "type": "uint8",
            "internalType": "enum IQueues.QueueType"
          },
          {
            "name": "queuePosition",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "activator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lastLeader",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ITransactions.TransactionStatus"
          },
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "readStateBlockRange",
            "type": "tuple",
            "components": [
              {
                "name": "activationBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "processingBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "proposalBlock",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct ITransactions.ReadStateBlockRange"
          },
          {
            "name": "numOfRounds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastRound",
            "type": "tuple",
            "components": [
              {
                "name": "round",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "leaderIndex",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesCommitted",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesRevealed",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealBond",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "rotationsLeft",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "result",
                "type": "uint8",
                "internalType": "enum ITransactions.ResultType"
              },
              {
                "name": "roundValidators",
                "type": "address[]",
                "internalType": "address[]"
              },
              {
                "name": "validatorVotes",
                "type": "uint8[]",
                "internalType": "enum ITransactions.VoteType[]"
              },
              {
                "name": "validatorVotesHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              },
              {
                "name": "validatorResultHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              }
            ],
            "internalType": "struct ITransactions.RoundData"
          },
          {
            "name": "consumedValidators",
            "type": "address[]",
            "internalType": "address[]"
          }
        ],
        "internalType": "struct ConsensusData.TransactionData"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getLatestAcceptedTransactions",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "startIndex",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "pageSize",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {
            "name": "observedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "initialRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txSlot",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastVoteTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "randomSeed",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "eqBlocksOutputs",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "messages",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "value",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "saltNonce",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "declaredBudget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "allocationSubtree",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "useBalance",
                "type": "bool",
                "internalType": "bool"
              }
            ],
            "internalType": "struct IMessages.SubmittedMessage[]"
          },
          {
            "name": "queueType",
            "type": "uint8",
            "internalType": "enum IQueues.QueueType"
          },
          {
            "name": "queuePosition",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "activator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lastLeader",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ITransactions.TransactionStatus"
          },
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "readStateBlockRange",
            "type": "tuple",
            "components": [
              {
                "name": "activationBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "processingBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "proposalBlock",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct ITransactions.ReadStateBlockRange"
          },
          {
            "name": "numOfRounds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastRound",
            "type": "tuple",
            "components": [
              {
                "name": "round",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "leaderIndex",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesCommitted",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesRevealed",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealBond",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "rotationsLeft",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "result",
                "type": "uint8",
                "internalType": "enum ITransactions.ResultType"
              },
              {
                "name": "roundValidators",
                "type": "address[]",
                "internalType": "address[]"
              },
              {
                "name": "validatorVotes",
                "type": "uint8[]",
                "internalType": "enum ITransactions.VoteType[]"
              },
              {
                "name": "validatorVotesHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              },
              {
                "name": "validatorResultHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              }
            ],
            "internalType": "struct ITransactions.RoundData"
          },
          {
            "name": "consumedValidators",
            "type": "address[]",
            "internalType": "address[]"
          }
        ],
        "internalType": "struct ConsensusData.TransactionData[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getLatestAcceptedTxCount",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getLatestFinalizedTransaction",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "inputData",
        "type": "tuple",
        "components": [
          {
            "name": "observedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "initialRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txSlot",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastVoteTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "randomSeed",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "eqBlocksOutputs",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "messages",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "value",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "saltNonce",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "declaredBudget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "allocationSubtree",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "useBalance",
                "type": "bool",
                "internalType": "bool"
              }
            ],
            "internalType": "struct IMessages.SubmittedMessage[]"
          },
          {
            "name": "queueType",
            "type": "uint8",
            "internalType": "enum IQueues.QueueType"
          },
          {
            "name": "queuePosition",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "activator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lastLeader",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ITransactions.TransactionStatus"
          },
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "readStateBlockRange",
            "type": "tuple",
            "components": [
              {
                "name": "activationBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "processingBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "proposalBlock",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct ITransactions.ReadStateBlockRange"
          },
          {
            "name": "numOfRounds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastRound",
            "type": "tuple",
            "components": [
              {
                "name": "round",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "leaderIndex",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesCommitted",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesRevealed",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealBond",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "rotationsLeft",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "result",
                "type": "uint8",
                "internalType": "enum ITransactions.ResultType"
              },
              {
                "name": "roundValidators",
                "type": "address[]",
                "internalType": "address[]"
              },
              {
                "name": "validatorVotes",
                "type": "uint8[]",
                "internalType": "enum ITransactions.VoteType[]"
              },
              {
                "name": "validatorVotesHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              },
              {
                "name": "validatorResultHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              }
            ],
            "internalType": "struct ITransactions.RoundData"
          },
          {
            "name": "consumedValidators",
            "type": "address[]",
            "internalType": "address[]"
          }
        ],
        "internalType": "struct ConsensusData.TransactionData"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getLatestFinalizedTransactions",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      },
      {
        "name": "startIndex",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "pageSize",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple[]",
        "components": [
          {
            "name": "observedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "initialRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txSlot",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastVoteTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "randomSeed",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "eqBlocksOutputs",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "messages",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "value",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "saltNonce",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "declaredBudget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "allocationSubtree",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "useBalance",
                "type": "bool",
                "internalType": "bool"
              }
            ],
            "internalType": "struct IMessages.SubmittedMessage[]"
          },
          {
            "name": "queueType",
            "type": "uint8",
            "internalType": "enum IQueues.QueueType"
          },
          {
            "name": "queuePosition",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "activator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lastLeader",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ITransactions.TransactionStatus"
          },
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "readStateBlockRange",
            "type": "tuple",
            "components": [
              {
                "name": "activationBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "processingBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "proposalBlock",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct ITransactions.ReadStateBlockRange"
          },
          {
            "name": "numOfRounds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastRound",
            "type": "tuple",
            "components": [
              {
                "name": "round",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "leaderIndex",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesCommitted",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesRevealed",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealBond",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "rotationsLeft",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "result",
                "type": "uint8",
                "internalType": "enum ITransactions.ResultType"
              },
              {
                "name": "roundValidators",
                "type": "address[]",
                "internalType": "address[]"
              },
              {
                "name": "validatorVotes",
                "type": "uint8[]",
                "internalType": "enum ITransactions.VoteType[]"
              },
              {
                "name": "validatorVotesHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              },
              {
                "name": "validatorResultHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              }
            ],
            "internalType": "struct ITransactions.RoundData"
          },
          {
            "name": "consumedValidators",
            "type": "address[]",
            "internalType": "address[]"
          }
        ],
        "internalType": "struct ConsensusData.TransactionData[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getLatestFinalizedTxCount",
    "type": "function",
    "inputs": [
      {
        "name": "recipient",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getRoleAdmin",
    "type": "function",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getStoredTransactionData",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "tuple",
        "components": [
          {
            "name": "observedAt",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "initialRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txSlot",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "createdTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastVoteTimestamp",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "randomSeed",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "eqBlocksOutputs",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "messages",
            "type": "tuple[]",
            "components": [
              {
                "name": "messageType",
                "type": "uint8",
                "internalType": "enum IMessages.MessageType"
              },
              {
                "name": "recipient",
                "type": "address",
                "internalType": "address"
              },
              {
                "name": "value",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "data",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "onAcceptance",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "saltNonce",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "feeParams",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "declaredBudget",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "allocationSubtree",
                "type": "bytes",
                "internalType": "bytes"
              },
              {
                "name": "callKey",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "useBalance",
                "type": "bool",
                "internalType": "bool"
              }
            ],
            "internalType": "struct IMessages.SubmittedMessage[]"
          },
          {
            "name": "queueType",
            "type": "uint8",
            "internalType": "enum IQueues.QueueType"
          },
          {
            "name": "queuePosition",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "activator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "lastLeader",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ITransactions.TransactionStatus"
          },
          {
            "name": "txId",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "readStateBlockRange",
            "type": "tuple",
            "components": [
              {
                "name": "activationBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "processingBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "proposalBlock",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct ITransactions.ReadStateBlockRange"
          },
          {
            "name": "numOfRounds",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lastRound",
            "type": "tuple",
            "components": [
              {
                "name": "round",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "leaderIndex",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesCommitted",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "votesRevealed",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealBond",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "rotationsLeft",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "result",
                "type": "uint8",
                "internalType": "enum ITransactions.ResultType"
              },
              {
                "name": "roundValidators",
                "type": "address[]",
                "internalType": "address[]"
              },
              {
                "name": "validatorVotes",
                "type": "uint8[]",
                "internalType": "enum ITransactions.VoteType[]"
              },
              {
                "name": "validatorVotesHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              },
              {
                "name": "validatorResultHash",
                "type": "bytes32[]",
                "internalType": "bytes32[]"
              }
            ],
            "internalType": "struct ITransactions.RoundData"
          },
          {
            "name": "consumedValidators",
            "type": "address[]",
            "internalType": "address[]"
          }
        ],
        "internalType": "struct ConsensusData.TransactionData"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getStoredTransactionStatus",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "uint8",
        "internalType": "enum ITransactions.TransactionStatus"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getTransactionAllData",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "transaction",
        "type": "tuple",
        "components": [
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "txExecutionResult",
            "type": "uint8",
            "internalType": "enum ITransactions.VoteType"
          },
          {
            "name": "status",
            "type": "uint8",
            "internalType": "enum ITransactions.TransactionStatus"
          },
          {
            "name": "txOrigin",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "sender",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "recipient",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "activator",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "txSlot",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "initialRotations",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "numOfInitialValidators",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "epoch",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "id",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "randomSeed",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txExecutionHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "resultHash",
            "type": "bytes32",
            "internalType": "bytes32"
          },
          {
            "name": "txCalldata",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "eqBlocksOutputs",
            "type": "bytes",
            "internalType": "bytes"
          },
          {
            "name": "readStateBlockRanges",
            "type": "tuple[]",
            "components": [
              {
                "name": "activationBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "processingBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "proposalBlock",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct ITransactions.ReadStateBlockRange[]"
          },
          {
            "name": "validUntil",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "value",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lockedStorageUnitPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "storageFeeUsed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "lockedReceiptGasPrice",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "txSigner",
            "type": "address",
            "internalType": "address"
          },
          {
            "name": "queueContext",
            "type": "uint8",
            "internalType": "enum ITransactions.QueueContext"
          }
        ],
        "internalType": "struct ITransactions.Transaction"
      },
      {
        "name": "roundsData",
        "type": "tuple[]",
        "components": [
          {
            "name": "round",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "leaderIndex",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votesCommitted",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "votesRevealed",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "appealBond",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "rotationsLeft",
            "type": "uint256",
            "internalType": "uint256"
          },
          {
            "name": "result",
            "type": "uint8",
            "internalType": "enum ITransactions.ResultType"
          },
          {
            "name": "roundValidators",
            "type": "address[]",
            "internalType": "address[]"
          },
          {
            "name": "validatorVotes",
            "type": "uint8[]",
            "internalType": "enum ITransactions.VoteType[]"
          },
          {
            "name": "validatorVotesHash",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          },
          {
            "name": "validatorResultHash",
            "type": "bytes32[]",
            "internalType": "bytes32[]"
          }
        ],
        "internalType": "struct ITransactions.RoundData[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getTransactionLifecycle",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "_timestamp",
        "type": "uint256",
        "internalType": "uint256"
      }
    ],
    "outputs": [
      {
        "name": "lifecycle",
        "type": "tuple",
        "components": [
          {
            "name": "storedStatus",
            "type": "uint8",
            "internalType": "enum ITransactions.TransactionStatus"
          },
          {
            "name": "resolution",
            "type": "tuple",
            "components": [
              {
                "name": "txId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "storedStatus",
                "type": "uint8",
                "internalType": "enum ITransactions.TransactionStatus"
              },
              {
                "name": "projectedStatus",
                "type": "uint8",
                "internalType": "enum ITransactions.TransactionStatus"
              },
              {
                "name": "action",
                "type": "uint8",
                "internalType": "enum IIdlenessPhase.ResolutionAction"
              },
              {
                "name": "result",
                "type": "uint8",
                "internalType": "enum ITransactions.ResultType"
              },
              {
                "name": "resultHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "source",
                "type": "uint8",
                "internalType": "enum ITransactionManager.ResolutionSource"
              },
              {
                "name": "sourceRound",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "sourceGeneration",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "sourceRoundContextHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundPlanHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "resultRound",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "resultGeneration",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "basisDecisionId",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "context",
                "type": "uint8",
                "internalType": "enum ITransactionManager.ResolutionContext"
              },
              {
                "name": "attemptId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "boundaryAt",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "evaluatedAt",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "snapshotBlock",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "decisionWindow",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealDeadline",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "materializesDecision",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "actionOutcomeDeterministic",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "nonCurrentEvaluation",
                "type": "bool",
                "internalType": "bool"
              }
            ],
            "internalType": "struct IIdlenessPhase.ResolutionPlan"
          },
          {
            "name": "latestDecision",
            "type": "tuple",
            "components": [
              {
                "name": "exists",
                "type": "bool",
                "internalType": "bool"
              },
              {
                "name": "decisionId",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "basisDecisionId",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "context",
                "type": "uint8",
                "internalType": "enum ITransactionManager.ResolutionContext"
              },
              {
                "name": "source",
                "type": "uint8",
                "internalType": "enum ITransactionManager.ResolutionSource"
              },
              {
                "name": "sourceAttemptId",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "sourceStatus",
                "type": "uint8",
                "internalType": "enum ITransactions.TransactionStatus"
              },
              {
                "name": "status",
                "type": "uint8",
                "internalType": "enum ITransactions.TransactionStatus"
              },
              {
                "name": "sourceRound",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "sourceGeneration",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "sourceRoundContextHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "roundPlanHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "resultRound",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "resultGeneration",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "result",
                "type": "uint8",
                "internalType": "enum ITransactions.ResultType"
              },
              {
                "name": "resultHash",
                "type": "bytes32",
                "internalType": "bytes32"
              },
              {
                "name": "effectiveAt",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "materializedAt",
                "type": "uint256",
                "internalType": "uint256"
              },
              {
                "name": "appealDeadline",
                "type": "uint256",
                "internalType": "uint256"
              }
            ],
            "internalType": "struct ITransactionManager.DecisionRecord"
          },
          {
            "name": "decisionActive",
            "type": "bool",
            "internalType": "bool"
          },
          {
            "name": "executionGeneration",
            "type": "uint256",
            "internalType": "uint256"
          }
        ],
        "internalType": "struct ConsensusData.TransactionLifecycle"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "getValidatorsForLastRound",
    "type": "function",
    "inputs": [
      {
        "name": "_txId",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "outputs": [
      {
        "name": "validators",
        "type": "address[]",
        "internalType": "address[]"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "grantRole",
    "type": "function",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "hasRole",
    "type": "function",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "initialize",
    "type": "function",
    "inputs": [
      {
        "name": "_addressManager",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "isRoundValidator",
    "type": "function",
    "inputs": [
      {
        "name": "txId",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "round",
        "type": "uint256",
        "internalType": "uint256"
      },
      {
        "name": "validator",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "owner",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "pendingOwner",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "address",
        "internalType": "address"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "protocolComponentId",
    "type": "function",
    "inputs": [],
    "outputs": [
      {
        "name": "",
        "type": "bytes32",
        "internalType": "bytes32"
      }
    ],
    "stateMutability": "pure"
  },
  {
    "name": "renounceOwnership",
    "type": "function",
    "inputs": [],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "renounceRole",
    "type": "function",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "callerConfirmation",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "revokeRole",
    "type": "function",
    "inputs": [
      {
        "name": "role",
        "type": "bytes32",
        "internalType": "bytes32"
      },
      {
        "name": "account",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "setAddressManager",
    "type": "function",
    "inputs": [
      {
        "name": "_addressManager",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  },
  {
    "name": "supportsInterface",
    "type": "function",
    "inputs": [
      {
        "name": "interfaceId",
        "type": "bytes4",
        "internalType": "bytes4"
      }
    ],
    "outputs": [
      {
        "name": "",
        "type": "bool",
        "internalType": "bool"
      }
    ],
    "stateMutability": "view"
  },
  {
    "name": "transferOwnership",
    "type": "function",
    "inputs": [
      {
        "name": "newOwner",
        "type": "address",
        "internalType": "address"
      }
    ],
    "outputs": [],
    "stateMutability": "nonpayable"
  }
],
  bytecode: "",
};

export const testnetBradbury: GenLayerChain = defineChain({
  id: 0x107d,
  isStudio: false,
  genesisHash: "0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4",
  addressManager: "0x3F71AE080BD6270A91dBcc7960d88797828538E0",
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
