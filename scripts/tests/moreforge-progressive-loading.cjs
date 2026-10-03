const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const source=fs.readFileSync('moreforge/live-v2.js','utf8');
const functionSource=name=>{const start=source.indexOf(`async function ${name}(`),end=source.indexOf('\nasync function ',start+1);return source.slice(start,end);};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return{promise,resolve};};
const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{
 const m={position:'position',helper:'helper',owner:'owner',more:'more',bitcoinToken:'btc',launchTime:100,contracts:{feeQuote:'quote',feeRouter:'router'},vaults:['v0','v1','v2','v3'],burners:['b0','b1','b2']};
 const fields=['eightDayVault','twentyEightDayVault','eightyEightDayVault','bitcoinVault','fuelBurner','moreBurner','pampBurner','development'];
 async function verification(bad){
  const gate=deferred(),started=[];
  const read=(label,value)=>()=>{started.push(label);return gate.promise.then(()=>bad===label?'wrong':value)};
  const p={};Object.entries({name:'MORE Forge Position V2',owner:m.owner,more:m.more,priceOracle:m.contracts.feeQuote,feeReceiver:m.contracts.feeRouter,dayDuration:86400n}).forEach(([k,v])=>p[k]=read(k,v));
  const router={};fields.forEach((k,i)=>router[k]=read(k,[...m.vaults,...m.burners,m.owner][i]));
  const x={m,r:{getCode:read('code','0x123')},position:p,helper:{bitcoin:read('helperBitcoin',m.vaults[3]),vaults:i=>read('helperVault'+i,m.vaults[i])()},vaults:m.vaults.map((_,i)=>({positions:read('vaultPosition'+i,m.position),launchTime:read('anchor'+i,m.launchTime),cycleDuration:read('duration'+i,[8,28,88,288][i]*86400),rewardToken:read('rewardToken',m.bitcoinToken)}))};
  const env={Contract:function(){return router},DAY:86400n,same:(a,b)=>a===b};vm.createContext(env);vm.runInContext(functionSource('verify'),env);
  const run=env.verify(x);assert(started.includes('development')&&started.includes('helperVault2')&&started.includes('rewardToken'),'All independent identity and routing reads start together');gate.resolve();return run;
 }
 await verification();for(const bad of ['owner','helperVault2','rewardToken','development'])await assert.rejects(verification(bad),/mismatch|verification failed/i);
 const market=deferred(),forge=deferred(),updates=[];let refreshed=0;
 const loadEnv={busy:false,epoch:0,previewId:0,ctx:null,review:null,positionReview:null,quotes:{},networks:{rh:{id:4663,rpc:'fixture',unit:'ETH',btc:'cbBTC'}},legacy:{rh:{more:'more',contracts:{mainQuote:'market'}}},manifests:{rh:{...m,status:'deployed'}},$:()=>({value:'rh'}),$$:()=>[],clearReferences:()=>{},document:{},pending:()=>{},updateLinks:()=>{},buy:{update:()=>updates.push({ready:loadEnv.ctx?.ready,forgeReady:loadEnv.ctx?.forgeReady})},disable:()=>{},text:()=>{},window:{dispatchEvent:()=>{}},Event:function(){},JsonRpcProvider:function(){return{getCode:()=>market.promise}},Contract:function(){return{}},erc20:[],positionAbi:[],vaultAbi:[],burnAbi:[],helperAbi:[],validateManifest:()=>{},verify:()=>forge.promise,refresh:async()=>{refreshed++},preview:async()=>{},status:()=>{},error:e=>e.message};
 vm.createContext(loadEnv);vm.runInContext(functionSource('load'),loadEnv);const loading=loadEnv.load();market.resolve('0x123');await tick();assert.equal(loadEnv.ctx.ready,true,'Market is available without waiting for Forge verification');assert.equal(loadEnv.ctx.forgeReady,false);assert.equal(refreshed,0);forge.resolve();await loading;assert.equal(loadEnv.ctx.forgeReady,true);assert.equal(refreshed,1);
 const lateMarket=deferred();loadEnv.JsonRpcProvider=function(){return{getCode:()=>lateMarket.promise}};loadEnv.verify=async()=>{throw Error('Contract verification failed.')};await loadEnv.load();assert.equal(loadEnv.ctx.ready,false);lateMarket.resolve('0x123');await tick();assert.equal(loadEnv.ctx.ready,false,'Late market read cannot restore readiness after verification failed');
 const policy=deferred(),pools=deferred(),positions=deferred(),claims=deferred();let poolStarted=0,previewed=0;const paints=[];
 const x={r:{getBlock:async()=>({timestamp:100,number:25})},token:{balanceOf:async()=>10n},forgeReady:true,position:{},vaults:[0,1,2,3],m:{launchTime:100},dataLoaded:false};
 Object.entries({entriesPaused:false,feeBps:10000n,feeBoundsEnabled:true,minFeeWei:1n,maxFeeWei:100n,nextTokenId:2n,owner:'owner'}).forEach(([k,v])=>x.position[k]=async()=>{await policy.promise;return v});
 const env={ctx:x,epoch:0,account:'wallet',text:()=>{},display:String,readPool:async(v,i,now,o)=>{poolStarted++;assert.equal(o.blockTag,25);await pools.promise;return{pool:{i},due:null}},readV2Positions:async()=>{await positions.promise;return[{owner:'wallet'}]},readV2Claims:async()=>{await claims.promise;return[]},same:(a,b)=>a===b,paintPools:(x,a,ready=true)=>paints.push(ready),preview:async()=>{previewed++},renderRewards:()=>{},renderPositions:()=>{},renderBurns:async()=>{},status:()=>{},buy:{update:()=>{}},refreshReferences:()=>{},document:{},quotes:{},disable:()=>{},error:e=>e.message};
 vm.createContext(env);vm.runInContext(functionSource('readChain'),env);const run=env.readChain(x);await tick();assert.equal(poolStarted,4,'Pool reads start before fee policy finishes');
 policy.resolve();await tick();assert.equal(previewed,1,'Fee preview starts before history finishes');assert.equal(x.dataLoaded,false);
 pools.resolve();await tick();assert.deepEqual(paints,[false],'Balances paint before positions and claims finish');assert.equal(x.dataLoaded,false);
 positions.resolve();await tick();assert.equal(x.dataLoaded,false,'Entries stay disabled until all mutable data is loaded');claims.resolve();await run;assert.equal(x.dataLoaded,true);assert.deepEqual(paints,[false,true]);
 console.log('PASS: concurrent verification preserves identity/routing failures; pools and fees render independently; entry readiness waits for complete data.');
})().catch(e=>{console.error(e);process.exitCode=1});
