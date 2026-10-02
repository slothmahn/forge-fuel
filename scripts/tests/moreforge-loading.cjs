const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
const {Interface}=await import('../../moreforge/vendor/ethers-6.15.0.js');
const {burnAbi}=await import('../../moreforge/burn-ui.js');const {displayAmount}=await import('../../moreforge/amounts.js');
const manifests=JSON.parse(fs.readFileSync(path.join(__dirname,'../../moreforge/deployments.json')));
const burner=new Interface(burnAbi),fault=new Interface(['error StaleOrInvalidQuote()']);
const position=new Interface(['function nextTokenId() view returns(uint256)','function requiredFee(uint256) view returns(uint256)','function previewPower(uint256,uint256) view returns(uint256)']);
const vault=new Interface(['function cycleAt(uint256) view returns(uint256)','function deadline(uint256) view returns(uint256)','function cycleBalance(uint256) view returns(uint256)','function nativeCycleBalance(uint256) view returns(uint256)']);
const token=new Interface(['function balanceOf(address) view returns(uint256)']);
const quote=new Interface(['function quote(uint256) view returns(uint256,uint256)']);
const v2=new Interface(['function getAmountsOut(uint256,address[]) view returns(uint256[])']);
const v4=new Interface(['function quoteExactInputSingle(tuple(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256 amountOut,uint256 gasEstimate)']);
const out=11948489864012345678n,balance=172524589043392884803493n;
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const results=[];
try{for(const key of ['rh','pls']){for(const version of ['before','after','after-burn-failure']){
 const m=manifests[key],launch=Number(m.launchTime),now=launch+50*600,owner=m.owner,other='0x1111111111111111111111111111111111111111',head=m.deploymentBlock+100;
 const block={number:'0x'+head.toString(16),hash:'0x'+'11'.repeat(32),parentHash:'0x'+'22'.repeat(32),timestamp:'0x'+now.toString(16),nonce:'0x0000000000000000',difficulty:'0x0',gasLimit:'0x1c9c380',gasUsed:'0x0',miner:owner,extraData:'0x',transactions:[],baseFeePerGas:'0x1'};
 function rpc(j){let result;switch(j.method){
 case 'eth_chainId':result='0x'+m.chainId.toString(16);break;case 'eth_blockNumber':result=block.number;break;case 'eth_getBlockByNumber':result=block;break;case 'eth_getCode':result='0x6000';break;case 'eth_getBalance':result='0x'+balance.toString(16);break;case 'eth_gasPrice':case 'eth_maxPriorityFeePerGas':result='0x174876e800';break;case 'eth_estimateGas':result='0x493e0';break;
 case 'eth_getLogs':{const q=j.params[0],i=m.burners.findIndex(v=>v.toLowerCase()===q.address.toLowerCase()),n=m.deploymentBlock+90;if(Number(q.fromBlock)<=n&&Number(q.toBlock)>=n){const event=burner.encodeEventLog(burner.getEvent('Executed'),[owner,5,10000,150,9850,BigInt(i+1)*10n**18n]);result=[{address:q.address,...event,blockNumber:'0x'+n.toString(16),blockHash:block.hash,transactionHash:'0x'+'33'.repeat(32),transactionIndex:'0x0',logIndex:'0x0',removed:false}];}else result=[];break;}
 case 'eth_call':{const to=j.params[0].to.toLowerCase(),data=j.params[0].data;let iface,values;
 if(to===m.position.toLowerCase()){iface=position;const f=iface.parseTransaction({data});values=f.name==='nextTokenId'?[1n]:f.name==='requiredFee'?[10n**15n]:[f.args[0]*5n];}
 else if(m.vaults.some(v=>v.toLowerCase()===to)){iface=vault;const i=m.vaults.findIndex(v=>v.toLowerCase()===to),f=iface.parseTransaction({data});values=f.name==='cycleAt'?[1n]:f.name==='deadline'?[BigInt(launch+[8,28,88,288][i]*86400)]:[0n];}
 else if(m.burners.some(v=>v.toLowerCase()===to)){iface=burner;const i=m.burners.findIndex(v=>v.toLowerCase()===to),f=iface.parseTransaction({data});if(f.name==='execute'&&i===1)return{jsonrpc:'2.0',id:j.id,error:{code:3,message:'execution reverted',data:fault.encodeErrorResult('StaleOrInvalidQuote',[])}};
 values=f.name==='owner'?[owner]:f.name==='dailyPoolBps'?[100n]:f.name==='maxSwapEth'?[10n**15n]:f.name==='maxSlippageBps'?[1000n]:f.name==='launchTime'?[BigInt(launch)]:f.name==='INTERVAL'?[600n]:f.name==='currentInterval'?[50n]:f.name==='lastExecutedInterval'?[i===2?50n:45n]:f.name==='executableAmount'?[i===2?0n:10n**16n]:[10n**18n];}
 else if(to===m.contracts.mainQuote.toLowerCase()){iface=quote;values=[1000n*10n**18n,BigInt(now)];}
 else if(to==='0x165c3410fc91ef562c50559f7d2289febed552d9'){iface=v2;values=[[1n,out]];}
 else if(to==='0x8dc178efb8111bb0973dd9d722ebeff267c98f94'){iface=v4;values=[out,100000n];}
 else{iface=token;values=[1000000000000123456789012345678n];}
 const parsed=iface.parseTransaction({data});if(!parsed){console.log('Unmocked quote',to,data);return{jsonrpc:'2.0',id:j.id,error:{code:3,message:'quote not available in test'}};}result=iface.encodeFunctionResult(parsed.name,values);break;}
 default:throw Error('Unexpected public RPC '+j.method);}
 return{jsonrpc:'2.0',id:j.id,result};}

 const c=await b.newContext({viewport:{width:390,height:844}});
 const p=await c.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.route('**/deployments.json',r=>r.fulfill({json:Object.fromEntries(Object.entries(manifests).map(([k,v])=>[k,{...v,rpc:'https://more-burn-test.invalid/rpc'}]))}));
 if(version==='before')await p.route('**/live.js?*',r=>r.fulfill({contentType:'text/javascript',body:require('child_process').execFileSync('git',['show','e3ed39a:moreforge/live.js'],{cwd:path.join(__dirname,'../..'),encoding:'utf8'})}));
 await p.route('https://more-burn-test.invalid/rpc',async r=>{
   const j=r.request().postDataJSON();await new Promise(resolve=>setTimeout(resolve,160));
   const reply=item=>version==='after-burn-failure'&&item.method==='eth_call'&&m.burners.some(a=>a.toLowerCase()===item.params[0].to.toLowerCase())?{jsonrpc:'2.0',id:item.id,error:{code:-32603,message:'Burner temporarily unavailable'}}:rpc(item);
   await r.fulfill({json:Array.isArray(j)?j.map(reply):reply(j)});
 });
 await p.route('https://api.dexscreener.com/**',r=>r.fulfill({json:{pairs:[]}}));
 await p.addInitScript(()=>{window.__loadTimes={};new MutationObserver(()=>{
   const checks={buy:()=>{const e=document.querySelector('#buy-amount');if(e?.disabled)window.__buyWasDisabled=true;return window.__buyWasDisabled&&e&&!e.disabled;},pools:()=>document.querySelector('#pool-cards')?.children.length===4,burns:()=>document.querySelector('#burn-cards')?.children.length===3};
   for(const [key,check] of Object.entries(checks))if(!window.__loadTimes[key]&&check())window.__loadTimes[key]=performance.now();
 }).observe(document,{subtree:true,attributes:true,childList:true});});
 await p.goto('http://127.0.0.1:18771/?chain='+key+'#pools');
 if(version==='after-burn-failure')await p.waitForFunction(()=>window.__loadTimes.pools&&document.querySelector('#burn-overview').textContent.includes('temporarily unavailable'));
 else await p.waitForFunction(()=>Object.keys(window.__loadTimes).length===3);
 await p.waitForFunction(()=>document.querySelector('#native-fee').textContent.includes(' '+(document.querySelector('#chain').value==='rh'?'ETH':'PLS')));
 if(version==='after-burn-failure')assert.equal(await p.locator('[data-execute]').count(),0,'Failed burner reads must not leave actionable stale buttons');
 const timing=await p.evaluate(()=>window.__loadTimes);
 const cards=await p.locator('#pool-cards').textContent();
 assert.equal(await p.locator('#pool-cards .pool-card').count(),4);assert.deepEqual(errors,[]);
 results.push({chain:key,version,...Object.fromEntries(Object.entries(timing).map(([k,v])=>[k,Math.round(v)])),cards});
 await c.close();
 }}
 for(const key of ['rh','pls']){
  const before=results.find(r=>r.chain===key&&r.version==='before'),after=results.find(r=>r.chain===key&&r.version==='after');
  assert.equal(results.find(r=>r.chain===key&&r.version==='after-burn-failure').cards,before.cards,'A burner failure must not block or change payout data');
  assert.equal(after.cards,before.cards,'Identical pool values, deadlines, estimates and actions');
  assert(after.pools<before.pools*.8,'Pool loading should improve under the same RPC latency');
  assert(after.buy<before.buy*.5,'Buy form should be ready independently');
 }
 console.log(JSON.stringify(results.map(({cards,...r})=>r),null,2));
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
