import assert from 'node:assert/strict';
import {sortStakeRecords} from '../../assets/stake-sort-model.js';
const records=[{id:5n,created:200n,maturity:500n},{id:2n,created:100n,maturity:300n},{id:4n,created:200n,maturity:300n},{id:1n,created:50n,maturity:100n}];
const ids=mode=>sortStakeRecords(records,mode).map(p=>p.id);
assert.deepEqual(ids('soonest'),[1n,2n,4n,5n]);assert.deepEqual(ids('latest'),[5n,2n,4n,1n]);assert.deepEqual(ids('newest'),[5n,4n,2n,1n]);assert.deepEqual(ids('oldest'),[1n,2n,4n,5n]);assert.deepEqual(ids('invalid'),ids('soonest'));assert.deepEqual(records.map(p=>p.id),[5n,2n,4n,1n]);
assert.deepEqual(sortStakeRecords([{id:1},{id:2,maturity:'10'},{id:3,maturity:'not a timestamp'}]).map(p=>p.id),[2,1,3]);
assert.deepEqual(sortStakeRecords([]),[]);
const large=[{id:'9007199254740993',created:'10',maturity:'9007199254740993'},{id:'9007199254740992',created:'9',maturity:'9007199254740992'}];assert.equal(sortStakeRecords(large)[0].id,'9007199254740992');
console.log('Stake sorting passes: maturity/creation order, ties, stable input, missing data, empty lists and bigint precision.');
