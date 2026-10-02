import assert from 'node:assert/strict';
import {readPositions,readPool,readClaims} from '../../moreforge/chain-data.js';
const options={blockTag:77},calls=[];
const tracked=(name,fn)=>async(...args)=>{assert.deepEqual(args.at(-1),options);calls.push(name);await new Promise(r=>setTimeout(r,8));return fn(...args);};
const vault=i=>({
 cycleAt:tracked('cycleAt'+i,()=>4n),
 deadline:tracked('deadline'+i,c=>1000n+c),
 cycleBalance:tracked('balance'+i,c=>c===2n?0n:BigInt(i+1)*100n),
 nativeCycleBalance:tracked('native'+i,c=>c===2n?50n:80n),
 cycles:tracked('cycles'+i,c=>({settled:c===1n})),
 claimable:tracked('claim'+i,(c,id)=>id===1n?BigInt(i+1)*10n:0n)
});
const vs=Array.from({length:4},(_,i)=>vault(i)),quote=tracked('quote',()=>23n);
const sequentialStart=performance.now(),sequential=[];
for(let i=0;i<4;i++)sequential.push(await readPool(vs[i],i,1000,options,quote));
const sequentialMs=performance.now()-sequentialStart,start=performance.now();
const parallel=await Promise.all(vs.map((v,i)=>readPool(v,i,1000,options,quote)));
const parallelMs=performance.now()-start;
assert.deepEqual(parallel,sequential,'Parallel reads must preserve pool order and amounts');
assert(parallelMs<sequentialMs*.6,'Independent pools should overlap');
assert.deepEqual(parallel.map(r=>r.due),[[0,3n,15],[1,3n,15],[2,3n,15],[3,2n,15]],'Oldest funded cycle, including native Bitcoin funding');
assert.equal(parallel[3].pool.btcQuote,23n);
assert.equal(calls.filter(c=>c==='quote').length,2,'Only Bitcoin funding is quoted');
const saved=new Map(),position={positions:tracked('position',id=>({burned:id*10n,initialPower:id*20n,createdAt:1n,maturity:999999999n}))};
let positions=await readPositions(position,4n,saved,options);assert.equal(positions.length,3);
const reads=calls.filter(c=>c==='position').length;
positions=await readPositions(position,4n,saved,options);assert.equal(calls.filter(c=>c==='position').length,reads,'Immutable positions are reused');
assert.equal((await readPositions(position,3n,saved,options)).length,2,'Cache must not leak positions newer than the selected block');
const deadline=8n*86400n;
const owned=[{id:1n,created:1n,maturity:deadline},{id:2n,created:1n,maturity:deadline+1n},{id:3n,created:deadline,maturity:deadline+1n},{id:4n,created:1n,maturity:deadline-1n}];
const claims=await readClaims(vs[0],parallel[0],owned,0,options);
assert.deepEqual(claims,[{pool:0,cycle:1n,id:1n,value:10n}],'Deadline equality, late entrants, expiry and zero claims remain correct');
assert.deepEqual(await readClaims(vs[0],parallel[0],[],0,options),[]);
console.log(JSON.stringify({checks:'pool ordering, funding, Bitcoin quote, exact claims, deadline boundaries, immutable cache and pinned block',sequentialMs:Math.round(sequentialMs),parallelMs:Math.round(parallelMs)}));
