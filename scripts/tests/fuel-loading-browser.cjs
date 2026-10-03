const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('fs'),cp=require('child_process'),assert=require('assert');
const root=require('path').resolve(__dirname,'../..');
(async()=>{const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});
try{for(const chain of ['rh','pls'])for(const version of (process.env.FUEL_LIVE?['after']:['before','after'])){
 const rpc=chain==='rh'?'https://rpc.mainnet.chain.robinhood.com/':'https://rpc.pulsechain.com',chainId=chain==='rh'?4663:369;
 const m=JSON.parse(fs.readFileSync(root+'/'+(chain==='rh'?'mainnet':'pulsechain')+'-deployment.json'));
 const c=await browser.newContext({viewport:{width:390,height:844}}),p=await c.newPage();p.setDefaultTimeout(90000);const errors=[],failures=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('requestfailed',r=>failures.push(r.url()+':'+r.failure()?.errorText));
 const bundle=chain==='rh'?'mainnet-white-paper-v1.js':'pulse-mainnet.js';
 if(!process.env.FUEL_LIVE)await p.route('**/'+bundle+'?*',r=>{let body=version==='before'?cp.execFileSync('git',['show','ec70ebe:assets/'+bundle],{cwd:root,encoding:'utf8'}):fs.readFileSync(root+'/assets/'+bundle,'utf8');body+='\nwindow.__fuelLoadTest={Z,Rf,Q};';return r.fulfill({contentType:'text/javascript',body});});
 await p.addInitScript(({owner,chainId,rpc})=>{
  window.__sent=0;window.ethereum={isRabby:true,isMetaMask:true,on(){},removeListener(){},async request({method,params=[]}){
   if(method==='eth_accounts'||method==='eth_requestAccounts')return[owner];if(method==='eth_chainId')return'0x'+chainId.toString(16);if(method==='wallet_switchEthereumChain')return null;
   if(method==='eth_sendTransaction'||method.includes('sign')){window.__sent++;throw Error('Read-only verification');}
   const r=await fetch(rpc,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})});const j=await r.json();if(j.error)throw Object.assign(Error(j.error.message),j.error);return j.result;
  }};
  window.__loadTimes={};new MutationObserver(()=>{
   const checks={verified:()=>document.querySelector('.mainnet-preview-banner')?.textContent.includes('verified on-chain.'),pools:()=>document.querySelectorAll('#pool-grid .pool-card').length===4,burns:()=>document.querySelectorAll('#burn-grid .burn-card').length===3};
   for(const [k,fn] of Object.entries(checks))if(!window.__loadTimes[k]&&fn())window.__loadTimes[k]=performance.now();
  }).observe(document,{subtree:true,childList:true,characterData:true});
 },{owner:m.owner,chainId,rpc});
 await p.goto((process.env.FUEL_LIVE?'https://thefuelforge.com/':'http://127.0.0.1:8765/')+(chain==='pls'?'pulsechain/':'')+'?v=all-chain-loading-49#pools');
 try{await p.waitForFunction(()=>Object.keys(window.__loadTimes).length===3);}catch(e){console.log('FAIL',chain,version,await p.locator('.mainnet-preview-banner').textContent(),await p.locator('#activity').textContent().catch(()=>''),failures);throw e;}
 const initial=await p.evaluate(()=>window.__loadTimes),amounts=await p.locator('#pool-grid .pool-value').allTextContents();
 const start=Date.now();await p.click('#connect');
 if(!process.env.FUEL_LIVE)await p.waitForFunction(()=>window.__fuelLoadTest?.Z.signer&&!window.__fuelLoadTest.Z.busy&&window.__fuelLoadTest.Z.claimScanComplete);
 else await p.waitForFunction(()=>document.querySelector('#connect')?.textContent.includes('…')&&!document.querySelector('#connect').disabled);
 assert.equal(await p.evaluate(()=>window.__sent),0);assert.deepEqual(errors,[]);
 console.log(JSON.stringify({chain,version,timing:initial,walletMs:Date.now()-start,amounts,transactionsSent:0,pageErrors:errors,networkFailures:failures}));await c.close();
}}finally{await browser.close();}})().catch(e=>{console.error(e);process.exit(1)});
