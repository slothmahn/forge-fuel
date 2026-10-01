import assert from 'node:assert/strict';
import {estimateEntryFunding, estimateForgeShare, estimateForgePayout, estimateTermPayout, estimateFoundryRewards, readForgePower} from '../../assets/forge-share-preview.js';

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

assert.deepEqual(estimateFoundryRewards(1,9n,10000n),{share:'10.00%',payout:997n});
assert.deepEqual(estimateFoundryRewards(10,0n,10000n),{share:'100.00%',payout:9975n});
assert.equal(estimateFoundryRewards(11,0n,10000n),null);
assert.equal(estimateFoundryRewards(1,undefined,0n),null);
assert.equal(estimateFoundryRewards(1,-1n,0n),null);
assert.equal(estimateFoundryRewards(1,9n,0n).payout,0n);
console.log('Foundry quantity, dilution, net cycle rewards and unavailable states passed.');

const fee=549008221588729377n;
const added=estimateEntryFunding(fee,[1312n,1107n,861n]);
assert.deepEqual(added,[fee*1312n/10000n,fee*1107n/10000n,fee*861n/10000n]);
assert.equal(estimateEntryFunding(null,[1312n,1107n,861n]),null);
const base=estimateForgePayout(10000n,100n,900n);
const funded=estimateForgePayout(10000n+added[0],100n,900n);
assert(funded>base);
assert.deepEqual(estimateTermPayout(base,1000,8,funded-base),{cycles:125,amount:base*125n+funded-base});
assert.deepEqual(estimateTermPayout(base,8,88,funded-base),{cycles:0,amount:0n});
assert.equal(estimateForgeShare(100n,900n),'10.00%');
console.log('Entry fee routing and one-time term funding checks passed.');
