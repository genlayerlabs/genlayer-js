import {Address, defineChain} from "viem";
import {GenLayerChain} from "@/types";

// chains/localnet.ts
const SIMULATOR_JSON_RPC_URL = "https://studio.genlayer.com/api";
const EXPLORER_URL = "https://genlayer-explorer.vercel.app";
const CONSENSUS_MAIN_CONTRACT = {
  address: "0xb7278A61aa25c888815aFC32Ad3cC52fF24fE575" as Address,
  abi: [
    {
      inputs: [],
      name: "AccessControlBadConfirmation",
      type: "error",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "neededRole",
          type: "bytes32",
        },
      ],
      name: "AccessControlUnauthorizedAccount",
      type: "error",
    },
    {
      inputs: [],
      name: "CallerNotMessages",
      type: "error",
    },
    {
      inputs: [],
      name: "CanNotAppeal",
      type: "error",
    },
    {
      inputs: [],
      name: "EmptyTransaction",
      type: "error",
    },
    {
      inputs: [],
      name: "FinalizationNotAllowed",
      type: "error",
    },
    {
      inputs: [],
      name: "InvalidAddress",
      type: "error",
    },
    {
      inputs: [],
      name: "InvalidGhostContract",
      type: "error",
    },
    {
      inputs: [],
      name: "InvalidInitialization",
      type: "error",
    },
    {
      inputs: [],
      name: "InvalidVote",
      type: "error",
    },
    {
      inputs: [],
      name: "MaxNumOfIterationsInPendingQueueReached",
      type: "error",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "numOfMessages",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "maxAllocatedMessages",
          type: "uint256",
        },
      ],
      name: "MaxNumOfMessagesExceeded",
      type: "error",
    },
    {
      inputs: [],
      name: "NonGenVMContract",
      type: "error",
    },
    {
      inputs: [],
      name: "NotInitializing",
      type: "error",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
      ],
      name: "OwnableInvalidOwner",
      type: "error",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "OwnableUnauthorizedAccount",
      type: "error",
    },
    {
      inputs: [],
      name: "ReentrancyGuardReentrantCall",
      type: "error",
    },
    {
      inputs: [],
      name: "TransactionNotAtPendingQueueHead",
      type: "error",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "appealer",
          type: "address",
        },
        {
          indexed: false,
          internalType: "uint256",
          name: "appealBond",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "address[]",
          name: "appealValidators",
          type: "address[]",
        },
      ],
      name: "AppealStarted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bytes",
          name: "data",
          type: "bytes",
        },
      ],
      name: "ErrorMessage",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "address",
          name: "ghostFactory",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "genManager",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "genTransactions",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "genQueue",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "genStaking",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "genMessages",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "idleness",
          type: "address",
        },
        {
          indexed: false,
          internalType: "address",
          name: "tribunalAppeal",
          type: "address",
        },
      ],
      name: "ExternalContractsSet",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint64",
          name: "version",
          type: "uint64",
        },
      ],
      name: "Initialized",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "activator",
          type: "address",
        },
      ],
      name: "InternalMessageProcessed",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "activator",
          type: "address",
        },
      ],
      name: "NewTransaction",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferStarted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferred",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "bytes32",
          name: "previousAdminRole",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "bytes32",
          name: "newAdminRole",
          type: "bytes32",
        },
      ],
      name: "RoleAdminChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
      ],
      name: "RoleGranted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
      ],
      name: "RoleRevoked",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
      ],
      name: "SlashAppealSubmitted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "tx_id",
          type: "bytes32",
        },
      ],
      name: "TransactionAccepted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "leader",
          type: "address",
        },
      ],
      name: "TransactionActivated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "uint256",
          name: "batchId",
          type: "uint256",
        },
        {
          indexed: false,
          internalType: "address[]",
          name: "validators",
          type: "address[]",
        },
      ],
      name: "TransactionActivatedValidators",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
      ],
      name: "TransactionCancelled",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "tx_id",
          type: "bytes32",
        },
      ],
      name: "TransactionFinalized",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "oldValidator",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newValidator",
          type: "address",
        },
      ],
      name: "TransactionIdleValidatorReplaced",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "uint256",
          name: "validatorIndex",
          type: "uint256",
        },
      ],
      name: "TransactionIdleValidatorReplacementFailed",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newLeader",
          type: "address",
        },
      ],
      name: "TransactionLeaderRotated",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "tx_id",
          type: "bytes32",
        },
      ],
      name: "TransactionLeaderTimeout",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "bytes32[]",
          name: "tx_ids",
          type: "bytes32[]",
        },
      ],
      name: "TransactionNeedsRecomputation",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "tx_id",
          type: "bytes32",
        },
        {
          indexed: false,
          internalType: "address[]",
          name: "validators",
          type: "address[]",
        },
      ],
      name: "TransactionReceiptProposed",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "tx_id",
          type: "bytes32",
        },
      ],
      name: "TransactionUndetermined",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "validator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "isLastVote",
          type: "bool",
        },
      ],
      name: "TribunalAppealVoteCommitted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "validator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "isLastVote",
          type: "bool",
        },
      ],
      name: "TribunalAppealVoteRevealed",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "validator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "isLastVote",
          type: "bool",
        },
      ],
      name: "VoteCommitted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "txId",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "validator",
          type: "address",
        },
        {
          indexed: false,
          internalType: "enum ITransactions.VoteType",
          name: "voteType",
          type: "uint8",
        },
        {
          indexed: false,
          internalType: "bool",
          name: "isLastVote",
          type: "bool",
        },
        {
          indexed: false,
          internalType: "enum ITransactions.ResultType",
          name: "result",
          type: "uint8",
        },
      ],
      name: "VoteRevealed",
      type: "event",
    },
    {
      inputs: [],
      name: "DEFAULT_ADMIN_ROLE",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "EVENTS_BATCH_SIZE",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "acceptOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
        {
          internalType: "bytes",
          name: "_vrfProof",
          type: "bytes",
        },
      ],
      name: "activateTransaction",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_sender",
          type: "address",
        },
        {
          internalType: "address",
          name: "_recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_numOfInitialValidators",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_maxRotations",
          type: "uint256",
        },
        {
          internalType: "bytes",
          name: "_txData",
          type: "bytes",
        },
      ],
      name: "addTransaction",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
      ],
      name: "cancelTransaction",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
        {
          internalType: "bytes32",
          name: "_commitHash",
          type: "bytes32",
        },
      ],
      name: "commitTribunalAppealVote",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
        {
          internalType: "bytes32",
          name: "_commitHash",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "_validatorIndex",
          type: "uint256",
        },
      ],
      name: "commitVote",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "contracts",
      outputs: [
        {
          internalType: "contract IGenManager",
          name: "genManager",
          type: "address",
        },
        {
          internalType: "contract ITransactions",
          name: "genTransactions",
          type: "address",
        },
        {
          internalType: "contract IQueues",
          name: "genQueue",
          type: "address",
        },
        {
          internalType: "contract IGhostFactory",
          name: "ghostFactory",
          type: "address",
        },
        {
          internalType: "contract IGenStaking",
          name: "genStaking",
          type: "address",
        },
        {
          internalType: "contract IMessages",
          name: "genMessages",
          type: "address",
        },
        {
          internalType: "contract IIdleness",
          name: "idleness",
          type: "address",
        },
        {
          internalType: "contract ITribunalAppeal",
          name: "tribunalAppeal",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "_value",
          type: "uint256",
        },
        {
          internalType: "bytes",
          name: "_data",
          type: "bytes",
        },
      ],
      name: "executeMessage",
      outputs: [
        {
          internalType: "bool",
          name: "success",
          type: "bool",
        },
      ],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
      ],
      name: "finalizeTransaction",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "getContracts",
      outputs: [
        {
          components: [
            {
              internalType: "contract IGenManager",
              name: "genManager",
              type: "address",
            },
            {
              internalType: "contract ITransactions",
              name: "genTransactions",
              type: "address",
            },
            {
              internalType: "contract IQueues",
              name: "genQueue",
              type: "address",
            },
            {
              internalType: "contract IGhostFactory",
              name: "ghostFactory",
              type: "address",
            },
            {
              internalType: "contract IGenStaking",
              name: "genStaking",
              type: "address",
            },
            {
              internalType: "contract IMessages",
              name: "genMessages",
              type: "address",
            },
            {
              internalType: "contract IIdleness",
              name: "idleness",
              type: "address",
            },
            {
              internalType: "contract ITribunalAppeal",
              name: "tribunalAppeal",
              type: "address",
            },
          ],
          internalType: "struct IConsensusMain.ExternalContracts",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
      ],
      name: "getRoleAdmin",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "addr",
          type: "address",
        },
      ],
      name: "ghostContracts",
      outputs: [
        {
          internalType: "bool",
          name: "isGhost",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "grantRole",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "hasRole",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "initialize",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "pendingOwner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "proceedPendingQueueProcessing",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
        {
          internalType: "bytes",
          name: "_txReceipt",
          type: "bytes",
        },
        {
          internalType: "uint256",
          name: "_processingBlock",
          type: "uint256",
        },
        {
          components: [
            {
              internalType: "enum IMessages.MessageType",
              name: "messageType",
              type: "uint8",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "value",
              type: "uint256",
            },
            {
              internalType: "bytes",
              name: "data",
              type: "bytes",
            },
            {
              internalType: "bool",
              name: "onAcceptance",
              type: "bool",
            },
          ],
          internalType: "struct IMessages.SubmittedMessage[]",
          name: "_messages",
          type: "tuple[]",
        },
        {
          internalType: "bytes",
          name: "_vrfProof",
          type: "bytes",
        },
      ],
      name: "proposeReceipt",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "renounceOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "callerConfirmation",
          type: "address",
        },
      ],
      name: "renounceRole",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
        {
          internalType: "bytes32",
          name: "_voteHash",
          type: "bytes32",
        },
        {
          internalType: "enum ITribunalAppeal.TribunalVoteType",
          name: "_voteType",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "_nonce",
          type: "uint256",
        },
      ],
      name: "revealTribunalAppealVote",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
        {
          internalType: "bytes32",
          name: "_voteHash",
          type: "bytes32",
        },
        {
          internalType: "enum ITransactions.VoteType",
          name: "_voteType",
          type: "uint8",
        },
        {
          internalType: "uint256",
          name: "_nonce",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "_validatorIndex",
          type: "uint256",
        },
      ],
      name: "revealVote",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "revokeRole",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_ghostFactory",
          type: "address",
        },
        {
          internalType: "address",
          name: "_genManager",
          type: "address",
        },
        {
          internalType: "address",
          name: "_genTransactions",
          type: "address",
        },
        {
          internalType: "address",
          name: "_genQueue",
          type: "address",
        },
        {
          internalType: "address",
          name: "_genStaking",
          type: "address",
        },
        {
          internalType: "address",
          name: "_genMessages",
          type: "address",
        },
        {
          internalType: "address",
          name: "_idleness",
          type: "address",
        },
        {
          internalType: "address",
          name: "_tribunalAppeal",
          type: "address",
        },
      ],
      name: "setExternalContracts",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
      ],
      name: "submitAppeal",
      outputs: [],
      stateMutability: "payable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
      ],
      name: "submitSlashAppeal",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes4",
          name: "interfaceId",
          type: "bytes4",
        },
      ],
      name: "supportsInterface",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
  ],
  bytecode: "",
};

