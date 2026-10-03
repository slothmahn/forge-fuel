import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {readPoolSnapshot,readPortfolio,readRewards} from '../../assets/forge-chain-reads.js';
const root=fileURLToPath(new URL('../../',import.meta.url));
const before=name=>execFileSync('git',['show',`ec70ebe:assets/${name}`],{cwd:root,encoding:'utf8'});
const extract=(s,start,end)=>s.slice(s.indexOf(start),s.indexOf(end,s.indexOf(start)+start.length));
const clean=value=>JSON.parse(JSON.stringify(value,(_,v)=>typeof v==='bigint'?v.toString():v));
const equal=(a,b,message)=>assert.deepEqual(clean(a),clean(b),message);
const sameAddress=(a,b)=>a.toLowerCase()===b.toLowerCase();
for(const [name,chainId] of [['mainnet-white-paper-v1.js',4663n],['pulse-mainnet.js',369n]]){
 const old=before(name),now=fs.readFileSync(root+'assets/'+name,'utf8');
 const manifest=JSON.parse(fs.readFileSync(root+(chainId===4663n?'mainnet':'pulsechain')+'-deployment.json'));
 const tokens={fuel:'0x'+'11'.repeat(20),cbbtc:'0x'+'22'.repeat(20),more:'0x'+'33'.repeat(20),pamp:'0x'+'44'.repeat(20)};
 function verification(source,fault=null,latency=0){
  const calls=[];const check=(key,value)=>{calls.push(key);return new Promise(resolve=>setTimeout(()=>resolve(key===fault?(typeof value==='bigint'?value+1n:'0x'+'00'.repeat(20)):value),latency));};
  const c=manifest.contracts,m=manifest;
  const values={position:{owner:m.owner,fuel:tokens.fuel,feeReceiver:c.feeForwarder,dayDuration:86400n},foundry:{owner:m.owner,fuel:tokens.fuel,cbbtc:tokens.cbbtc,development:m.development,launchTime:BigInt(m.launchTime),cycleDuration:288n*86400n,anchorDay:20726n,deadline:1815670800n},feeRouter:{development:m.development,eightDayVault:c.vault8,twentyEightDayVault:c.vault28,eightyEightDayVault:c.vault88,foundryVault:c.foundry,fuelBurner:c.fuelBurner,moreBurner:c.moreBurner,pampBurner:c.pampBurner},feeForwarder:{target:c.feeRouter},settlementBatcher:{foundry:c.foundry,cbbtc:tokens.cbbtc}};
  for(const [key,days,deadline] of [['vault8',8,1791478800],['vault28',28,1793206800],['vault88',88,1798394400]])values[key]={positions:c.position,cycleDuration:BigInt(days*86400),launchTime:BigInt(m.launchTime),anchorDay:20726n,deadline:BigInt(deadline)};
  for(const token of ['fuel','more','pamp'])values[token+'Burner']={owner:m.owner,token:tokens[token],INTERVAL:600n,launchTime:BigInt(m.launchTime),CALLER_REWARD_BPS:150n};
  const Q=key=>new Proxy({}, {get:(_,method)=>method==='getFunction'?name=>(()=>check(key+'.'+name,values[key][name])):(...args)=>{
   if(method==='vaults')return check(key+'.vaults'+args[0],[c.vault8,c.vault28,c.vault88][args[0]]);
   assert(method in values[key],key+'.'+method);return check(key+'.'+method,values[key][method]);
  }});
  const provider={getNetwork:async()=>({chainId:await check('chain',chainId)}),getCode:async address=>{calls.push('code:'+address);return fault==='code:'+address?'0x':'0x6000';}};
  const context=vm.createContext({Z:{provider},Q,Rd:tokens,qd:sameAddress,zd:Object.keys(c),df:{token:[]},Vl:class{constructor(address){return{decimals:()=>check('decimals:'+address,address===tokens.fuel?18n:8n)};}}});
  vm.runInContext(extract(source,'async function hf(', 'async function gf('),context);
  return {promise:context.hf(manifest),calls};
 }
 const verificationStart=performance.now(),baseline=verification(old,null,10),optimized=verification(now,null,10);let verificationBeforeMs,verificationAfterMs;await Promise.all([baseline.promise.then(()=>verificationBeforeMs=performance.now()-verificationStart),optimized.promise.then(()=>verificationAfterMs=performance.now()-verificationStart)]);assert(verificationAfterMs<verificationBeforeMs*.8,'Independent verification checks should overlap');
 assert.deepEqual([...new Set(optimized.calls)].sort(),[...new Set(baseline.calls)].sort(),'Every deployment verification must remain');
 for(const fault of new Set(baseline.calls)){
  await assert.rejects(verification(old,fault).promise,undefined,'Baseline rejects '+fault);
  await assert.rejects(verification(now,fault).promise,undefined,'Optimized rejects '+fault);
 }
 const configs=['vault8','vault28','vault88','foundry'].map((key,i)=>({key,token:i===3?'BTC':'NATIVE'}));
 const calls=[];
 const delay=async(name,value)=>{calls.push(name);await new Promise(r=>setTimeout(r,2));return value;};
 const position={nextTokenId:()=>delay('nextPosition',32n),positions:id=>delay('position',{closedAt:id%4n===0n?5n:0n}),currentPower:id=>delay('power',id*7n),rewardOwner:id=>delay('rewardOwner',id%2n?'alice':'bob'),currentPrincipal:id=>delay('principal',id*100n),powerAt:(id,deadline)=>delay('pastPower',id%5n?90n:0n)};
 const foundry={nextTokenId:()=>delay('nextFoundry',25n),ownerOf:id=>delay('ownerOf',id%3n?'bob':'alice'),tokenCycle:id=>delay('tokenCycle',id%3n+1n)};
 const vaults=configs.map((c,pool)=>({cycleAt:()=>delay('cycle',4n),deadline:cycle=>delay('deadline',100n+cycle*50n),cycles:cycle=>delay('record'+pool,{settled:cycle===1n||cycle===3n,started:false,cursor:2n,upperTokenId:30n,cbbtcBalance:cycle*50n}),cycleBalance:cycle=>delay('balance',cycle*123n),cycleMintCount:()=>delay('mintCount',10n),hasClaimed:(cycle,id)=>delay('claimed',id%7n===0n),claimable:(cycle,id)=>delay('claimable',id*3n)}));
 const state={ready:true,address:'alice',provider:{},block:{timestamp:225},manifest:{launchTime:100},positions:[],foundry:[]};
 const Q=(key,type)=>key==='position'?position:key==='foundry'&&type==='foundry'&&Q.portfolio?foundry:vaults[configs.findIndex(c=>c.key===key)];
 const context=vm.createContext({Z:state,Q,qd:sameAddress,Cf:configs,Promise});
 vm.runInContext(extract(old,'async function Nf(', 'async function Pf(')+extract(old,'async function If(', 'async function Lf(')+extract(old,'async function Lf(', 'async function Rf('),context);
 const oldPools=[];for(const config of configs)oldPools.push(await context.Nf(config));
 const newPools=await Promise.all(configs.map((c,i)=>readPoolSnapshot(vaults[i],c,state.block,100)));
 equal(newPools,oldPools,'Pool values and progress must match');state.pools=oldPools;
 Q.portfolio=true;let start=performance.now();await context.If();const oldMs=performance.now()-start;
 start=performance.now();const portfolio=await readPortfolio(position,foundry,'alice',sameAddress);const newMs=performance.now()-start;
 equal(portfolio,{positions:state.positions,foundry:state.foundry,allPower:state.allPower,portfolioComplete:state.portfolioComplete},'Active/ended NFTs, ownership, principal and total power');
 Q.portfolio=false;start=performance.now();await context.Lf();const oldRewardsMs=performance.now()-start;start=performance.now();
 const rewards=await readRewards({pools:newPools,configs,getVault:key=>vaults[configs.findIndex(c=>c.key===key)],position,...portfolio,address:'alice'});
 const newRewardsMs=performance.now()-start;equal(rewards,{claims:state.claims,settlements:state.settlements,claimScanComplete:state.claimScanComplete},'Claim records, eligibility and settlement ordering');
 const disconnected=await readRewards({pools:newPools,configs,getVault:key=>vaults[configs.findIndex(c=>c.key===key)],position,positions:[],foundry:[],address:null,portfolioComplete:false});
 assert.equal(disconnected.claims.length,0);assert.equal(disconnected.claimScanComplete,false);equal(disconnected.settlements,rewards.settlements);
 await assert.rejects(readPortfolio({...position,rewardOwner:async()=>{throw Error('RPC unavailable');}},foundry,'alice',sameAddress),/RPC unavailable/);
 console.log(JSON.stringify({chain:Number(chainId),verificationChecksPreserved:new Set(baseline.calls).size,allCorruptionsRejected:true,poolsMatch:true,portfolioMatches:true,claimsMatch:true,incompleteScanRejected:true,verificationBeforeMs:Math.round(verificationBeforeMs),verificationAfterMs:Math.round(verificationAfterMs),rewardsBeforeMs:Math.round(oldRewardsMs),rewardsAfterMs:Math.round(newRewardsMs)}));
}
