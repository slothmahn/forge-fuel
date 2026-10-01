import assert from 'node:assert/strict';
import {estimateForgeShare, estimateForgePayout, estimateTermPayout, readForgePower} from '../../assets/forge-share-preview.js';

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

// Payouts use the proposed share including the new position and net settlement funding.
assert.equal(estimateForgePayout(10000n,100n,900n),997n);
assert.equal(estimateForgePayout(10000n,100n,0n),9975n);
assert.equal(estimateForgePayout(0n,100n,900n),0n);
assert.equal(estimateForgePayout(undefined,100n,900n),null);
assert.equal(estimateForgePayout(10000n,0n,900n),null);
assert.equal(estimateForgePayout(-1n,100n,900n),null);
console.log('Current-pool payout calculations, settlement deduction and unavailable states passed.');

assert.deepEqual(estimateTermPayout(100n,1000,8),{cycles:125,amount:12500n});
assert.deepEqual(estimateTermPayout(100n,1000,28),{cycles:35,amount:3500n});
assert.deepEqual(estimateTermPayout(100n,1000,88),{cycles:11,amount:1100n});
assert.deepEqual(estimateTermPayout(100n,8,88),{cycles:0,amount:0n});
assert.equal(estimateTermPayout(null,1000,8),null);
assert.equal(estimateTermPayout(100n,1001,8),null);
assert.equal(estimateTermPayout(100n,88.5,8),null);
console.log('Term scenarios and complete-cycle counts passed.');