const CONSENSUS_DATA_CONTRACT = {
  address: "0x88B0F18613Db92Bf970FfE264E02496e20a74D16" as Address,
  abi: [
    {
      inputs: [],
      name: "AccessControlBadConfirmation",
      type: "error",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          internalType: "bytes32",
          name: "neededRole",
          type: "bytes32",
        },
      ],
      name: "AccessControlUnauthorizedAccount",
      type: "error",
    },
    {
      inputs: [],
      name: "InvalidInitialization",
      type: "error",
    },
    {
      inputs: [],
      name: "NotInitializing",
      type: "error",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "owner",
          type: "address",
        },
      ],
      name: "OwnableInvalidOwner",
      type: "error",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "OwnableUnauthorizedAccount",
      type: "error",
    },
    {
      inputs: [],
      name: "ReentrancyGuardReentrantCall",
      type: "error",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: false,
          internalType: "uint64",
          name: "version",
          type: "uint64",
        },
      ],
      name: "Initialized",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferStarted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "address",
          name: "previousOwner",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "OwnershipTransferred",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "bytes32",
          name: "previousAdminRole",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "bytes32",
          name: "newAdminRole",
          type: "bytes32",
        },
      ],
      name: "RoleAdminChanged",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
      ],
      name: "RoleGranted",
      type: "event",
    },
    {
      anonymous: false,
      inputs: [
        {
          indexed: true,
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          indexed: true,
          internalType: "address",
          name: "account",
          type: "address",
        },
        {
          indexed: true,
          internalType: "address",
          name: "sender",
          type: "address",
        },
      ],
      name: "RoleRevoked",
      type: "event",
    },
    {
      inputs: [],
      name: "DEFAULT_ADMIN_ROLE",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "acceptOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_txId",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "_currentTimestamp",
          type: "uint256",
        },
      ],
      name: "canFinalize",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "consensusMain",
      outputs: [
        {
          internalType: "contract IConsensusMain",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "getLastAppealResult",
      outputs: [
        {
          internalType: "enum ITransactions.ResultType",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "getLatestAcceptedTransaction",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "currentTimestamp",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "numOfInitialValidators",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "txSlot",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "createdTimestamp",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "lastVoteTimestamp",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "randomSeed",
              type: "bytes32",
            },
            {
              internalType: "enum ITransactions.ResultType",
              name: "result",
              type: "uint8",
            },
            {
              internalType: "bytes",
              name: "txData",
              type: "bytes",
            },
            {
              internalType: "bytes",
              name: "txReceipt",
              type: "bytes",
            },
            {
              components: [
                {
                  internalType: "enum IMessages.MessageType",
                  name: "messageType",
                  type: "uint8",
                },
                {
                  internalType: "address",
                  name: "recipient",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
                {
                  internalType: "bool",
                  name: "onAcceptance",
                  type: "bool",
                },
              ],
              internalType: "struct IMessages.SubmittedMessage[]",
              name: "messages",
              type: "tuple[]",
            },
            {
              internalType: "enum IQueues.QueueType",
              name: "queueType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "queuePosition",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "activator",
              type: "address",
            },
            {
              internalType: "address",
              name: "lastLeader",
              type: "address",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "txId",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "activationBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "processingBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposalBlock",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.ReadStateBlockRange",
              name: "readStateBlockRange",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "numOfRounds",
              type: "uint256",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "round",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "leaderIndex",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesCommitted",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesRevealed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealBond",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "rotationsLeft",
                  type: "uint256",
                },
                {
                  internalType: "enum ITransactions.ResultType",
                  name: "result",
                  type: "uint8",
                },
                {
                  internalType: "address[]",
                  name: "roundValidators",
                  type: "address[]",
                },
                {
                  internalType: "bytes32[]",
                  name: "validatorVotesHash",
                  type: "bytes32[]",
                },
                {
                  internalType: "enum ITransactions.VoteType[]",
                  name: "validatorVotes",
                  type: "uint8[]",
                },
              ],
              internalType: "struct ITransactions.RoundData",
              name: "lastRound",
              type: "tuple",
            },
          ],
          internalType: "struct ConsensusData.TransactionData",
          name: "txData",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "startIndex",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "pageSize",
          type: "uint256",
        },
      ],
      name: "getLatestAcceptedTransactions",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "currentTimestamp",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "numOfInitialValidators",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "txSlot",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "createdTimestamp",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "lastVoteTimestamp",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "randomSeed",
              type: "bytes32",
            },
            {
              internalType: "enum ITransactions.ResultType",
              name: "result",
              type: "uint8",
            },
            {
              internalType: "bytes",
              name: "txData",
              type: "bytes",
            },
            {
              internalType: "bytes",
              name: "txReceipt",
              type: "bytes",
            },
            {
              components: [
                {
                  internalType: "enum IMessages.MessageType",
                  name: "messageType",
                  type: "uint8",
                },
                {
                  internalType: "address",
                  name: "recipient",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
                {
                  internalType: "bool",
                  name: "onAcceptance",
                  type: "bool",
                },
              ],
              internalType: "struct IMessages.SubmittedMessage[]",
              name: "messages",
              type: "tuple[]",
            },
            {
              internalType: "enum IQueues.QueueType",
              name: "queueType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "queuePosition",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "activator",
              type: "address",
            },
            {
              internalType: "address",
              name: "lastLeader",
              type: "address",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "txId",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "activationBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "processingBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposalBlock",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.ReadStateBlockRange",
              name: "readStateBlockRange",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "numOfRounds",
              type: "uint256",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "round",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "leaderIndex",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesCommitted",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesRevealed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealBond",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "rotationsLeft",
                  type: "uint256",
                },
                {
                  internalType: "enum ITransactions.ResultType",
                  name: "result",
                  type: "uint8",
                },
                {
                  internalType: "address[]",
                  name: "roundValidators",
                  type: "address[]",
                },
                {
                  internalType: "bytes32[]",
                  name: "validatorVotesHash",
                  type: "bytes32[]",
                },
                {
                  internalType: "enum ITransactions.VoteType[]",
                  name: "validatorVotes",
                  type: "uint8[]",
                },
              ],
              internalType: "struct ITransactions.RoundData",
              name: "lastRound",
              type: "tuple",
            },
          ],
          internalType: "struct ConsensusData.TransactionData[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "getLatestAcceptedTxCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "getLatestFinalizedTransaction",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "currentTimestamp",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "numOfInitialValidators",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "txSlot",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "createdTimestamp",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "lastVoteTimestamp",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "randomSeed",
              type: "bytes32",
            },
            {
              internalType: "enum ITransactions.ResultType",
              name: "result",
              type: "uint8",
            },
            {
              internalType: "bytes",
              name: "txData",
              type: "bytes",
            },
            {
              internalType: "bytes",
              name: "txReceipt",
              type: "bytes",
            },
            {
              components: [
                {
                  internalType: "enum IMessages.MessageType",
                  name: "messageType",
                  type: "uint8",
                },
                {
                  internalType: "address",
                  name: "recipient",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
                {
                  internalType: "bool",
                  name: "onAcceptance",
                  type: "bool",
                },
              ],
              internalType: "struct IMessages.SubmittedMessage[]",
              name: "messages",
              type: "tuple[]",
            },
            {
              internalType: "enum IQueues.QueueType",
              name: "queueType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "queuePosition",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "activator",
              type: "address",
            },
            {
              internalType: "address",
              name: "lastLeader",
              type: "address",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "txId",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "activationBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "processingBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposalBlock",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.ReadStateBlockRange",
              name: "readStateBlockRange",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "numOfRounds",
              type: "uint256",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "round",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "leaderIndex",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesCommitted",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesRevealed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealBond",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "rotationsLeft",
                  type: "uint256",
                },
                {
                  internalType: "enum ITransactions.ResultType",
                  name: "result",
                  type: "uint8",
                },
                {
                  internalType: "address[]",
                  name: "roundValidators",
                  type: "address[]",
                },
                {
                  internalType: "bytes32[]",
                  name: "validatorVotesHash",
                  type: "bytes32[]",
                },
                {
                  internalType: "enum ITransactions.VoteType[]",
                  name: "validatorVotes",
                  type: "uint8[]",
                },
              ],
              internalType: "struct ITransactions.RoundData",
              name: "lastRound",
              type: "tuple",
            },
          ],
          internalType: "struct ConsensusData.TransactionData",
          name: "txData",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "startIndex",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "pageSize",
          type: "uint256",
        },
      ],
      name: "getLatestFinalizedTransactions",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "currentTimestamp",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "numOfInitialValidators",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "txSlot",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "createdTimestamp",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "lastVoteTimestamp",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "randomSeed",
              type: "bytes32",
            },
            {
              internalType: "enum ITransactions.ResultType",
              name: "result",
              type: "uint8",
            },
            {
              internalType: "bytes",
              name: "txData",
              type: "bytes",
            },
            {
              internalType: "bytes",
              name: "txReceipt",
              type: "bytes",
            },
            {
              components: [
                {
                  internalType: "enum IMessages.MessageType",
                  name: "messageType",
                  type: "uint8",
                },
                {
                  internalType: "address",
                  name: "recipient",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
                {
                  internalType: "bool",
                  name: "onAcceptance",
                  type: "bool",
                },
              ],
              internalType: "struct IMessages.SubmittedMessage[]",
              name: "messages",
              type: "tuple[]",
            },
            {
              internalType: "enum IQueues.QueueType",
              name: "queueType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "queuePosition",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "activator",
              type: "address",
            },
            {
              internalType: "address",
              name: "lastLeader",
              type: "address",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "txId",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "activationBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "processingBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposalBlock",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.ReadStateBlockRange",
              name: "readStateBlockRange",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "numOfRounds",
              type: "uint256",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "round",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "leaderIndex",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesCommitted",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesRevealed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealBond",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "rotationsLeft",
                  type: "uint256",
                },
                {
                  internalType: "enum ITransactions.ResultType",
                  name: "result",
                  type: "uint8",
                },
                {
                  internalType: "address[]",
                  name: "roundValidators",
                  type: "address[]",
                },
                {
                  internalType: "bytes32[]",
                  name: "validatorVotesHash",
                  type: "bytes32[]",
                },
                {
                  internalType: "enum ITransactions.VoteType[]",
                  name: "validatorVotes",
                  type: "uint8[]",
                },
              ],
              internalType: "struct ITransactions.RoundData",
              name: "lastRound",
              type: "tuple",
            },
          ],
          internalType: "struct ConsensusData.TransactionData[]",
          name: "",
          type: "tuple[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "getLatestFinalizedTxCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "getLatestPendingTxCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "slot",
          type: "uint256",
        },
      ],
      name: "getLatestPendingTxId",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "getLatestUndeterminedTransaction",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "currentTimestamp",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "numOfInitialValidators",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "txSlot",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "createdTimestamp",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "lastVoteTimestamp",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "randomSeed",
              type: "bytes32",
            },
            {
              internalType: "enum ITransactions.ResultType",
              name: "result",
              type: "uint8",
            },
            {
              internalType: "bytes",
              name: "txData",
              type: "bytes",
            },
            {
              internalType: "bytes",
              name: "txReceipt",
              type: "bytes",
            },
            {
              components: [
                {
                  internalType: "enum IMessages.MessageType",
                  name: "messageType",
                  type: "uint8",
                },
                {
                  internalType: "address",
                  name: "recipient",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
                {
                  internalType: "bool",
                  name: "onAcceptance",
                  type: "bool",
                },
              ],
              internalType: "struct IMessages.SubmittedMessage[]",
              name: "messages",
              type: "tuple[]",
            },
            {
              internalType: "enum IQueues.QueueType",
              name: "queueType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "queuePosition",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "activator",
              type: "address",
            },
            {
              internalType: "address",
              name: "lastLeader",
              type: "address",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "txId",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "activationBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "processingBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposalBlock",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.ReadStateBlockRange",
              name: "readStateBlockRange",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "numOfRounds",
              type: "uint256",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "round",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "leaderIndex",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesCommitted",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesRevealed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealBond",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "rotationsLeft",
                  type: "uint256",
                },
                {
                  internalType: "enum ITransactions.ResultType",
                  name: "result",
                  type: "uint8",
                },
                {
                  internalType: "address[]",
                  name: "roundValidators",
                  type: "address[]",
                },
                {
                  internalType: "bytes32[]",
                  name: "validatorVotesHash",
                  type: "bytes32[]",
                },
                {
                  internalType: "enum ITransactions.VoteType[]",
                  name: "validatorVotes",
                  type: "uint8[]",
                },
              ],
              internalType: "struct ITransactions.RoundData",
              name: "lastRound",
              type: "tuple",
            },
          ],
          internalType: "struct ConsensusData.TransactionData",
          name: "txData",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
      ],
      name: "getLatestUndeterminedTxCount",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "getMessagesForTransaction",
      outputs: [
        {
          components: [
            {
              internalType: "enum IMessages.MessageType",
              name: "messageType",
              type: "uint8",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "value",
              type: "uint256",
            },
            {
              internalType: "bytes",
              name: "data",
              type: "bytes",
            },
            {
              internalType: "bool",
              name: "onAcceptance",
              type: "bool",
            },
          ],
          internalType: "struct IMessages.SubmittedMessage[]",
          name: "",
          type: "tuple[]",
        },
        {
          internalType: "address",
          name: "ghostAddress",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "getReadStateBlockRangeForTransaction",
      outputs: [
        {
          internalType: "uint256",
          name: "activationBlock",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "processingBlock",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "proposalBlock",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "recipient",
          type: "address",
        },
        {
          internalType: "uint256",
          name: "startIndex",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "endIndex",
          type: "uint256",
        },
      ],
      name: "getRecipientQueues",
      outputs: [
        {
          components: [
            {
              components: [
                {
                  internalType: "uint256",
                  name: "head",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "tail",
                  type: "uint256",
                },
                {
                  internalType: "bytes32[]",
                  name: "txIds",
                  type: "bytes32[]",
                },
              ],
              internalType: "struct IQueues.QueueInfoView",
              name: "pending",
              type: "tuple",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "head",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "tail",
                  type: "uint256",
                },
                {
                  internalType: "bytes32[]",
                  name: "txIds",
                  type: "bytes32[]",
                },
              ],
              internalType: "struct IQueues.QueueInfoView",
              name: "accepted",
              type: "tuple",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "head",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "tail",
                  type: "uint256",
                },
                {
                  internalType: "bytes32[]",
                  name: "txIds",
                  type: "bytes32[]",
                },
              ],
              internalType: "struct IQueues.QueueInfoView",
              name: "undetermined",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "finalizedCount",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "issuedTxCount",
              type: "uint256",
            },
          ],
          internalType: "struct IQueues.RecipientQueuesView",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
      ],
      name: "getRoleAdmin",
      outputs: [
        {
          internalType: "bytes32",
          name: "",
          type: "bytes32",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "getTotalNumOfTransactions",
      outputs: [
        {
          internalType: "uint256",
          name: "",
          type: "uint256",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "getTransactionAllData",
      outputs: [
        {
          components: [
            {
              internalType: "bytes32",
              name: "id",
              type: "bytes32",
            },
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "numOfInitialValidators",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "txSlot",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "activator",
              type: "address",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "previousStatus",
              type: "uint8",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "created",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "pending",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "activated",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "committed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "lastVote",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealSubmitted",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.Timestamps",
              name: "timestamps",
              type: "tuple",
            },
            {
              internalType: "bytes32",
              name: "randomSeed",
              type: "bytes32",
            },
            {
              internalType: "bool",
              name: "onAcceptanceMessages",
              type: "bool",
            },
            {
              internalType: "enum ITransactions.ResultType",
              name: "result",
              type: "uint8",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "activationBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "processingBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposalBlock",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.ReadStateBlockRange",
              name: "readStateBlockRange",
              type: "tuple",
            },
            {
              internalType: "bytes",
              name: "txData",
              type: "bytes",
            },
            {
              internalType: "bytes",
              name: "txReceipt",
              type: "bytes",
            },
            {
              components: [
                {
                  internalType: "enum IMessages.MessageType",
                  name: "messageType",
                  type: "uint8",
                },
                {
                  internalType: "address",
                  name: "recipient",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
                {
                  internalType: "bool",
                  name: "onAcceptance",
                  type: "bool",
                },
              ],
              internalType: "struct IMessages.SubmittedMessage[]",
              name: "messages",
              type: "tuple[]",
            },
            {
              internalType: "address[]",
              name: "consumedValidators",
              type: "address[]",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "round",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "leaderIndex",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesCommitted",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesRevealed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealBond",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "rotationsLeft",
                  type: "uint256",
                },
                {
                  internalType: "enum ITransactions.ResultType",
                  name: "result",
                  type: "uint8",
                },
                {
                  internalType: "address[]",
                  name: "roundValidators",
                  type: "address[]",
                },
                {
                  internalType: "bytes32[]",
                  name: "validatorVotesHash",
                  type: "bytes32[]",
                },
                {
                  internalType: "enum ITransactions.VoteType[]",
                  name: "validatorVotes",
                  type: "uint8[]",
                },
              ],
              internalType: "struct ITransactions.RoundData[]",
              name: "roundData",
              type: "tuple[]",
            },
          ],
          internalType: "struct ITransactions.Transaction",
          name: "transaction",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "_timestamp",
          type: "uint256",
        },
      ],
      name: "getTransactionData",
      outputs: [
        {
          components: [
            {
              internalType: "uint256",
              name: "currentTimestamp",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "sender",
              type: "address",
            },
            {
              internalType: "address",
              name: "recipient",
              type: "address",
            },
            {
              internalType: "uint256",
              name: "numOfInitialValidators",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "txSlot",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "createdTimestamp",
              type: "uint256",
            },
            {
              internalType: "uint256",
              name: "lastVoteTimestamp",
              type: "uint256",
            },
            {
              internalType: "bytes32",
              name: "randomSeed",
              type: "bytes32",
            },
            {
              internalType: "enum ITransactions.ResultType",
              name: "result",
              type: "uint8",
            },
            {
              internalType: "bytes",
              name: "txData",
              type: "bytes",
            },
            {
              internalType: "bytes",
              name: "txReceipt",
              type: "bytes",
            },
            {
              components: [
                {
                  internalType: "enum IMessages.MessageType",
                  name: "messageType",
                  type: "uint8",
                },
                {
                  internalType: "address",
                  name: "recipient",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "value",
                  type: "uint256",
                },
                {
                  internalType: "bytes",
                  name: "data",
                  type: "bytes",
                },
                {
                  internalType: "bool",
                  name: "onAcceptance",
                  type: "bool",
                },
              ],
              internalType: "struct IMessages.SubmittedMessage[]",
              name: "messages",
              type: "tuple[]",
            },
            {
              internalType: "enum IQueues.QueueType",
              name: "queueType",
              type: "uint8",
            },
            {
              internalType: "uint256",
              name: "queuePosition",
              type: "uint256",
            },
            {
              internalType: "address",
              name: "activator",
              type: "address",
            },
            {
              internalType: "address",
              name: "lastLeader",
              type: "address",
            },
            {
              internalType: "enum ITransactions.TransactionStatus",
              name: "status",
              type: "uint8",
            },
            {
              internalType: "bytes32",
              name: "txId",
              type: "bytes32",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "activationBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "processingBlock",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "proposalBlock",
                  type: "uint256",
                },
              ],
              internalType: "struct ITransactions.ReadStateBlockRange",
              name: "readStateBlockRange",
              type: "tuple",
            },
            {
              internalType: "uint256",
              name: "numOfRounds",
              type: "uint256",
            },
            {
              components: [
                {
                  internalType: "uint256",
                  name: "round",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "leaderIndex",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesCommitted",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "votesRevealed",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "appealBond",
                  type: "uint256",
                },
                {
                  internalType: "uint256",
                  name: "rotationsLeft",
                  type: "uint256",
                },
                {
                  internalType: "enum ITransactions.ResultType",
                  name: "result",
                  type: "uint8",
                },
                {
                  internalType: "address[]",
                  name: "roundValidators",
                  type: "address[]",
                },
                {
                  internalType: "bytes32[]",
                  name: "validatorVotesHash",
                  type: "bytes32[]",
                },
                {
                  internalType: "enum ITransactions.VoteType[]",
                  name: "validatorVotes",
                  type: "uint8[]",
                },
              ],
              internalType: "struct ITransactions.RoundData",
              name: "lastRound",
              type: "tuple",
            },
          ],
          internalType: "struct ConsensusData.TransactionData",
          name: "",
          type: "tuple",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "uint256",
          name: "startIndex",
          type: "uint256",
        },
        {
          internalType: "uint256",
          name: "endIndex",
          type: "uint256",
        },
      ],
      name: "getTransactionIndexToTxId",
      outputs: [
        {
          internalType: "bytes32[]",
          name: "",
          type: "bytes32[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
        {
          internalType: "uint256",
          name: "_timestamp",
          type: "uint256",
        },
      ],
      name: "getTransactionStatus",
      outputs: [
        {
          internalType: "enum ITransactions.TransactionStatus",
          name: "",
          type: "uint8",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "getValidatorsForLastAppeal",
      outputs: [
        {
          internalType: "address[]",
          name: "",
          type: "address[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "getValidatorsForLastRound",
      outputs: [
        {
          internalType: "address[]",
          name: "",
          type: "address[]",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "grantRole",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "hasRole",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "hasTransactionOnAcceptanceMessages",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "_tx_id",
          type: "bytes32",
        },
      ],
      name: "hasTransactionOnFinalizationMessages",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_consensusMain",
          type: "address",
        },
        {
          internalType: "address",
          name: "_transactions",
          type: "address",
        },
        {
          internalType: "address",
          name: "_queues",
          type: "address",
        },
      ],
      name: "initialize",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [],
      name: "owner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "pendingOwner",
      outputs: [
        {
          internalType: "address",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "queues",
      outputs: [
        {
          internalType: "contract IQueues",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "renounceOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "callerConfirmation",
          type: "address",
        },
      ],
      name: "renounceRole",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes32",
          name: "role",
          type: "bytes32",
        },
        {
          internalType: "address",
          name: "account",
          type: "address",
        },
      ],
      name: "revokeRole",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_consensusMain",
          type: "address",
        },
      ],
      name: "setConsensusMain",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_queues",
          type: "address",
        },
      ],
      name: "setQueues",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "_transactions",
          type: "address",
        },
      ],
      name: "setTransactions",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "bytes4",
          name: "interfaceId",
          type: "bytes4",
        },
      ],
      name: "supportsInterface",
      outputs: [
        {
          internalType: "bool",
          name: "",
          type: "bool",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [],
      name: "transactions",
      outputs: [
        {
          internalType: "contract ITransactions",
          name: "",
          type: "address",
        },
      ],
      stateMutability: "view",
      type: "function",
    },
    {
      inputs: [
        {
          internalType: "address",
          name: "newOwner",
          type: "address",
        },
      ],
      name: "transferOwnership",
      outputs: [],
      stateMutability: "nonpayable",
      type: "function",
    },
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
