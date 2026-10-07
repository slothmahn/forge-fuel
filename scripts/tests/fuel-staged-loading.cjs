const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
(async()=>{for(const chain of ['ethereum','avalanche']){
 const src=fs.readFileSync(`${chain}/${chain}-live.js`,'utf8');let release;const held=new Promise(r=>release=r),events=[];
 const pool={cycleAt:async()=>1n,deadline:async()=>200n,cycleBalance:async()=>4n,cycleMintCount:async()=>1n};
 const el={hidden:false,textContent:''};const ctx={refreshing:false,ready:false,account:null,ended:false,config:{launchTime:100},A:{position:'pos',feeRouter:'router'},state:{positions:[],foundry:[]},vaults:[{days:8,contract:pool}],foundry:{...pool,nextTokenId:async()=>1n},position:{launchTime:async()=>100n,feeReceiver:async()=> 'router',nextTokenId:async()=>{await held;return 1n;}},read:{getBlock:async()=>({timestamp:120,number:500}),getCode:async()=> '0x123'},same:(a,b)=>a===b,syncWalletControls(){},drawBurns:async()=>{events.push('burns');},drawPools:()=>events.push('pools'),drawPositions(){},drawFoundry(){},drawClaims(){},window:{updatePreview(){},[chain+'Quote'](){}},$:()=>el,text(){},message(e){events.push(e);},errorText:e=>e.message,Promise};
 vm.createContext(ctx);const a=src.indexOf('async function chunks('),b=src.indexOf('function drawPools(){',a);vm.runInContext(src.slice(a,b),ctx);
 const task=ctx.refresh();await new Promise(r=>setImmediate(r));assert(events.includes('burns'));assert(events.includes('pools'));assert.equal(ctx.ready,false);release();await task;assert.equal(ctx.ready,true,JSON.stringify(events));assert.equal(ctx.refreshing,false);
 assert(src.includes('createBurnHistoryReader'));assert(!src.includes('await drawBurns(block.number)'));assert(!src.includes('await prices();'));assert(src.includes('Loading share…'));
 console.log(chain+': pools and burns appear while stake history is delayed; readiness still waits for checked data.');
}})().catch(e=>{console.error(e);process.exit(1)});
