import assert from 'node:assert/strict';
import {estimateForgeShare, readForgePower} from '../../assets/forge-share-preview.js';

assert.equal(estimateForgeShare(100n, 900n), '10.00%');
assert.equal(estimateForgeShare(100n, 100n), '50.00%');
assert.equal(estimateForgeShare(100n, 0n), '100.00%');
assert.equal(estimateForgeShare(0n, 100n), null);
assert.equal(estimateForgeShare(-1n, 100n), null);
assert.equal(estimateForgeShare(1n, 10n ** 30n), '<0.0001%');
const block = {number: 123, timestamp: 456};
const contract = {
  nextTokenId: async options => {assert.equal(options.blockTag, 123); return 4n;},
  powerAt: async (id, time, options) => {
    assert.equal(time, 456);
    assert.equal(options.blockTag, 123);
    // Closed positions contribute zero, even though their historical record exists.
    return [0n, 300n, 0n, 700n][Number(id)];
  }
};
assert.equal(await readForgePower(contract, block), 1000n);
await assert.rejects(() => readForgePower({...contract, powerAt: async () => {throw Error('RPC failed');}}, block));
assert.equal(await readForgePower({...contract, nextTokenId: async () => 1n}, block), 0n);
console.log('Forge share calculations and same-block read checks passed.');
