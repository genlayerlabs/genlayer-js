# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build & Development

```bash
npm install             # Install dependencies
npm run build           # Production build (tsup, outputs ESM+CJS to dist/)
npm run build:watch     # Watch mode for development
npm run lint            # ESLint with auto-fix
npm link                # Link package locally for testing in other projects
```

## Testing

```bash
npm test                # Run tests with typecheck (vitest)
npm run test:watch      # Watch mode
```

## Architecture

### Module Structure & Exports

The SDK exports three entry points (see `package.json` exports):
- `genlayer-js` - Main: client, accounts, transaction decoders, staking utils
- `genlayer-js/chains` - Chain configs: `localnet`, `studionet`, `testnetAsimov`
- `genlayer-js/types` - TypeScript types for all SDK entities

### Client Factory Pattern

`createClient()` in `src/client/client.ts` builds a composable client by extending viem's base client with action modules:

```
baseClient → publicActions → walletActions → accountActions
           → transactionActions → chainActions → contractActions
           → receiptActions → stakingActions
```

Each action module (`src/<domain>/actions.ts`) returns an object of methods that get merged into the client. The client auto-initializes the consensus smart contract on creation.

### Chain Configurations

`GenLayerChain` extends viem's `Chain` with GenLayer-specific properties:
- `isStudio` - Whether using studio-based localnet
- `consensusMainContract` / `consensusDataContract` - On-chain consensus contracts
- `stakingContract` - Staking contract (testnet-asimov only)
- `defaultNumberOfInitialValidators` / `defaultConsensusMaxRotations`

### Calldata Encoding

Custom binary encoding for GenLayer transactions in `src/abi/calldata/`:
- `encoder.ts` - Encodes JS values to GenLayer binary format
- `decoder.ts` - Decodes binary responses back to JS
- Uses MessagePack-like format with type tags

### Path Aliases

- `@/*` → `./src/*`
- `@@/tests/*` → `./tests/*`

### Key Dependencies

- `viem` - Ethereum client, used as foundation for all blockchain interactions
- `typescript-parsec` - Parser combinator for calldata string parsing
