import {BrowserProvider,Contract,getCreateAddress,formatEther} from '../moreforge/vendor/ethers-6.15.0.js';
import {feePlan} from './fee-plan.js';
const config=await fetch('./launch-package.json',{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('Launch package unavailable.');return r.json()});
const $=s=>document.querySelector(s),same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
const owner=config.deployerWallet, key='avalanche-fuel-launch:'+config.approvedBatchHash, wallets=[];
let active=null,busy=false,ready=null,record={chainId:43114,wallet:owner,helper:config.helper,transactions:[]};
try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&same(saved.wallet,owner)&&saved.chainId===43114)record=saved;}catch{}
$('#wallet-address').textContent='Deployer / drip manager / development: '+owner;
function displayRecord(){ $('#record').textContent=JSON.stringify(record,null,2);$('#save').disabled=!record.transactions.length; }
function remember(){try{localStorage.setItem(key,JSON.stringify(record))}catch{}displayRecord();}
function add(provider,name){if(!provider||wallets.some(w=>w.provider===provider))return;if(!wallets.length)$('#wallet-choice').replaceChildren();wallets.push({provider,name});const o=document.createElement('option');o.value=String(wallets.length-1);o.textContent=name;$('#wallet-choice').append(o);}
window.addEventListener('eip6963:announceProvider',e=>add(e.detail.provider,e.detail.info.name));
window.dispatchEvent(new Event('eip6963:requestProvider'));
if(window.ethereum){for(const p of window.ethereum.providers||[])add(p,p.isRabby?'Rabby':'Browser wallet');add(window.ethereum,window.ethereum.isRabby?'Rabby':'Browser wallet');}
if(!wallets.length){const o=document.createElement('option');o.textContent='Open in a browser with your wallet extension';o.value='';$('#wallet-choice').append(o);}
function reset(){ready=null;$('#first').disabled=true;$('#second').disabled=true;}
$('#wallet-choice').onchange=()=>{active=null;reset();$('#status').textContent='Wallet changed. Connect and check again.'};
function message(e){return e.shortMessage||e.message||String(e)}
async function validate(){
 if(!active)throw Error('Connect the deployment wallet first.');
 const provider=new BrowserProvider(active), network=await provider.getNetwork();if(network.chainId!==43114n)throw Error('Switch your wallet to Avalanche C-Chain.');
 const signer=await provider.getSigner(),address=await signer.getAddress();if(!same(address,owner))throw Error('Connect the approved deployment wallet: '+owner);
 if(!same(getCreateAddress({from:owner,nonce:config.walletNonce}),config.helper))throw Error('Launch package address does not match its wallet nonce.');
 const helper=new Contract(config.helper,['function approvedBatchHash() view returns(bytes32)','function deployed() view returns(bool)'],provider);
 const code=await provider.getCode(config.helper);let stage=1;
 if(code!=='0x'){if((await helper.approvedBatchHash()).toLowerCase()!==config.approvedBatchHash.toLowerCase())throw Error('An existing helper has a different launch package. Return to the chat.');stage=await helper.deployed()?3:2;}
 const nonce=await provider.getTransactionCount(owner,'pending');if(stage===1&&nonce!==config.walletNonce)throw Error('Wallet nonce changed. Return to the chat for refreshed launch addresses.');
 return {provider,signer,helper,stage};
}
async function quotesReady(provider){
 // User approved October 6: deployment uses the entry quote. Burn guards remain on-chain.
 const fuel=new Contract(config.contracts[0].address,['function quoteFuelInEth(uint256) view returns(uint256)'],provider);
 if(await fuel.quoteFuelInEth(1000000000000000000n)<=0n)throw Error('FUEL entry fee quote is unavailable.');
 const estimate=await provider.estimateGas({from:owner,to:config.helper,data:config.transactionTwo.data});
 if(estimate>BigInt(config.gasLimits.second))throw Error('Final deployment exceeds the reviewed gas limit. Return to the chat.');
}
async function check(){
 reset();const x=await validate();
 if(x.stage===3){await verify(x.provider);$('#status').textContent='Deployment confirmed and core settings checked. Return to the chat for source verification and site connection.';$('#first-status').textContent='Confirmed on chain.';$('#second-status').textContent='Confirmed on chain.';record.contracts=config.contracts.map(({label,address})=>({label,address}));record.confirmed=true;remember();return;}
 const fees=await x.provider.getFeeData(),block=await x.provider.getBlock('latest'), balance=await x.provider.getBalance(owner);
 const totalGas=BigInt(x.stage===1?config.gasLimits.first+config.gasLimits.second:config.gasLimits.second);
 const f=feePlan(fees.gasPrice||0n,block.baseFeePerGas||0n,fees.maxPriorityFeePerGas||0n,totalGas);
 if(balance<f.maximumCost)throw Error('Wallet balance '+formatEther(balance)+' AVAX is below the current maximum fee budget '+formatEther(f.maximumCost)+' AVAX. Fund the wallet and recheck.');
 $('#status').textContent='Avalanche C-Chain\nWallet: '+owner+'\nBalance: '+formatEther(balance)+' AVAX\nMaximum remaining fee budget: '+formatEther(f.maximumCost)+' AVAX\nReview the final fee shown by your wallet before signing.';
 if(x.stage===1){const estimate=await x.provider.estimateGas({from:owner,data:config.transactionOne.data});if(estimate>BigInt(config.gasLimits.first))throw Error('First transaction gas exceeds the reviewed limit. Return to the chat.');$('#first').disabled=false;$('#first-status').textContent='Ready for your wallet review.';}
 else{ $('#first-status').textContent='Confirmed on chain.';try{await quotesReady(x.provider);$('#second').disabled=false;$('#second-status').textContent='Entry quote and deployment simulation passed. Ready for your final wallet review. Burn quotes keep their separate on-chain guards.';}catch(e){$('#second-status').textContent='Price history/checks are not ready yet. The first transaction expanded FUEL history storage. Recheck after the required history has accumulated. Details: '+message(e);}}
 ready={...x,fees:{maxFeePerGas:f.maxFeePerGas,maxPriorityFeePerGas:f.maxPriorityFeePerGas}};
}
async function verify(provider){
 for(const r of config.contracts)if(await provider.getCode(r.address)==='0x')throw Error('A protocol contract is missing code: '+r.label);
 const by=k=>config.contracts.find(r=>r.label===k).address;
 for(const k of ['fuelBurner','moreBurner']){
  const c=new Contract(by(k),['function manager() view returns(address)','function maxSwapNative() view returns(uint256)','function maxSlippageBps() view returns(uint256)','function dailyPoolBps() view returns(uint256)','function launchTime() view returns(uint256)'],provider);
  if(!same(await c.manager(),config.manager)||await c.maxSwapNative()!==10000000000000000000n||await c.maxSlippageBps()!==1000n||await c.dailyPoolBps()!==100n||await c.launchTime()!==BigInt(config.launchTime))throw Error('A burn engine setting differs from the approved package.');
 }
 for(let i=0;i<3;i++){const c=new Contract(config.contracts[i].address,['function minimumLiquidity() view returns(uint128)'],provider);if(await c.minimumLiquidity()!==1n)throw Error('Quote liquidity policy differs.');}
 const p=new Contract(by('position'),['function feeReceiver() view returns(address)','function launchTime() view returns(uint256)'],provider);if(!same(await p.feeReceiver(),by('feeRouter'))||await p.launchTime()!==BigInt(config.launchTime))throw Error('Stake wiring or timing differs.');
}
async function action(stage){if(busy)return;busy=true;const prepared=ready;reset();try{
 if(!prepared)throw Error('Connect and check first.');const x=await validate();if(x.stage!==stage)throw Error('Launch progress changed. Recheck first.');if(stage===2)await quotesReady(x.provider);
 const tx=stage===1?config.transactionOne:config.transactionTwo;
 const request={data:tx.data,value:0n,gasLimit:BigInt(stage===1?config.gasLimits.first:config.gasLimits.second),...prepared.fees};if(stage===1)request.nonce=config.walletNonce;else request.to=config.helper;
 const latest=await x.provider.getBlock('latest');if((latest.baseFeePerGas||0n)>request.maxFeePerGas)throw Error('Gas price rose. Recheck fees before signing.');
 const remainingLimit=BigInt(stage===1?config.gasLimits.first+config.gasLimits.second:config.gasLimits.second);if(await x.provider.getBalance(owner)<remainingLimit*request.maxFeePerGas)throw Error('Wallet balance changed. Fund and recheck the launch.');
 const sent=await x.signer.sendTransaction(request);record.transactions.push({step:stage,hash:sent.hash,status:'submitted'});remember();$('#status').textContent='Submitted. Waiting for wallet confirmation…';
 const receipt=await sent.wait();if(receipt.status!==1)throw Error('Transaction failed. Return to the chat.');record.transactions.find(t=>t.hash===sent.hash).status='confirmed';remember();await check();
 }catch(e){$('#status').textContent=message(e);}finally{busy=false;}}
$('#prepare').onclick=async()=>{if(busy)return;busy=true;reset();try{const chosen=wallets[Number($('#wallet-choice').value)];if(!chosen)throw Error('Open this page in your wallet browser.');active=chosen.provider;await active.request({method:'eth_requestAccounts'});active.on?.('accountsChanged',()=>{reset();$('#status').textContent='Wallet account changed. Connect and check again.'});active.on?.('chainChanged',()=>{reset();$('#status').textContent='Wallet network changed. Connect and check again.'});await check();}catch(e){$('#status').textContent=message(e)}finally{busy=false;}};
$('#first').onclick=()=>action(1);$('#second').onclick=()=>action(2);
$('#refresh').onclick=async()=>{if(busy)return;busy=true;try{await check()}catch(e){$('#status').textContent=message(e)}finally{busy=false;}};
$('#save').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(record,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='avalanche-fuel-forge-launch-record.json';a.click();URL.revokeObjectURL(url);};
displayRecord();
