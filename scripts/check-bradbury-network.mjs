import { pathToFileURL } from 'node:url';

export const GENESIS = '0x17d89764d4f4f963158fc4c5e8f2cb670c2837740b35f37081c12860c3df97e4';
export const CONTRACTS = {
  AddressManager: '0x3F71AE080BD6270A91dBcc7960d88797828538E0',
  Staking: '0xD8fBa96C0dBB0257028dBc0107060b958e5c7113',
  ConsensusMain: '0x2E2766cbc3E5e61Ce93bBcdCBb3eAcB82082A019',
};

export async function checkNetwork(request) {
  if (BigInt(await request('eth_chainId', [])) !== 4221n) throw new Error('Wrong chain ID');
  const genesis = await request('eth_getBlockByNumber', ['0x0', false]);
  if (genesis?.hash?.toLowerCase() !== GENESIS) throw new Error('Wrong genesis: this is not Bradbury Phase 2 (chain ID 4221 is reused)');
  for (const [name, address] of Object.entries(CONTRACTS)) {
    const code = await request('eth_getCode', [address, 'latest']);
    if (typeof code !== 'string' || !/^0x[0-9a-f]+$/i.test(code) || code.length <= 2) throw new Error(`${name} has no deployed code`);
  }
}

export function rpcRequest(url, key) {
  return async (method, params) => {
    // Do not print endpoint URLs, headers, provider errors or response bodies: they may contain credentials.
    let response;
    try {
      response = await fetch(url, {method: 'POST', headers: {'content-type': 'application/json', ...(key ? {'X-AccessKey': key} : {})},
        body: JSON.stringify({jsonrpc: '2.0', id: 1, method, params}), signal: AbortSignal.timeout(15000)});
    } catch { throw new Error(`${method}: RPC connection failed`); }
    if (!response.ok) throw new Error(`${method}: HTTP ${response.status}`);
    let data;
    try { data = await response.json(); } catch { throw new Error(`${method}: invalid JSON response`); }
    if (data.error || data.result === undefined) throw new Error(`${method}: RPC request rejected`);
    return data.result;
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await checkNetwork(rpcRequest(process.env.BRADBURY_RPC_URL || 'https://rpc.testnet-chain.genlayer.com', process.env.BRADBURY_RPC_KEY));
    console.log('Bradbury Phase 2: chain ID, genesis and required contract code verified.');
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
