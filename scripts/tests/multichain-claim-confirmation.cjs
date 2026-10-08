const fs=require('fs'),vm=require('vm'),assert=require('assert/strict');
(async()=>{
 for(const chain of ['ethereum','avalanche']){
  const source=fs.readFileSync(`${chain}/${chain}-live.js`,'utf8');
  for(const [selector,prefix,stateKey] of [['#claim-all',"$('#claim-all').onclick=",'claims'],['#settle-available',"$('#settle-available').onclick=",'settlements']]){
   const start=source.indexOf(prefix),end=source.indexOf('\n',start);assert(start>=0);const handler=source.slice(start,end);const el={};
   for(const count of [1,2,4])for(const proceed of [true,false]){
    let prompts=0,sent=0;
    const ctx={$:s=>{assert.equal(s,selector);return el;},state:{[stateKey]:Array.from({length:count},()=>({contract:{},pool:{days:8,contract:{}},cycle:1n,id:1n}))},action:fn=>fn(),send:async()=>sent++,window:{confirm:text=>{prompts++;assert(text.includes(`${count} wallet confirmations`));return proceed;}}};
    vm.runInNewContext(handler,ctx);await el.onclick();assert.equal(prompts,count>1?1:0);assert.equal(sent,count===1||proceed?count:0);
   }
  }
  console.log(chain+': claims and settlements skip single-transaction confirmation and honor multi-transaction cancellation.');
 }
 const source=fs.readFileSync('moreforge/live-v2.js','utf8');const handler=source.slice(source.indexOf("$('#claim-open').onclick="),source.indexOf("$('#settle-due').onclick="));assert(!handler.includes('confirm('));assert(handler.includes('helperAbi,s).claim(items)'));assert(handler.includes('slice(0,20)'));
 console.log('MORE Forge: all four chains use the same single-transaction batched claim handler without an extra popup.');
})().catch(e=>{console.error(e);process.exit(1)});
