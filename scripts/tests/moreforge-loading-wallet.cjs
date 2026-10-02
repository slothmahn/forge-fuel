const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert');
(async()=>{
const {Interface}=await import('../../moreforge/vendor/ethers-6.15.0.js');
const {burnAbi}=await import('../../moreforge/burn-ui.js');const {displayAmount}=await import('../../moreforge/amounts.js');
const manifests=JSON.parse(fs.readFileSync(path.join(__dirname,'../../moreforge/deployments.json')));
const burner=new Interface(burnAbi),fault=new Interface(['error StaleOrInvalidQuote()']);
const position=new Interface(['function nextTokenId() view returns(uint256)','function requiredFee(uint256) view returns(uint256)','function previewPower(uint256,uint256) view returns(uint256)','function positions(uint256) view returns(uint256 burned,uint256 initialPower,uint256 createdAt,uint256 maturity)','function ownerOf(uint256) view returns(address)']);
const vault=new Interface(['function cycleAt(uint256) view returns(uint256)','function deadline(uint256) view returns(uint256)','function cycleBalance(uint256) view returns(uint256)','function nativeCycleBalance(uint256) view returns(uint256)']);
const token=new Interface(['function balanceOf(address) view returns(uint256)']);
const quote=new Interface(['function quote(uint256) view returns(uint256,uint256)']);
const v2=new Interface(['function getAmountsOut(uint256,address[]) view returns(uint256[])']);
const v4=new Interface(['function quoteExactInputSingle(tuple(tuple(address currency0,address currency1,uint24 fee,int24 tickSpacing,address hooks) poolKey,bool zeroForOne,uint128 exactAmount,bytes hookData)) returns(uint256 amountOut,uint256 gasEstimate)']);
const out=11948489864012345678n,balance=172524589043392884803493n;
const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});const results=[];
try{for(const key of ['rh','pls']){
 const m=manifests[key],launch=Number(m.launchTime),now=launch+50*600,owner=m.owner,other='0x1111111111111111111111111111111111111111',head=m.deploymentBlock+100;
 const block={number:'0x'+head.toString(16),hash:'0x'+'11'.repeat(32),parentHash:'0x'+'22'.repeat(32),timestamp:'0x'+now.toString(16),nonce:'0x0000000000000000',difficulty:'0x0',gasLimit:'0x1c9c380',gasUsed:'0x0',miner:owner,extraData:'0x',transactions:[],baseFeePerGas:'0x1'};
 function rpc(j){let result;switch(j.method){
 case 'eth_chainId':result='0x'+m.chainId.toString(16);break;case 'eth_blockNumber':result=block.number;break;case 'eth_getBlockByNumber':result=block;break;case 'eth_getCode':result='0x6000';break;case 'eth_getBalance':result='0x'+balance.toString(16);break;case 'eth_gasPrice':case 'eth_maxPriorityFeePerGas':result='0x174876e800';break;case 'eth_estimateGas':result='0x493e0';break;
 case 'eth_getLogs':{const q=j.params[0],i=m.burners.findIndex(v=>v.toLowerCase()===q.address.toLowerCase()),n=m.deploymentBlock+90;if(Number(q.fromBlock)<=n&&Number(q.toBlock)>=n){const event=burner.encodeEventLog(burner.getEvent('Executed'),[owner,5,10000,150,9850,BigInt(i+1)*10n**18n]);result=[{address:q.address,...event,blockNumber:'0x'+n.toString(16),blockHash:block.hash,transactionHash:'0x'+'33'.repeat(32),transactionIndex:'0x0',logIndex:'0x0',removed:false}];}else result=[];break;}
 case 'eth_call':{const to=j.params[0].to.toLowerCase(),data=j.params[0].data;let iface,values;
 if(to===m.position.toLowerCase()){iface=position;const f=iface.parseTransaction({data});values=f.name==='nextTokenId'?[2n]:f.name==='positions'?[1000n,5000n,BigInt(launch),BigInt(launch+1000*86400)]:f.name==='ownerOf'?[owner]:f.name==='requiredFee'?[10n**15n]:[f.args[0]*5n];}
 else if(m.vaults.some(v=>v.toLowerCase()===to)){iface=vault;const i=m.vaults.findIndex(v=>v.toLowerCase()===to),f=iface.parseTransaction({data});values=f.name==='cycleAt'?[1n]:f.name==='deadline'?[BigInt(launch+[8,28,88,288][i]*86400)]:[0n];}
 else if(m.burners.some(v=>v.toLowerCase()===to)){iface=burner;const i=m.burners.findIndex(v=>v.toLowerCase()===to),f=iface.parseTransaction({data});if(f.name==='execute'&&i===1)return{jsonrpc:'2.0',id:j.id,error:{code:3,message:'execution reverted',data:fault.encodeErrorResult('StaleOrInvalidQuote',[])}};
 values=f.name==='owner'?[owner]:f.name==='dailyPoolBps'?[100n]:f.name==='maxSwapEth'?[10n**15n]:f.name==='maxSlippageBps'?[1000n]:f.name==='launchTime'?[BigInt(launch)]:f.name==='INTERVAL'?[600n]:f.name==='currentInterval'?[50n]:f.name==='lastExecutedInterval'?[i===2?50n:45n]:f.name==='executableAmount'?[i===2?0n:10n**16n]:[10n**18n];}
 else if(to===m.contracts.mainQuote.toLowerCase()){iface=quote;values=[1000n*10n**18n,BigInt(now)];}
 else if(to==='0x165c3410fc91ef562c50559f7d2289febed552d9'){iface=v2;values=[[1n,out]];}
 else if(to==='0x8dc178efb8111bb0973dd9d722ebeff267c98f94'){iface=v4;values=[out,100000n];}
 else{iface=token;const f=iface.parseTransaction({data});values=[f.args[0].toLowerCase()===owner.toLowerCase()?11n*10n**18n:22n*10n**18n];}
 const parsed=iface.parseTransaction({data});if(!parsed){console.log('Unmocked quote',to,data);return{jsonrpc:'2.0',id:j.id,error:{code:3,message:'quote not available in test'}};}result=iface.encodeFunctionResult(parsed.name,values);break;}
 default:throw Error('Unexpected public RPC '+j.method);}
 return{jsonrpc:'2.0',id:j.id,result};}


 const c=await b.newContext({viewport:{width:390,height:844}}),p=await c.newPage();let ownerReads=0;const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await c.addInitScript(({owner,other,chainId})=>{window.__account=owner;window.__listeners={};window.__sent=0;window.ethereum={isRabby:true,on:(n,fn)=>window.__listeners[n]=fn,request:async({method})=>{if(method==='eth_accounts'||method==='eth_requestAccounts')return[window.__account];if(method==='eth_chainId')return'0x'+chainId.toString(16);if(method==='eth_sendTransaction'){window.__sent++;throw Error('No signing');}throw Error(method);}};},{owner,other,chainId:m.chainId});
 await p.route('**/deployments.json',r=>r.fulfill({json:Object.fromEntries(Object.entries(manifests).map(([k,v])=>[k,{...v,rpc:'https://more-burn-test.invalid/rpc'}]))}));
 await p.route('https://more-burn-test.invalid/rpc',async r=>{const j=r.request().postDataJSON(),items=Array.isArray(j)?j:[j];const response=items.map(rpc);const owners=items.filter(j=>j.method==='eth_call'&&j.params[0].to.toLowerCase()===m.position.toLowerCase()&&position.parseTransaction({data:j.params[0].data}).name==='ownerOf');ownerReads+=owners.length;await new Promise(resolve=>setTimeout(resolve,owners.length?400:60));await r.fulfill({json:Array.isArray(j)?response:response[0]});});
 await p.route('https://api.dexscreener.com/**',r=>r.fulfill({json:{pairs:[]}}));
 await p.goto('http://127.0.0.1:18771/?chain='+key+'#pools');await p.waitForFunction(()=>document.querySelector('#pool-cards')?.children.length===4);
 await p.click('#connect-wallet');
 while(!ownerReads)await new Promise(resolve=>setTimeout(resolve,10));
 await p.evaluate(other=>{window.__account=other;window.__listeners.accountsChanged([other]);},other);
 assert(await p.locator('#claim-open').isDisabled());
 await p.waitForFunction(()=>document.querySelector('.field-help').textContent==='Wallet balance: 22 MORE');
 assert.equal(await p.locator('#pool-cards .pool-row').nth(1).locator('strong').textContent(),'0%','Old owner must not leak into the new wallet share');
 assert(ownerReads>=2,'Overlapping wallet refresh must rerun rather than reuse old ownership');
 assert.deepEqual(errors,[]);assert.equal(await p.evaluate(()=>window.__sent),0);
 console.log(JSON.stringify({chain:key,walletSwitchDuringOwnershipRead:true,correctNewBalance:true,oldShareDiscarded:true,transactionsSent:0}));await c.close();
 }
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1)});
