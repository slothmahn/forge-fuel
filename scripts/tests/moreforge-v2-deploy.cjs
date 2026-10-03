const fs=require('fs'),path=require('path'),assert=require('assert/strict');
const {pathToFileURL}=require('url');
const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.resolve(__dirname,'../../..');
const owner='0x02A0d741FBaebC03A8f0d1A85670bf1CA8C15fA9';
const rpcUrls={rh:'http://127.0.0.1:18663',pls:'http://127.0.0.1:18369'};
async function rpc(chain,method,params=[]){assert(new URL(rpcUrls[chain]).hostname==='127.0.0.1');const j=await fetch(rpcUrls[chain],{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}).then(r=>r.json());if(j.error)throw Error(method+': '+j.error.message);return j.result;}
(async()=>{
 const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
 const reports=[];
 try{for(const chain of ['rh','pls']){
  const snapshot=await rpc(chain,'evm_snapshot');
  const ctx=await browser.newContext({viewport:{width:390,height:844}}),page=await ctx.newPage(),errors=[],sent=[];page.on('pageerror',e=>{errors.push(e.message);console.log(chain,'page error',e.message);});page.on('console',m=>console.log(chain,m.text()));
  await page.exposeFunction('testWalletRPC',async(method,params)=>{if(method==='eth_requestAccounts'||method==='eth_accounts')return[owner];if(method==='eth_sendTransaction')sent.push(params[0]);return rpc(chain,method,params);});
  await page.addInitScript(()=>{window.ethereum={isRabby:true,request:({method,params=[]})=>window.testWalletRPC(method,params)};});
  await page.goto('http://127.0.0.1:8769/moreforge/deploy/?chain='+chain);
  await page.evaluate(()=>new MutationObserver(()=>console.log(document.querySelector('#status').textContent)).observe(document.querySelector('#status'),{childList:true,subtree:true}));await page.locator('#connect').click();await page.waitForFunction(()=>!document.querySelector('#prepare').disabled);
  await page.locator('#prepare').click();await page.waitForFunction(()=>!document.querySelector('#deploy').disabled,{}, {timeout:60000});
  assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));
  await page.locator('#deploy').click();await page.waitForFunction(()=>document.querySelector('#step-0').textContent.startsWith('Confirmed'),{}, {timeout:120000});
  await page.reload();await page.locator('#connect').click();await page.waitForFunction(()=>!document.querySelector('#deploy').disabled,{}, {timeout:60000});
  await page.locator('#deploy').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.startsWith('Setup verified.'),{}, {timeout:180000});
  assert.equal(sent.length,2);assert(await page.locator('#open').isDisabled());
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('more-v2-launch-1-')))));
  assert(saved.run.confirmed.every(Boolean));assert.equal(saved.run.manifest.entriesEnabled,false);
  const i=(await import(pathToFileURL(path.join(root,'forge-fuel-site/moreforge/vendor/ethers-6.15.0.js')).href)).Interface;
  const position=new i(['function entriesPaused() view returns(bool)']);
  assert.equal(position.decodeFunctionResult('entriesPaused',await rpc(chain,'eth_call',[{to:saved.plan.contracts.position,data:position.encodeFunctionData('entriesPaused')},'latest']))[0],true);
  await page.route('**/moreforge/deployments-v2.json?*',r=>r.fulfill({json:{[chain]:{...saved.run.manifest,entriesEnabled:true}}}));
  await page.locator('#verify').click();await page.waitForFunction(()=>!document.querySelector('#open').disabled,{}, {timeout:60000});
  await page.locator('#open').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('Entries are already open.'),{}, {timeout:60000});
  assert.equal(sent.length,3);assert.equal(errors.length,0,errors.join('; '));assert(!(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)),'Confirmed transaction hashes must fit mobile cards');
  await page.screenshot({path:path.join(root,'output/more-v2-ui',chain+'-hosted-deploy.png'),fullPage:true});
  // Corrupted saved calldata must never reach a wallet request.
  await page.evaluate(()=>{const key=Object.keys(localStorage).find(k=>k.startsWith('more-v2-launch-1-'));const s=JSON.parse(localStorage.getItem(key));s.plan.transactions[1].data='0x1234';localStorage.setItem(key,JSON.stringify(s));});
  await page.reload();await page.locator('#connect').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('does not match'),{}, {timeout:60000});assert.equal(sent.length,3);
  reports.push({chain,mobileLayout:'PASS',refreshResume:'PASS',exactBatchDeployment:'PASS',runtimeAndWiringVerification:'PASS',openingWebsiteGate:'PASS',activation:'PASS',tamperedPlanBlocked:'PASS',transactions:sent.length});
  await ctx.close();await rpc(chain,'evm_revert',[snapshot]);
 }}finally{await browser.close();}
 fs.writeFileSync(path.join(root,'output/more-v2-ui/hosted-deployment-results.json'),JSON.stringify(reports,null,2));console.log(JSON.stringify(reports,null,2));
})().catch(e=>{console.error(e);process.exit(1);});
