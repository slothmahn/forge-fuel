import {Interface,toBeHex} from '../vendor/ethers-6.15.0.js';
import {OWNER,buildPlan} from './plan.js?v=2';
import {verifyDeployment} from './verify.js?v=2';
const $=s=>document.querySelector(s),same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
const status=t=>$('#status').textContent=t,log=t=>$('#log').textContent+=t+'\n',err=e=>e.shortMessage||e.message||String(e);
const network={rh:{id:4663,name:'Robinhood Chain',unit:'ETH',rpc:'https://rpc.mainnet.chain.robinhood.com/',explorer:'https://explorer.robinhood.com'},pls:{id:369,name:'PulseChain',unit:'PLS',rpc:'https://rpc.pulsechain.com',explorer:'https://scan.pulsechain.com'}};
const providers=[];let wallet,chain,plan,run,artifacts,configs,packages,busy=false,connected=false,verified,siteReady=false;
const compatibleRpc='https://pulsechain-rpc.publicnode.com';
async function checkSetupRpc(){
 if(chain!=='pls')return;
 let version;try{version=await rpc('web3_clientVersion');}catch(e){$('#rpc-status').textContent='Client version unavailable. Use the listed RPC if you see an initcode-size rejection.';return;}
 $('#rpc-status').textContent='Wallet RPC client: '+version;
 if(/erigon\/2\.4\.1(?:\/|$)/i.test(version))throw Error('This PulseChain RPC rejects the 62 KB setup call. In Rabby, change PulseChain’s custom RPC to '+compatibleRpc+', reconnect, and retry step 2. Your helper is already confirmed.');
}
const key=()=>`more-v2-launch-${chain==='pls'?'2':'1'}-${chain}-${OWNER.toLowerCase()}`;
const json=r=>{if(!r.ok)throw Error('Deployment file unavailable');return r.json();};
function add(p,name){if(p&&!providers.some(x=>x.p===p))providers.push({p,name});}
window.addEventListener('eip6963:announceProvider',e=>add(e.detail.provider,e.detail.info.name));window.dispatchEvent(new Event('eip6963:requestProvider'));
if(window.ethereum){for(const p of window.ethereum.providers||[])add(p,p.isRabby?'Rabby':'Browser wallet');add(window.ethereum,window.ethereum.isRabby?'Rabby':'Browser wallet');}
const savedChain=new URLSearchParams(location.search).get('chain');if(network[savedChain])$('#chain').value=savedChain;
function persist(){localStorage.setItem(key(),JSON.stringify({plan,run}));}
function controls(){
 $('#chain').disabled=busy;$('#connect').disabled=busy;$('#connect').textContent=connected?'Owner connected':'Connect owner wallet';$('#prepare').disabled=busy||!connected||Boolean(run?.hashes?.length);
 $('#deploy').disabled=busy||!connected||!plan||Boolean(run?.hashes?.[1]);$('#verify').disabled=busy||!connected||!run?.hashes?.[1];
 $('#open').disabled=busy||!connected||!verified||!verified.paused||!siteReady||Boolean(run?.openHash);
 $('#results').hidden=!run?.hashes?.[1];
}
function render(){
 chain=$('#chain').value;const n=network[chain];$('#rpc-help').hidden=chain!=='pls';$('#compatibility-help').hidden=chain!=='pls';
 $('#fee').textContent=chain==='rh'?'100% of locked principal’s quoted value · 0.001–1 ETH':'100% of locked principal’s quoted value · 200,000–200,000,000 PLS';
 if(plan){
  $('#anchor').textContent=new Date(plan.anchor*1000).toLocaleString()+' · '+new Date(plan.anchor*1000).toISOString();
  $('#first-close').textContent=new Date((plan.anchor+8*86400)*1000).toLocaleString();
  $('#size').textContent=`${((plan.transactions[1].data.length-2)/2/1000).toFixed(1)} KB · approximately ${chain==='rh'?'18.85':'19.00'} million gas for setup`;
  $('#deploy').textContent=run?.hashes?.[0]?'Deploy full setup · step 2':'Deploy helper · step 1';
 }else{$('#anchor').textContent='Prepared after connecting';$('#first-close').textContent='—';$('#size').textContent='—';}
 for(let i=0;i<2;i++)$('#step-'+i).textContent=run?.hashes?.[i]?`${run.confirmed?.[i]?'Confirmed':'Submitted'}: ${run.hashes[i]}`:'Not submitted';
 $('#step-2').textContent=run?.openHash?'Opening transaction: '+run.openHash:siteReady?'Website verified · ready to open':'Website connection required first';controls();
}
function restore(){chain=$('#chain').value;artifacts=packages[chain];plan=run=verified=null;siteReady=false;connected=false;
 const saved=JSON.parse(localStorage.getItem(key())||'null');if(saved){plan=saved.plan;run=saved.run;status('Saved deployment found. Connect the owner wallet to resume.');}else status('Connect the owner wallet to prepare the setup.');render();}
