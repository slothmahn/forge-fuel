const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),path=require('path'),assert=require('assert/strict');
(async()=>{
 const {Interface,formatUnits}=await import('../../moreforge/vendor/ethers-6.15.0.js');
 const {positionAbi}=await import('../../moreforge/v2-model.js');
 const root=path.resolve(__dirname,'../../..'),site=path.resolve(__dirname,'../..'),out=path.join(root,'output/more-v2-ui');fs.mkdirSync(out,{recursive:true});
 const legacy=JSON.parse(fs.readFileSync(path.join(site,'moreforge/deployments.json'))),pending=JSON.parse(fs.readFileSync(path.join(site,'moreforge/deployments-v2.json')));
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const results=[];
 async function rpc(chain,method,params=[]){const url=`http://127.0.0.1:${chain==='rh'?18663:18369}`;assert.equal(new URL(url).hostname,'127.0.0.1');const j=await(await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})})).json();if(j.error)throw Error(method+': '+JSON.stringify(j.error));return j.result;}
 async function make(chain,width,manifest){
  const c=await browser.newContext({viewport:{width,height:900}}),errors=[],sent=[];
  const p=await c.newPage();p.on('pageerror',e=>errors.push(e.message));
  await c.route('https://**/*',async route=>{
   const request=route.request(),host=new URL(request.url()).hostname;
   if(host.includes('dexscreener'))return route.fulfill({contentType:'application/json',body:'{"pairs":[]}'});
   if(host==='rpc.mainnet.chain.robinhood.com'||host==='rpc.pulsechain.com'){
    const key=host==='rpc.pulsechain.com'?'pls':'rh';const input=request.postDataJSON();
    const respond=async j=>{try{return{jsonrpc:'2.0',id:j.id,result:await rpc(key,j.method,j.params)}}catch(e){return{jsonrpc:'2.0',id:j.id,error:{code:-32000,message:e.message}}}};
    const output=Array.isArray(input)?await Promise.all(input.map(respond)):await respond(input);return route.fulfill({contentType:'application/json',body:JSON.stringify(output)});
   }
   throw Error('Unexpected external destination '+request.url());
  });
  if(manifest)await p.route('**/deployments-v2.json',r=>r.fulfill({contentType:'application/json',body:JSON.stringify({...pending,[chain]:manifest})}));
  const owner=legacy[chain].owner;
  await p.exposeFunction('localWallet',async ({method,params=[]})=>{
   if(method==='eth_requestAccounts'||method==='eth_accounts')return[owner];
   if(method==='wallet_switchEthereumChain')return null;
   if(method==='eth_sendTransaction'){assert.equal(params[0].from.toLowerCase(),owner.toLowerCase());sent.push(params[0]);}
   assert(['eth_chainId','eth_getTransactionCount','eth_sendTransaction','eth_getTransactionByHash','eth_getTransactionReceipt','eth_blockNumber','eth_getBlockByNumber','eth_getBalance','eth_call','eth_estimateGas','eth_gasPrice','eth_maxPriorityFeePerGas'].includes(method),'unexpected wallet method '+method);
   return rpc(chain,method,params);
  });
  await p.addInitScript(()=>{window.ethereum={isRabby:true,request:q=>window.localWallet(q),on:()=>{}};});
  await p.goto(`http://127.0.0.1:8769/moreforge/?chain=${chain}#build`);
  await p.waitForFunction(()=>!document.querySelector('#connection-status').textContent.includes('Loading'),{},{timeout:60000});
  return{c,p,errors,sent};
 }
 try{
  if(!process.env.ACTIVE_ONLY)for(const chain of ['rh','pls'])for(const width of [320,390,768,1440]){
   const {c,p,errors,sent}=await make(chain,width);
   await p.locator('#amount').fill('100');await p.locator('#term').fill('1000');await p.locator('#boost').fill('300');await p.waitForFunction(()=>document.querySelector('#power').textContent==='500 power');
   assert(await p.locator('#build-submit').isDisabled());
   for(const tab of ['build','pools','rewards','burns','buy']){await p.locator(`[data-tab="${tab}"]`).click();const overflow=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert(!overflow,`${chain} ${width} ${tab} overflow`);}
   await p.locator('[data-tab="build"]').click();await p.waitForFunction(()=>document.querySelector('#native-fee').textContent!=='Loading quote…');await p.screenshot({path:path.join(out,`${chain}-${width}-builder.png`),fullPage:true});
   await p.locator('#build-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(sent.length,0);
   await p.locator('#chain-menu summary').click();const box=await p.locator('#chain-menu nav').boundingBox();assert(box.x>=0&&box.x+box.width<=width+1);await p.keyboard.press('Escape');
   assert.equal(errors.length,0,errors.join('; '));results.push({chain,width,pending:true,layout:'PASS',sent:sent.length});await c.close();
  }
  if(!process.env.ACTIVE_ONLY){
   const {c,p,errors,sent}=await make('pls',390);
   await p.goto('http://127.0.0.1:8769/moreforge/legacy.html?chain=pls#rewards');
   await p.waitForFunction(()=>document.querySelector('#connection-status').textContent.includes('Live chain balances'),{},{timeout:60000});
   assert(await p.locator('#panel-rewards').isVisible());
   await p.locator('[data-tab="build"]').click();assert(await p.locator('#build-form .primary-button').isDisabled());
   await p.locator('#build-form').evaluate(f=>f.dispatchEvent(new Event('submit',{bubbles:true,cancelable:true})));assert.equal(sent.length,0);
   assert.equal(errors.length,0);results.push({legacy:'PASS',entriesPaused:true,chain:'pls'});
   await p.goto('http://127.0.0.1:8769/moreforge/#build');
   for(const key of ['eth','avax']){await p.locator('#chain-menu summary').click();await p.locator(`#chain-menu [data-chain="${key}"]`).click();await p.waitForFunction(()=>document.querySelector('#connection-status').textContent.includes('future deployment'));assert(await p.locator('#build-submit').isDisabled());assert(await p.locator('#buy-submit').isDisabled());}
   results.push({futureChains:'PASS',entriesDisabled:true});await c.close();
  }
  if(!process.env.PENDING_ONLY)for(const chain of ['rh','pls']){
   const plan=JSON.parse(fs.readFileSync(path.join(root,`more-forge/v2/validation/ui-forks/${chain}-batch-rehearsal-plan.json`))),contracts=plan.contracts,old=legacy[chain],i=new Interface([...positionAbi,'function setEntriesPaused(bool)']);
   const snapshot=await rpc(chain,'evm_snapshot');
   const manifest={...pending[chain],status:'deployed',entriesEnabled:true,more:old.more,bitcoinToken:old.bitcoinToken,position:contracts.position,helper:contracts.settlementBatcher,contracts,vaults:[contracts.vault8,contracts.vault28,contracts.vault88,contracts.bitcoinVault],burners:[contracts.fuelBurner,contracts.moreBurner,contracts.pampBurner],launchTime:plan.anchor,siteOpeningTime:1,deploymentBlock:plan.fork.forkBlockNumber+1};
   // Only loopback fork mutations; the owner is impersonated and funded by the setup fixture.
   const hash=await rpc(chain,'eth_sendTransaction',[{from:old.owner,to:manifest.position,data:i.encodeFunctionData('setEntriesPaused',[false])}]);
   for(let k=0;k<40;k++){if(await rpc(chain,'eth_getTransactionReceipt',[hash]))break;await new Promise(r=>setTimeout(r,100));}
   const {c,p,errors,sent}=await make(chain,390,manifest);
   await p.waitForFunction(()=>document.querySelector('#v2-launch-label').textContent==='MORE Forge V2 · Live',{},{timeout:60000});
   await p.locator('#connect-wallet').click();await p.waitForFunction(()=>document.querySelector('#connect-wallet').textContent.startsWith('0x'));
   await p.locator('[data-tab="buy"]').click();await p.locator('#buy-amount').fill(chain==='rh'?'0.0001':'10000');await p.locator('#buy-refresh').click();await p.waitForFunction(()=>!document.querySelector('#buy-submit').disabled,{},{timeout:60000});
   await p.locator('#buy-submit').click();await p.locator('#buy-confirm').click();await p.waitForFunction(()=>document.querySelector('#buy-status').textContent.includes('Purchase confirmed'),{},{timeout:90000});
   const token=new Interface(['function balanceOf(address) view returns(uint256)']);const balance=BigInt(await rpc(chain,'eth_call',[{to:old.more,data:token.encodeFunctionData('balanceOf',[old.owner])},'latest']));
   const principal=balance/4n;assert(principal>0n);
   await p.locator('[data-tab="build"]').click();await p.locator('#amount').fill(formatUnits(principal));await p.locator('#boost').fill(formatUnits(principal*3n));await p.locator('#term').fill('8');
   await p.waitForFunction(()=>!document.querySelector('#build-submit').disabled,{},{timeout:60000});const tokenId=BigInt(await rpc(chain,'eth_call',[{to:manifest.position,data:i.encodeFunctionData('nextTokenId')},'latest']));await p.locator('#build-submit').click();await p.locator('#review-confirm').click();
   for(let tries=0;tries<180;tries++){if(sent.some(t=>t.to?.toLowerCase()===manifest.position.toLowerCase()&&t.data.startsWith(i.getFunction('createPosition').selector)))break;await new Promise(r=>setTimeout(r,500));}
   await p.waitForFunction(()=>document.querySelector('#connection-status').textContent.startsWith('Confirmed:'),{},{timeout:90000});
   const create=sent.find(t=>t.to?.toLowerCase()===manifest.position.toLowerCase()&&t.data.startsWith(i.getFunction('createPosition').selector));assert(create,'entry transaction captured');
   const args=i.parseTransaction({data:create.data}).args;assert.equal(args[0],principal);assert.equal(args[1],principal*3n);assert.equal(args[2],8n);
   const [record]=[i.decodeFunctionResult('positions',await rpc(chain,'eth_call',[{to:manifest.position,data:i.encodeFunctionData('positions',[tokenId])},'latest']))];
   const vault=new Interface(['function cycleBalance(uint256) view returns(uint256)']);assert(BigInt(await rpc(chain,'eth_call',[{to:manifest.vaults[3],data:vault.encodeFunctionData('cycleBalance',[1])},'latest']))>0n);
   await rpc(chain,'evm_setNextBlockTimestamp',[Number(record.maturity)]);await rpc(chain,'evm_mine');
   await p.locator('[data-tab="pools"]').click();await p.locator('#refresh-pools').click();await p.waitForTimeout(1200);await p.locator('[data-tab="rewards"]').click();
   await p.waitForFunction(()=>document.querySelector('[data-withdraw]')&&!document.querySelector('[data-withdraw]').disabled,{},{timeout:60000});await p.locator(`[data-withdraw="${tokenId}"]`).click();await p.locator('#position-confirm').click();
   await p.waitForFunction(()=>document.querySelector('#position-controls').textContent.includes('Closed · earned rewards remain claimable'),{},{timeout:90000});
   assert(sent.some(t=>t.to?.toLowerCase()===manifest.position.toLowerCase()&&t.data.startsWith(i.getFunction('withdraw').selector)));
   assert.equal(errors.length,0,errors.join('; '));await p.screenshot({path:path.join(out,`${chain}-withdrawal.png`),fullPage:true});
   await rpc(chain,'evm_revert',[snapshot]);results.push({chain,activeFork:true,purchase:'PASS',principalAndOptionalBurnPayload:'PASS',immediateBitcoin:'PASS',withdrawal:'PASS',walletTransactions:sent.length});await c.close();
  }
 }finally{await browser.close();fs.writeFileSync(path.join(out,process.env.ACTIVE_ONLY?'active-results.json':process.env.PENDING_ONLY?'pending-results.json':'results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
})().catch(e=>{console.error(e);process.exit(1);});
