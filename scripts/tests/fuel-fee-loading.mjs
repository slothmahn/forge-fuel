import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const root=fileURLToPath(new URL('../../',import.meta.url));
const extract=s=>s.slice(s.indexOf('async function xf('),s.indexOf('J(`#foundry-quantity`).addEventListener',s.indexOf('async function xf(')));
function setup(source,{failForge=false,failFoundry=false,holdOld=false}={}){
 const fields={},inputs={principal:'100',quantity:'1'},waiters=[];
 const context=vm.createContext({Z:{ready:true},J:s=>({value:s==='#forge-principal'?inputs.principal:inputs.quantity}),gt:BigInt,X:String,_t:String,Y:(key,value)=>fields[key]=value,pf(){},forgeSharePreview:{render(){}},estimateEntryFunding:(fee,allocations)=>allocations.map(bps=>fee*bps/10000n),Q:key=>key==='feeRouter'?{EIGHT_DAY_BPS:async()=>3000n,TWENTY_EIGHT_DAY_BPS:async()=>2000n,EIGHTY_EIGHT_DAY_BPS:async()=>1000n}:key==='position'?{requiredFee:async amount=>{if(holdOld&&amount===100n)await new Promise(r=>waiters.push(r));if(failForge)throw Error('PoolPricesDisagree');return amount*10n;}}:{requiredMintFee:async qty=>{if(failFoundry)throw Error('Quote unavailable');return BigInt(qty)*100n;}}});
 vm.runInContext('let foundryQuoteVersion=0,forgeEntryFunding=null;'+extract(source),context);
 return {context,fields,inputs,waiters,result:()=>({fields:{...fields},ready:{...context.Z},funding:vm.runInContext('forgeEntryFunding?.map(String)',context)})};
}
const normalize=v=>JSON.parse(JSON.stringify(v));
for(const name of ['mainnet-white-paper-v1.js','pulse-mainnet.js']){
 const old=execFileSync('git',['show','ec70ebe:assets/'+name],{cwd:root,encoding:'utf8'}),current=fs.readFileSync(root+'assets/'+name,'utf8');
 for(const options of [{},{failForge:true},{failFoundry:true},{failForge:true,failFoundry:true}]){
  const a=setup(old,options),b=setup(current,options);await Promise.all([a.context.xf(),b.context.xf()]);assert.deepEqual(normalize(a.result()),normalize(b.result()),'Same fee displays and paused states');
 }
 const race=setup(current,{holdOld:true}),first=race.context.xf();
 race.inputs.principal='200';race.inputs.quantity='2';await race.context.xf();race.waiters.forEach(resolve=>resolve());await first;
 assert.match(race.fields['#preview-fee'],/^2000 /);assert.match(race.fields['#foundry-fee'],/^200 /);
 assert.equal(race.context.Z.forgeFeeReady,true);assert.equal(race.context.Z.foundryFeeReady,true);
 console.log(name+': fee values, independent failures, price checks, and stale-input race passed');
}
