# Type Alias: GenLayerClient\<TGenLayerChain\>

> **GenLayerClient**\<`TGenLayerChain`\> = `Omit`\<`Client`\<`Transport`, `TGenLayerChain`\>, `"getTransaction"` \| `"readContract"`\> & `Omit`\<`WalletActions`\<`TGenLayerChain`\>, `"deployContract"` \| `"writeContract"`\> & `Omit`\<`PublicActions`\<`Transport`, `TGenLayerChain`\>, `"readContract"` \| `"getTransaction"` \| `"waitForTransactionReceipt"`\> & `object` & [`StakingActions`](types.Interface.StakingActions.md)

Defined in: [types/clients.ts:31](https://github.com/genlayerlabs/genlayer-js/blob/eaba6adec6803bdd0b4968e3f0763cf22107acd1/src/types/clients.ts#L31)

## Type Declaration

### appealTransaction

> **appealTransaction**: (`args`) => `Promise`\<`any`\>

#### Parameters

##### args

###### account?

`Account`

###### txId

`` `0x${string}` ``

###### value?

`bigint`

#### Returns

`Promise`\<`any`\>

### cancelTransaction

> **cancelTransaction**: (`args`) => `Promise`\<\{ `status`: `string`; `transaction_hash`: `string`; \}\>

#### Parameters

##### args

###### hash

[`TransactionHash`](types.TypeAlias.TransactionHash.md)

#### Returns

`Promise`\<\{ `status`: `string`; `transaction_hash`: `string`; \}\>

### connect

> **connect**: (`network?`, `snapSource?`) => `Promise`\<`void`\>

#### Parameters

##### network?

[`Network`](types.TypeAlias.Network.md)

##### snapSource?

[`SnapSource`](types.TypeAlias.SnapSource.md)

#### Returns

`Promise`\<`void`\>

### deployContract

> **deployContract**: (`args`) => `Promise`\<`` `0x${string}` ``\>

#### Parameters

##### args

###### account?

`Account`

###### args?

[`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)[]

###### code

`string` \| `Uint8Array`

###### consensusMaxRotations?

`number`

###### kwargs?

`Map`\<`string`, [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\> \| \{\[`key`: `string`\]: [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md); \}

###### leaderOnly?

`boolean`

#### Returns

`Promise`\<`` `0x${string}` ``\>

### estimateTransactionGas

> **estimateTransactionGas**: (`transactionParams`) => `Promise`\<`bigint`\>

#### Parameters

##### transactionParams

###### data?

`` `0x${string}` ``

###### from?

`Address`

###### to

`Address`

###### value?

`bigint`

#### Returns

`Promise`\<`bigint`\>

### getContractCode

> **getContractCode**: (`address`) => `Promise`\<`string`\>

#### Parameters

##### address

`Address`

#### Returns

`Promise`\<`string`\>

### getContractSchema

> **getContractSchema**: (`address`) => `Promise`\<[`ContractSchema`](types.TypeAlias.ContractSchema.md)\>

#### Parameters

##### address

`Address`

#### Returns

`Promise`\<[`ContractSchema`](types.TypeAlias.ContractSchema.md)\>

### getContractSchemaForCode

> **getContractSchemaForCode**: (`contractCode`) => `Promise`\<[`ContractSchema`](types.TypeAlias.ContractSchema.md)\>

#### Parameters

##### contractCode

`string` \| `Uint8Array`

#### Returns

`Promise`\<[`ContractSchema`](types.TypeAlias.ContractSchema.md)\>

### getCurrentNonce

> **getCurrentNonce**: (`args`) => `Promise`\<`number`\>

#### Parameters

##### args

###### address

`Address`

#### Returns

`Promise`\<`number`\>

### getMinAppealBond

> **getMinAppealBond**: (`args`) => `Promise`\<`bigint`\>

#### Parameters

##### args

###### txId

`` `0x${string}` ``

#### Returns

`Promise`\<`bigint`\>

### getTransaction

> **getTransaction**: (`args`) => `Promise`\<[`GenLayerTransaction`](types.TypeAlias.GenLayerTransaction.md)\>

#### Parameters

##### args

###### hash

[`TransactionHash`](types.TypeAlias.TransactionHash.md)

#### Returns

`Promise`\<[`GenLayerTransaction`](types.TypeAlias.GenLayerTransaction.md)\>

### ~~initializeConsensusSmartContract~~

> **initializeConsensusSmartContract**: (`forceReset?`) => `Promise`\<`void`\>

#### Parameters

##### forceReset?

`boolean`

#### Returns

`Promise`\<`void`\>

#### Deprecated

This method is deprecated. The consensus contract is now resolved from the static chain definition.

### metamaskClient

> **metamaskClient**: (`snapSource?`) => `Promise`\<`MetaMaskClientResult`\>

#### Parameters

##### snapSource?

[`SnapSource`](types.TypeAlias.SnapSource.md)

#### Returns

`Promise`\<`MetaMaskClientResult`\>

### readContract

> **readContract**: \<`RawReturn`\>(`args`) => `Promise`\<`RawReturn` *extends* `true` ? `` `0x${string}` `` : [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\>

#### Type Parameters

##### RawReturn

`RawReturn` *extends* `boolean` \| `undefined`

#### Parameters

##### args

###### account?

`Account`

###### address

`Address`

###### args?

[`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)[]

###### functionName

`string`

###### jsonSafeReturn?

`boolean`

###### kwargs?

`Map`\<`string`, [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\> \| \{\[`key`: `string`\]: [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md); \}

###### rawReturn?

`RawReturn`

###### transactionHashVariant?

[`TransactionHashVariant`](types.Enumeration.TransactionHashVariant.md)

#### Returns

`Promise`\<`RawReturn` *extends* `true` ? `` `0x${string}` `` : [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\>

### request

> **request**: `Client`\<`Transport`, `TGenLayerChain`\>\[`"request"`\] & \<`TMethod`\>(`args`) => `Promise`\<`unknown`\>

### simulateWriteContract

> **simulateWriteContract**: \<`RawReturn`\>(`args`) => `Promise`\<`RawReturn` *extends* `true` ? `` `0x${string}` `` : [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\>

#### Type Parameters

##### RawReturn

`RawReturn` *extends* `boolean` \| `undefined`

#### Parameters

##### args

###### account?

`Account`

###### address

`Address`

###### args?

[`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)[]

###### functionName

`string`

###### kwargs?

`Map`\<`string`, [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\> \| \{\[`key`: `string`\]: [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md); \}

###### leaderOnly?

`boolean`

###### rawReturn?

`RawReturn`

###### transactionHashVariant?

[`TransactionHashVariant`](types.Enumeration.TransactionHashVariant.md)

#### Returns

`Promise`\<`RawReturn` *extends* `true` ? `` `0x${string}` `` : [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\>

### waitForTransactionReceipt

> **waitForTransactionReceipt**: (`args`) => `Promise`\<[`GenLayerTransaction`](types.TypeAlias.GenLayerTransaction.md)\>

#### Parameters

##### args

###### hash

[`TransactionHash`](types.TypeAlias.TransactionHash.md)

###### interval?

`number`

###### retries?

`number`

###### status?

[`TransactionStatus`](types.Enumeration.TransactionStatus.md)

#### Returns

`Promise`\<[`GenLayerTransaction`](types.TypeAlias.GenLayerTransaction.md)\>

### writeContract

> **writeContract**: (`args`) => `Promise`\<`any`\>

#### Parameters

##### args

###### account?

`Account`

###### address

`Address`

###### args?

[`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)[]

###### consensusMaxRotations?

`number`

###### functionName

`string`

###### kwargs?

`Map`\<`string`, [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md)\> \| \{\[`key`: `string`\]: [`CalldataEncodable`](types.TypeAlias.CalldataEncodable.md); \}

###### leaderOnly?

`boolean`

###### value

`bigint`

#### Returns

`Promise`\<`any`\>

## Type Parameters

### TGenLayerChain

`TGenLayerChain` *extends* [`GenLayerChain`](types.TypeAlias.GenLayerChain.md)
