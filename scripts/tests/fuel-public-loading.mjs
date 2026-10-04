import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync(new URL('../../assets/mainnet-white-paper-v1.js',import.meta.url),'utf8');
const extract=(start,end)=>source.slice(source.indexOf(start),source.indexOf(end,source.indexOf(start)));
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject};};
const tick=()=>new Promise(resolve=>setImmediate(resolve));
for(const fails of [false,true]){
 const verification=deferred(),reads=deferred(),events=[];
 const state={ready:false,block:null};
 const ctx=vm.createContext({Z:state,fetch:async()=>({ok:true,json:async()=>({contracts:{}})}),Vd:()=>[],tf:()=>{},of:{},hf:()=>verification.promise,Rf:()=>{events.push('reads started');return reads.promise;},cf:()=>{},pf:()=>{events.push(state.ready?'actions eligible':'actions locked');},xf:()=>events.push('fees'),uf:()=>{},Zd:String,_f:()=>events.push('cleared'),forgeSharePreview:{refresh:()=>{}},Error,isTemporaryRpcFailure:()=>false});
 vm.runInContext(extract('let fuelPublicReadsAllowed=false;','function _f()'),ctx);
 const pending=ctx.gf();await tick();
 assert(events.includes('reads started'),'Public reads begin without waiting for verification');
 assert.equal(state.ready,false,'Wallet actions stay gated during verification');
 if(fails)verification.reject(Error('Wrong owner'));else verification.resolve();
 await tick();
 if(fails){await pending;assert.equal(vm.runInContext('fuelPublicReadsAllowed',ctx),false);assert(events.includes('cleared'));assert.equal(state.ready,false);}else{assert.equal(state.ready,true);reads.resolve();await pending;}
 reads.resolve();
}
const wallet=deferred(),rewards=deferred(),events=[];
const provider={getBlock:async()=>({timestamp:100}),getBalance:()=>wallet.promise};
const Z={ready:true,provider,address:'wallet',pools:[],prices:{},manifest:{}};
const ctx=vm.createContext({Z,fuelPublicReadsAllowed:false,Promise,Error,Cf:[{}, {}, {}, {}],wf:[],Nf:async()=>({balance:1n}),Pf:()=>{},pf:()=>{},forgeSharePreview:{refresh:()=>{}},Vf:()=>{},Ff:()=>{},J:()=>({}),Rd:{},df:{},Vl:class{balanceOf(){return wallet.promise;}},If:()=>wallet.promise,Y:()=>{},X:String,Bf:()=>events.push('pools rendered'),bf:()=>{},Lf:()=>{events.push('reward scan');return rewards.promise;},Hf:()=>{},Uf:()=>{},Af:()=>{},Wf:()=>{},xf:()=>{},uf:()=>{}});
vm.runInContext(extract('async function zf(){','function Bf()'),ctx);
const pending=ctx.zf();await tick();assert(events.includes('pools rendered'),'Pools render before slow wallet balances');assert(!events.includes('reward scan'));
wallet.resolve(0n);await tick();assert(events.includes('reward scan'));rewards.resolve();await pending;
assert(source.includes('if(!Z.ready||!Z.signer'),'Transaction readiness guard remains');
console.log('Public loading overlaps verification; failed verification clears reads; pools render before wallet history; transaction guard preserved.');
