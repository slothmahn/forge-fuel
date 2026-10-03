import assert from 'node:assert/strict';
import {estimateTermRewards,estimateCurrentReward} from '../../moreforge/term-rewards.js';
const input={days:88,power:100n,existingPower:900n,fee:10000n,pools:[8,28,88,288].map((days,i)=>({i,days,balance:1000000n})),bitcoinEntry:1680n};
let rows=estimateTermRewards(input);
assert.deepEqual(rows.map(p=>p.cycles),[11,3,1,0]);
// At 10% share: existing payout 99,750 per cycle, plus entry contribution once.
assert.equal(rows[0].amount,99750n*11n+268n);
assert.equal(rows[1].amount,99750n*3n+226n);
assert.equal(rows[2].amount,99926n);
assert.equal(rows[3].amount,0n);
rows=estimateTermRewards({...input,days:1000});
assert.deepEqual(rows.map(p=>p.cycles),[125,35,11,3]);
assert.equal(rows[3].amount,99750n*3n+167n);
assert.equal(estimateTermRewards({...input,days:288,bitcoinEntry:null})[3].amount,null);
assert.equal(estimateTermRewards({...input,bitcoinEntry:null})[3].amount,0n);
assert.equal(estimateTermRewards({...input,days:288,pools:input.pools.map(p=>({...p,balance:0n})),existingPower:0n})[3].amount,1676n);
assert.throws(()=>estimateTermRewards({...input,days:7}));
console.log('Term cycle counts, single entry contribution, four pools, settlement deduction and unavailable Bitcoin checks passed.');

assert.equal(estimateCurrentReward({balance:1000000n,entry:2688n,power:100n,existingPower:900n}),100018n);
assert.equal(estimateCurrentReward({balance:1000000n,entry:null,power:100n,existingPower:900n}),null);
assert.equal(estimateCurrentReward({balance:1000000n,entry:null,power:0n,existingPower:0n}),0n);
