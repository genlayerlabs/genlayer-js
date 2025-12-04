// ValidatorWallet ABI for querying and managing validator wallet
export const VALIDATOR_WALLET_ABI = [
  {
    name: "operator",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "address"}],
  },
  {
    name: "owner",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "address"}],
  },
  {
    name: "getIdentity",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {name: "moniker", type: "string"},
          {name: "logoUri", type: "string"},
          {name: "website", type: "string"},
          {name: "description", type: "string"},
          {name: "email", type: "string"},
          {name: "twitter", type: "string"},
          {name: "telegram", type: "string"},
          {name: "github", type: "string"},
          {name: "extraCid", type: "bytes"},
        ],
      },
    ],
  },
  {
    name: "setOperator",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{name: "_operator", type: "address"}],
    outputs: [],
  },
  {
    name: "setIdentity",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {name: "moniker", type: "string"},
      {name: "logoUri", type: "string"},
      {name: "website", type: "string"},
      {name: "description", type: "string"},
      {name: "email", type: "string"},
      {name: "twitter", type: "string"},
      {name: "telegram", type: "string"},
      {name: "github", type: "string"},
      {name: "extraCid", type: "bytes"},
    ],
    outputs: [],
  },
] as const;

export const STAKING_ABI = [
  // Custom errors
  {name: "BelowMinStake", type: "error", inputs: []},
  {name: "AlreadyValidator", type: "error", inputs: []},
  {name: "NotValidator", type: "error", inputs: []},
  {name: "NotOwner", type: "error", inputs: []},
  {name: "NotOperator", type: "error", inputs: []},
  {name: "ValidatorBanned", type: "error", inputs: []},
  {name: "ValidatorQuarantined", type: "error", inputs: []},
  {name: "InsufficientShares", type: "error", inputs: []},
  {name: "NothingToClaim", type: "error", inputs: []},
  {name: "NotYetClaimable", type: "error", inputs: []},
  {name: "ZeroAmount", type: "error", inputs: []},
  {name: "InvalidOperator", type: "error", inputs: []},

  // Validator functions
  {
    name: "validatorJoin",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [{name: "validator", type: "address"}],
  },
  {
    name: "validatorJoin",
    type: "function",
    stateMutability: "payable",
    inputs: [{name: "_operator", type: "address"}],
    outputs: [{name: "validator", type: "address"}],
  },
  {
    name: "validatorDeposit",
    type: "function",
    stateMutability: "payable",
    inputs: [],
    outputs: [],
  },
  {
    name: "validatorExit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{name: "_sharesWithdrawal", type: "uint256"}],
    outputs: [],
  },
  {
    name: "validatorClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{name: "_validator", type: "address"}],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "validatorPrime",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [{name: "_validator", type: "address"}],
    outputs: [],
  },
  // Delegator functions
  {
    name: "delegatorJoin",
    type: "function",
    stateMutability: "payable",
    inputs: [{name: "_validator", type: "address"}],
    outputs: [],
  },
  {
    name: "delegatorExit",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_validator", type: "address"},
      {name: "_sharesExit", type: "uint256"},
    ],
    outputs: [],
  },
  {
    name: "delegatorClaim",
    type: "function",
    stateMutability: "nonpayable",
    inputs: [
      {name: "_delegator", type: "address"},
      {name: "_validator", type: "address"},
    ],
    outputs: [],
  },
  // View functions
  {
    name: "isValidator",
    type: "function",
    stateMutability: "view",
    inputs: [{name: "_address", type: "address"}],
    outputs: [{name: "", type: "bool"}],
  },
  {
    name: "validatorView",
    type: "function",
    stateMutability: "view",
    inputs: [{name: "_validator", type: "address"}],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {name: "left", type: "address"},
          {name: "right", type: "address"},
          {name: "parent", type: "address"},
          {name: "eBanned", type: "uint256"},
          {name: "ePrimed", type: "uint256"},
          {name: "vStake", type: "uint256"},
          {name: "vShares", type: "uint256"},
          {name: "dStake", type: "uint256"},
          {name: "dShares", type: "uint256"},
          {name: "vDeposit", type: "uint256"},
          {name: "vWithdrawal", type: "uint256"},
          {name: "live", type: "bool"},
        ],
      },
    ],
  },
  {
    name: "sharesOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_delegator", type: "address"},
      {name: "_validator", type: "address"},
    ],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "stakeOf",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_delegator", type: "address"},
      {name: "_validator", type: "address"},
    ],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "epoch",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "validatorMinStake",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "delegatorMinStake",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "activeValidators",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "address[]"}],
  },
  {
    name: "activeValidatorsCount",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "epochOdd",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {name: "start", type: "uint256"},
          {name: "end", type: "uint256"},
          {name: "inflation", type: "uint256"},
          {name: "weight", type: "uint256"},
          {name: "weightDeposit", type: "uint256"},
          {name: "weightWithdrawal", type: "uint256"},
          {name: "vcount", type: "uint256"},
          {name: "claimed", type: "uint256"},
          {name: "stakeDeposit", type: "uint256"},
          {name: "stakeWithdrawal", type: "uint256"},
        ],
      },
    ],
  },
  {
    name: "epochEven",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          {name: "start", type: "uint256"},
          {name: "end", type: "uint256"},
          {name: "inflation", type: "uint256"},
          {name: "weight", type: "uint256"},
          {name: "weightDeposit", type: "uint256"},
          {name: "weightWithdrawal", type: "uint256"},
          {name: "vcount", type: "uint256"},
          {name: "claimed", type: "uint256"},
          {name: "stakeDeposit", type: "uint256"},
          {name: "stakeWithdrawal", type: "uint256"},
        ],
      },
    ],
  },
  {
    name: "epochMinDuration",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "epochZeroMinDuration",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "getQuarantinedValidators",
    type: "function",
    stateMutability: "view",
    inputs: [],
    outputs: [{name: "", type: "address[]"}],
  },
  {
    name: "getAllQuarantinedValidators",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_startIndex", type: "uint256"},
      {name: "_size", type: "uint256"},
    ],
    outputs: [
      {
        name: "validatorList",
        type: "tuple[]",
        components: [
          {name: "validator", type: "address"},
          {name: "untilEpochBanned", type: "uint256"},
          {name: "permanentlyBanned", type: "bool"},
        ],
      },
    ],
  },
  {
    name: "getAllBannedValidators",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_startIndex", type: "uint256"},
      {name: "_size", type: "uint256"},
    ],
    outputs: [
      {
        name: "validatorList",
        type: "tuple[]",
        components: [
          {name: "validator", type: "address"},
          {name: "untilEpochBanned", type: "uint256"},
          {name: "permanentlyBanned", type: "bool"},
        ],
      },
    ],
  },
  // Deposit query functions
  {
    name: "validatorDepositLen",
    type: "function",
    stateMutability: "view",
    inputs: [{name: "_validator", type: "address"}],
    outputs: [{name: "len_", type: "uint256"}],
  },
  {
    name: "validatorDeposit",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_validator", type: "address"},
      {name: "_index", type: "uint256"},
    ],
    outputs: [
      {name: "epoch_", type: "uint256"},
      {
        name: "commit_",
        type: "tuple",
        components: [
          {name: "input", type: "uint256"},
          {name: "output", type: "uint256"},
          {name: "epoch", type: "uint256"},
          {name: "linkToNextCommit", type: "uint256"},
        ],
      },
    ],
  },
  {
    name: "delegatorDepositLen",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_delegator", type: "address"},
      {name: "_validator", type: "address"},
    ],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "delegatorDeposit",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_delegator", type: "address"},
      {name: "_validator", type: "address"},
      {name: "_index", type: "uint256"},
    ],
    outputs: [
      {
        name: "claim_",
        type: "tuple",
        components: [
          {name: "quantity", type: "uint256"},
          {name: "commit", type: "uint256"},
        ],
      },
      {
        name: "commit_",
        type: "tuple",
        components: [
          {name: "input", type: "uint256"},
          {name: "output", type: "uint256"},
          {name: "epoch", type: "uint256"},
          {name: "linkToNextCommit", type: "uint256"},
        ],
      },
    ],
  },
  // Withdrawal query functions
  {
    name: "validatorWithdrawalLen",
    type: "function",
    stateMutability: "view",
    inputs: [{name: "_validator", type: "address"}],
    outputs: [{name: "len_", type: "uint256"}],
  },
  {
    name: "validatorWithdrawal",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_validator", type: "address"},
      {name: "_index", type: "uint256"},
    ],
    outputs: [
      {name: "epoch_", type: "uint256"},
      {
        name: "commit_",
        type: "tuple",
        components: [
          {name: "input", type: "uint256"},
          {name: "output", type: "uint256"},
          {name: "epoch", type: "uint256"},
          {name: "linkToNextCommit", type: "uint256"},
        ],
      },
    ],
  },
  {
    name: "delegatorWithdrawalLen",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_delegator", type: "address"},
      {name: "_validator", type: "address"},
    ],
    outputs: [{name: "", type: "uint256"}],
  },
  {
    name: "delegatorWithdrawal",
    type: "function",
    stateMutability: "view",
    inputs: [
      {name: "_delegator", type: "address"},
      {name: "_validator", type: "address"},
      {name: "_index", type: "uint256"},
    ],
    outputs: [
      {
        name: "claim_",
        type: "tuple",
        components: [
          {name: "quantity", type: "uint256"},
          {name: "commit", type: "uint256"},
        ],
      },
      {
        name: "commit_",
        type: "tuple",
        components: [
          {name: "input", type: "uint256"},
          {name: "output", type: "uint256"},
          {name: "epoch", type: "uint256"},
          {name: "linkToNextCommit", type: "uint256"},
        ],
      },
    ],
  },
  // Events (none indexed to match deployed contract)
  {
    name: "ValidatorJoin",
    type: "event",
    inputs: [
      {name: "operator", type: "address", indexed: false},
      {name: "validator", type: "address", indexed: false},
      {name: "amount", type: "uint256", indexed: false},
    ],
  },
  {
    name: "ValidatorDeposit",
    type: "event",
    inputs: [
      {name: "validator", type: "address", indexed: false},
      {name: "amount", type: "uint256", indexed: false},
    ],
  },
  {
    name: "ValidatorExit",
    type: "event",
    inputs: [
      {name: "validator", type: "address", indexed: false},
      {name: "shares", type: "uint256", indexed: false},
    ],
  },
  {
    name: "DelegatorJoin",
    type: "event",
    inputs: [
      {name: "delegator", type: "address", indexed: false},
      {name: "validator", type: "address", indexed: false},
      {name: "amount", type: "uint256", indexed: false},
    ],
  },
] as const;
