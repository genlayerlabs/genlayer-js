import test from 'node:test';
import assert from 'node:assert/strict';
import {checkNetwork, ADDRESS_MANAGER, GENESIS} from './check-bradbury-network.mjs';
const staking = '0x1111111111111111111111111111111111111111';
const consensus = '0x2222222222222222222222222222222222222222';
function rpc({missing = false, empty = false, oldGenesis = false} = {}) {
  const checked = [];
  return {checked, request: async (method, params) => {
    if (method === 'eth_chainId') return '0x107d';
    if (method === 'eth_getBlockByNumber') return {hash: oldGenesis ? '0xdead' : GENESIS};
    if (method === 'eth_call') {
      assert.equal(params[0].to, ADDRESS_MANAGER);
      assert.equal(params[0].data.slice(0,10), '0xbf40fac1');
      const name = Buffer.from(params[0].data.slice(138), 'hex').toString().replace(/\0/g, '');
      assert.ok(['Staking','ConsensusMain'].includes(name));
      return '0x' + (empty ? '0'.repeat(64) : (name === 'Staking' ? staking : consensus).slice(2).padStart(64,'0'));
    }
    if (method === 'eth_getCode') {checked.push(params[0]); return missing && params[0] === staking ? '0x' : '0x6001';}
    throw Error('Unexpected RPC method');
  }};
}
test('accepts current registry addresses even when they differ from the initial deployment', async () => {
  const mock=rpc();
  assert.deepEqual(await checkNetwork(mock.request),{AddressManager: ADDRESS_MANAGER,Staking:staking,ConsensusMain:consensus});
  assert.deepEqual(mock.checked,[ADDRESS_MANAGER,staking,consensus]);
});
test('rejects an empty registry entry', async()=>{await assert.rejects(checkNetwork(rpc({empty:true}).request),/entry/);});
test('requires code at the resolved address', async()=>{await assert.rejects(checkNetwork(rpc({missing:true}).request),/code/);});
test('rejects the former chain before reading the registry', async()=>{await assert.rejects(checkNetwork(rpc({oldGenesis:true}).request),/genesis/);});