async function assertWallet(){
 if(!wallet)throw Error('Open this page in your Rabby browser.');
 const [accounts,id]=await Promise.all([wallet.request({method:'eth_accounts'}),wallet.request({method:'eth_chainId'})]);
 if(!same(accounts[0],OWNER))throw Error('Select the developer wallet '+OWNER+' in Rabby.');
 if(Number(BigInt(id))!==network[chain].id)throw Error('Switch Rabby to '+network[chain].name+'.');
}
async function rpc(method,params=[]){return wallet.request({method,params});}
async function call(to,data){return rpc('eth_call',[{to,data},'latest']);}
async function verifiedPlan(){
 if(!plan||plan.chain!==chain||plan.owner!==OWNER||plan.chainId!==network[chain].id)throw Error('Saved plan identity mismatch');
 const rebuilt=await buildPlan(chain,configs[chain],artifacts,plan.startNonce,plan.anchor-1,call);
 if(!same(rebuilt.planHash,plan.planHash)||JSON.stringify(rebuilt.transactions)!==JSON.stringify(plan.transactions)||JSON.stringify(rebuilt.contracts)!==JSON.stringify(plan.contracts))throw Error('Saved plan does not match this deployment package');
 const c=configs[chain];if(!same(plan.more,c.tokens[1])||!same(plan.bitcoinToken,c.tokens[3])||plan.minFeeWei!==(chain==='rh'?'1000000000000000':'200000000000000000000000')||plan.maxFeeWei!==(chain==='rh'?'1000000000000000000':'200000000000000000000000000'))throw Error('Saved plan settings mismatch');
}
async function waitReceipt(hash){
 for(let i=0;i<45;i++){const receipt=await rpc('eth_getTransactionReceipt',[hash]);if(receipt){if(BigInt(receipt.status)!==1n)throw Error('Transaction reverted. Save the report and return to the chat before continuing.');return receipt;}await new Promise(r=>setTimeout(r,2000));}
 throw Error('Still waiting for confirmation. Progress is saved; use Deploy next step again to check it.');
}
async function verifyHelper(){
 const r=await rpc('eth_getTransactionReceipt',[run.hashes[0]]),t=await rpc('eth_getTransactionByHash',[run.hashes[0]]);
 if(!r||BigInt(r.status)!==1n||!same(r.contractAddress,plan.helper)||!same(t.from,OWNER)||!same(t.input||t.data,plan.transactions[0].data)||BigInt(t.nonce)!==BigInt(plan.startNonce))throw Error('Helper deployment verification failed');
 const i=new Interface(artifacts.MoreForgeDeployerV2.abi);
 const [commit]=i.decodeFunctionResult('planHash',await call(plan.helper,i.encodeFunctionData('planHash')));
 const [owner]=i.decodeFunctionResult('owner',await call(plan.helper,i.encodeFunctionData('owner')));
 if(!same(commit,plan.planHash)||!same(owner,OWNER))throw Error('Helper commitment mismatch');
}
async function websiteCheck(){
 siteReady=false;
 const data=await fetch('../deployments-v2.json?v='+Date.now(),{cache:'no-store'}).then(json),m=data[chain];
 if(m?.status==='deployed'&&m.entriesEnabled===true&&same(m.position,plan.contracts.position)&&same(m.helper,plan.contracts.settlementBatcher)&&m.launchTime===plan.anchor){
  for(const name of Object.keys(plan.contracts))if(!same(m.contracts?.[name],plan.contracts[name]))throw Error('Published website contract mismatch');
  const html=await fetch('../index.html?v='+Date.now(),{cache:'no-store'}).then(r=>r.text());
  if(!html.includes('live-v2.js'))throw Error('Website interface unavailable');
  siteReady=true;
 }
}
async function inspect(){
 await assertWallet();await verifiedPlan();verified=await verifyDeployment(plan,artifacts,rpc,run.hashes);
 run.confirmed=[true,true];run.manifest=verified.manifest;persist();await websiteCheck();render();
 status(verified.paused?(siteReady?'Setup and website verified. The third confirmation can open entries.':'Setup verified. Entries are paused. Copy the deployment details to Codex so the site can be connected.'):'Deployment verified. Entries are already open.');
}
async function action(fn){if(busy)return;busy=true;controls();try{await fn();}catch(e){const message=err(e);status(chain==='pls'&&/initcode too large/i.test(message)?'PulseChain’s RPC rejected this setup call. Change the wallet’s custom RPC to '+compatibleRpc+' and retry step 2; your confirmed helper is reused.':message);log(message);}finally{busy=false;render();}}
$('#connect').onclick=()=>action(async()=>{
 wallet=providers.find(x=>/rabby/i.test(x.name)||x.p.isRabby)?.p||providers[0]?.p||window.ethereum;
 if(!wallet)throw Error('No wallet detected. Open this public URL inside Rabby’s browser.');
 await wallet.request({method:'eth_requestAccounts'});
 if(Number(BigInt(await wallet.request({method:'eth_chainId'})))!==network[chain].id){
  try{await wallet.request({method:'wallet_switchEthereumChain',params:[{chainId:toBeHex(network[chain].id)}]});}
  catch(e){if(e.code!==4902)throw e;const n=network[chain];await wallet.request({method:'wallet_addEthereumChain',params:[{chainId:toBeHex(n.id),chainName:n.name,nativeCurrency:{name:n.unit,symbol:n.unit,decimals:18},rpcUrls:[n.rpc],blockExplorerUrls:[n.explorer]}]});}
 }
 await assertWallet();connected=true;
 if(plan){await verifiedPlan();status('Saved plan verified. Resume the next step.');if(run?.hashes?.[1])await inspect();}
 else status('Owner connected. Prepare the deployment to review the dates and settings.');
});
$('#prepare').onclick=()=>action(async()=>{
 await assertWallet();
 const [pending,latest,block]=await Promise.all([rpc('eth_getTransactionCount',[OWNER,'pending']),rpc('eth_getTransactionCount',[OWNER,'latest']),rpc('eth_getBlockByNumber',['latest',false])]);
 if(BigInt(pending)!==BigInt(latest))throw Error('This wallet has a pending transaction. Wait for it before preparing the helper.');
 const c=configs[chain];
 await Promise.all([...new Set([c.native,...c.tokens,c.router,...(chain==='rh'?[c.moreRouter]:[]),...c.pools.filter((_,i)=>chain!=='rh'||i!==1)])].map(async a=>{if(await rpc('eth_getCode',[a,'latest'])==='0x')throw Error('Configured token, router or pool is missing: '+a);}));
 const pair=new Interface(['function token0() view returns(address)','function token1() view returns(address)']);
 for(let i=0;i<4;i++)if(chain!=='rh'||i!==1){const actual=await Promise.all(['token0','token1'].map(async m=>pair.decodeFunctionResult(m,await call(c.pools[i],pair.encodeFunctionData(m)))[0]));if(!actual.some(a=>same(a,c.native))||!actual.some(a=>same(a,c.tokens[i])))throw Error('Liquidity pair token mismatch');}
 plan=await buildPlan(chain,c,artifacts,Number(BigInt(pending)),Number(BigInt(block.timestamp)),call);
 if(await rpc('eth_getCode',[plan.helper,'latest'])!=='0x')throw Error('Predicted helper already exists');
 Object.assign(plan,{more:c.tokens[1],bitcoinToken:c.tokens[3],minFeeWei:chain==='rh'?'1000000000000000':'200000000000000000000000',maxFeeWei:chain==='rh'?'1000000000000000000':'200000000000000000000000000'});
 run={hashes:[],confirmed:[],preparedAt:new Date().toISOString()};verified=null;siteReady=false;persist();status('Plan prepared. Review the fee settings and cycle dates, then deploy the helper.');
});
$('#deploy').onclick=()=>action(async()=>{
 await assertWallet();await verifiedPlan();
 let n=run.hashes[0]?1:0;
 if(n===1&&!run.confirmed[0]){const r=await waitReceipt(run.hashes[0]);run.confirmed[0]=true;persist();}
 if(n===1){await verifyHelper();await checkSetupRpc();}
 if(!run.hashes[n]){
  const nonce=await rpc('eth_getTransactionCount',[OWNER,'pending']);if(BigInt(nonce)!==BigInt(plan.transactions[n].nonce))throw Error('Owner nonce changed. Do not submit this plan. Return to the chat for review.');
  if(n===0){const now=Number(BigInt((await rpc('eth_getBlockByNumber',['latest',false])).timestamp));if(now>=plan.anchor)throw Error('Cycle anchor has passed. Prepare a fresh plan before signing.');}
  if(n===1){const now=Number(BigInt((await rpc('eth_getBlockByNumber',['latest',false])).timestamp));if(now>=plan.anchor)throw Error('The prepared cycle anchor has passed. Stop and return to the chat before deploying the suite.');}
  status('Review '+(n===0?'the helper deployment':'the full setup deployment')+' in Rabby.');
  run.hashes[n]=await wallet.request({method:'eth_sendTransaction',params:[{...plan.transactions[n],chainId:'0x'+network[chain].id.toString(16),...(n===1?{to:plan.helper}:{})}]});persist();render();
 }
 const receipt=await waitReceipt(run.hashes[n]);run.confirmed[n]=true;persist();log('Confirmed step '+(n+1)+': '+receipt.transactionHash);
 if(n===1)await inspect();else {await verifyHelper();status('Helper confirmed. The next transaction deploys and configures the entire suite.');}
});
$('#verify').onclick=()=>action(inspect);
$('#open').onclick=()=>action(async()=>{
 await inspect();if(!siteReady||!verified.paused)throw Error('Website connection or paused-entry check failed');
 const now=Number(BigInt((await rpc('eth_getBlockByNumber',['latest',false])).timestamp));if(now>=plan.anchor)throw Error('The anchor has passed. Return to the chat to review the schedule before opening.');
 await assertWallet();const i=new Interface(artifacts.MoreForgePositionV2.abi);
 run.openHash=await wallet.request({method:'eth_sendTransaction',params:[{from:OWNER,to:plan.contracts.position,data:i.encodeFunctionData('setEntriesPaused',[false]),value:'0x0',gas:'0x10000'}]});persist();render();
 await waitReceipt(run.openHash);await inspect();log('Entries opened: '+run.openHash);
});
function report(){return {version:2,chain,helper:plan.helper,planHash:plan.planHash,anchor:plan.anchor,contracts:plan.contracts,run};}
$('#copy').onclick=async()=>{try{await navigator.clipboard.writeText(JSON.stringify(report(),null,2));$('#copy-status').textContent='Copied. Paste the deployment details into this chat.';}catch(e){$('#copy-status').textContent='Copy unavailable in this browser. Use Save deployment report.';}};
$('#download').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(report(),null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download='more-forge-v2-'+chain+'-deployment.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
$('#copy-rpc').onclick=async()=>{try{await navigator.clipboard.writeText(compatibleRpc);$('#rpc-status').textContent='Copied. Paste into Rabby’s custom RPC setting for PulseChain.';}catch(e){$('#rpc-status').textContent='RPC URL: '+compatibleRpc;}};
$('#chain').onchange=restore;
try{const [rh,pls,c]=await Promise.all(['artifacts.json','artifacts-pulsechain-shanghai.json','chains.json'].map(file=>fetch(file).then(json)));packages={rh,pls};configs=c;restore();}catch(e){status(err(e));$('#connect').disabled=true;}
