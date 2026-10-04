import {BrowserProvider,JsonRpcProvider,FetchRequest,Contract,keccak256} from '../moreforge/vendor/ethers-6.15.0.js';
import {findWalletProvider,rememberWalletProvider} from '../assets/wallet-session.js?v=wallet-session-95';
import {switchWalletChain} from '../assets/wallet-chain-switch.js?v=99';
const plan=await fetch('./transition-plan.json',{cache:'no-store'}).then(r=>r.json());
const $=s=>document.querySelector(s),same=(a,b)=>a.toLowerCase()===b.toLowerCase(),zero='0x0000000000000000000000000000000000000000';
const fields=['feeBps','feeBoundsEnabled','minFeeWei','maxFeeWei','entriesPaused','dailyPoolBps','maxSlippageBps','maxSwapEth','maxSwapNative','adapter'];
const abi=['function owner() view returns(address)','function transferOwnership(address)','function renounceOwnership()',...fields.map(k=>`function ${k}() view returns(${['feeBoundsEnabled','entriesPaused'].includes(k)?'bool':k==='adapter'?'address':'uint256'})`)];
let busy=false,next=null,wallet=null;
const connection=new FetchRequest('https://rpc.mainnet.chain.robinhood.com/');connection.timeout=20000;
const reads=new JsonRpcProvider(connection,4663,{staticNetwork:true,batchMaxCount:10});
const show=t=>$('#status').textContent=t;
async function context(){
 if(!wallet)throw Error('Connect your wallet first.');
 const p=new BrowserProvider(wallet);if((await p.getNetwork()).chainId!==BigInt(plan.chainId))throw Error('Switch your wallet to Robinhood first.');
 const accounts=await wallet.request({method:'eth_accounts'});if(!accounts?.[0])throw Error('Unlock your wallet and connect again.');
 const signer=await p.getSigner(accounts[0]);if(!same(await signer.getAddress(),plan.manager))throw Error('Select the owner account in your wallet, then connect again: '+plan.manager);
 if(keccak256(await reads.getCode(plan.controller))!==plan.codeHash)throw Error('Controller code does not match the tested build.');
 const c=new Contract(plan.controller,['function rateManager() view returns(address)','function isBurnEngine(address) view returns(bool)'],reads);
 if(!same(await c.rateManager(),plan.manager))throw Error('Controller manager mismatch.');
 for(const engine of plan.engines)if(!await c.isBurnEngine(engine))throw Error('Controller registry mismatch.');
 return {p:reads,signer};
}
async function scan(){
 show('Checking the controller and your wallet…');const x=await context();next=null;const rows=[];
 for(const [index,step] of plan.steps.entries()){
  show('Checking '+(index+1)+' of '+plan.steps.length+': '+step.suite+' · '+step.label+'…');
  const c=new Contract(step.address,abi,x.p),owner=await c.owner(),target=step.action==='transferOwnership'?plan.controller:zero;
  const done=same(owner,target);if(!done&&!same(owner,plan.manager))throw Error('Unexpected owner on '+step.suite+' '+step.label);
  await Promise.all(Object.entries(step.settings).map(async ([key,expected])=>{
   // Disabled fee bounds are immutable but their unused stored numbers need not match.
   if(['minFeeWei','maxFeeWei'].includes(key)&&step.settings.feeBoundsEnabled===false)return;
   // Daily percentage is intentionally retained and may change.
   if(key==='dailyPoolBps')return;
   const actual=await c[key]();if(typeof expected==='boolean'?actual!==expected:String(actual).toLowerCase()!==String(expected).toLowerCase())throw Error('Settings changed: '+step.suite+' '+step.label+' '+key+'. Stop for a new review.');
  }));
  rows.push({step,done});if(!done&&!next)next=step;
 }
 $('#steps').replaceChildren(...rows.map(({step,done})=>{const li=document.createElement('li');li.textContent=(done?'Complete: ':'Pending: ')+step.suite+' · '+step.label+' · '+(step.action==='transferOwnership'?'transfer to drip controller':'renounce ownership');return li;}));
 $('#next').disabled=!next;
 show(next?'Next: '+next.suite+' · '+next.label+'\nContract: '+next.address+'\nAction: '+next.action+'\n'+(next.action==='transferOwnership'?'New owner: '+plan.controller+'\nOnly the daily drip remains adjustable.':'Ownership becomes permanently empty. These owner powers cannot be restored.'):'All ten Robinhood ownership steps are confirmed. Only daily drip control remains.');return x;
}
$('#check').onclick=async()=>{if(busy)return;busy=true;$('#check').disabled=true;$('#next').disabled=true;try{show('Finding your wallet…');const found=await findWalletProvider();if(!found)throw Error('No wallet detected. Open this link inside your wallet browser or enable your wallet extension.');wallet=found.provider;show('Unlock your wallet and approve the connection…');await wallet.request({method:'eth_requestAccounts'});rememberWalletProvider(wallet);show('Confirm switching to Robinhood in your wallet if prompted…');await switchWalletChain(wallet,{id:4663,name:'Robinhood Chain',unit:'ETH',rpc:'https://rpc.mainnet.chain.robinhood.com/',explorer:'https://robinhoodchain.blockscout.com'});await scan();}catch(e){show(e.shortMessage||e.message);}finally{busy=false;$('#check').disabled=false;}};
$('#next').onclick=async()=>{
 if(busy||!next)return;busy=true;$('#check').disabled=true;$('#next').disabled=true;
 try{const x=await scan(),step=next;if(!step)return;const c=new Contract(step.address,abi,x.signer);const description=step.suite+' '+step.label+'\n'+step.address+'\n'+(step.action==='transferOwnership'?'Permanently transfer ownership to the drip-only controller.':'Permanently renounce ownership. This cannot be undone.');if(!confirm(description+'\nContinue to your wallet?'))return;
  if(BigInt(await wallet.request({method:'eth_chainId'}))!==BigInt(plan.chainId))throw Error('Wallet chain changed. Reconnect on Robinhood before continuing.');const accounts=await wallet.request({method:'eth_accounts'});if(!accounts?.[0]||!same(accounts[0],plan.manager))throw Error('Wallet account changed. Reconnect the owner account before continuing.');
  $('#next').disabled=true;show('Review this ownership transaction in your wallet.');const tx=step.action==='transferOwnership'?await c.transferOwnership(plan.controller):await c.renounceOwnership();show('Submitted: '+tx.hash+'\nWaiting for confirmation…');const receipt=await tx.wait();if(receipt.status!==1)throw Error('Transaction reverted.');await scan();
 }catch(e){show(e.shortMessage||e.message);next=null;$('#next').disabled=true;}finally{busy=false;$('#check').disabled=false;}
};
