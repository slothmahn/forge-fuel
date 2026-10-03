// Regression for an already-confirmed helper; public RPC access is read-only.
const fs=require('fs'),assert=require('assert/strict');
const {chromium}=require('/Users/codylane/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const plan=JSON.parse(fs.readFileSync(process.env.MORE_CONFIRMED_PLAN||'/tmp/more-pls-confirmed-helper-plan.json'));
 Object.assign(plan,{more:'0xbEEf3bB9dA340EbdF0f5bae2E85368140d7D85D0',bitcoinToken:'0xb17D901469B9208B17d916112988A3FeD19b5cA1',minFeeWei:'200000000000000000000000',maxFeeWei:'200000000000000000000000000'});
 const run={hashes:['0x6d6e9462b55f0d84ceebf8a4246a88ca351f2d58fa2bcf4885c852d3dc6ddaac'],confirmed:[true]};
 const b=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true});let version='erigon/2.4.1/linux-amd64/go1.20.12';const sent=[],errors=[];
 try{
  const p=await b.newPage({viewport:{width:390,height:844}});p.on('pageerror',e=>errors.push(e.message));
  await p.exposeFunction('testRPC',async(method,params)=>{
   if(['eth_accounts','eth_requestAccounts'].includes(method))return[plan.owner];if(method==='eth_chainId')return'0x171';if(method==='web3_clientVersion')return version;
   if(method==='eth_sendTransaction'){sent.push(params[0]);throw Error('SIMULATED_WALLET_REVIEW_NO_SEND');}
   assert(['eth_getTransactionReceipt','eth_getTransactionByHash','eth_call','eth_getTransactionCount','eth_getBlockByNumber'].includes(method),'Public mutation forbidden: '+method);
   const j=await fetch('https://pulsechain-rpc.publicnode.com',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params}),signal:AbortSignal.timeout(20000)}).then(r=>r.json());if(j.error)throw Error(j.error.message);return j.result;
  });
  await p.addInitScript(({plan,run})=>{localStorage.setItem('more-v2-launch-1-pls-'+plan.owner.toLowerCase(),JSON.stringify({plan,run}));window.ethereum={isRabby:true,request:({method,params=[]})=>window.testRPC(method,params)};},{plan,run});
  await p.goto('http://127.0.0.1:8769/moreforge/deploy/?chain=pls');await p.locator('#connect').click();await p.waitForFunction(()=>!document.querySelector('#deploy').disabled);
  await p.locator('#deploy').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('RPC rejects the 62 KB'));assert.equal(sent.length,0);
  version='Geth/v3.2.0-pulse-stable-98e7c9bc/linux-amd64/go1.20.14';
  await p.locator('#deploy').click();await p.waitForFunction(()=>document.querySelector('#status').textContent.includes('SIMULATED_WALLET_REVIEW_NO_SEND'));
  assert.equal(sent.length,1);assert.equal(sent[0].to,plan.helper);assert.equal(sent[0].data,plan.transactions[1].data);assert.equal(sent[0].nonce,plan.transactions[1].nonce);assert.equal(sent[0].chainId,'0x171');
  assert(!(await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1)));assert.equal(errors.length,0,errors.join('; '));
  console.log('PASS: verified existing helper reused; affected Erigon blocks before signing; Geth proceeds to intercepted step-2 review with exact destination/calldata/nonce; zero public transactions sent.');
 }finally{await b.close();}
})().catch(e=>{console.error(e);process.exit(1);});
