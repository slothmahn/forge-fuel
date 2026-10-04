import {BrowserProvider,Contract,keccak256} from '../moreforge/vendor/ethers-6.15.0.js';
const plan=await fetch('./transition-plan.json',{cache:'no-store'}).then(r=>r.json());
const $=s=>document.querySelector(s),same=(a,b)=>a.toLowerCase()===b.toLowerCase(),zero='0x0000000000000000000000000000000000000000';
const fields=['feeBps','feeBoundsEnabled','minFeeWei','maxFeeWei','entriesPaused','dailyPoolBps','maxSlippageBps','maxSwapEth','maxSwapNative','adapter'];
const abi=['function owner() view returns(address)','function transferOwnership(address)','function renounceOwnership()',...fields.map(k=>`function ${k}() view returns(${['feeBoundsEnabled','entriesPaused'].includes(k)?'bool':k==='adapter'?'address':'uint256'})`)];
let busy=false,next=null;
const show=t=>$('#status').textContent=t;
async function context(){
 if(!window.ethereum)throw Error('Use your desktop wallet browser.');
 const p=new BrowserProvider(window.ethereum);if((await p.getNetwork()).chainId!==BigInt(plan.chainId))throw Error('Switch your wallet to Robinhood first.');
 const signer=await p.getSigner();if(!same(await signer.getAddress(),plan.manager))throw Error('Connect the existing owner wallet: '+plan.manager);
 if(keccak256(await p.getCode(plan.controller))!==plan.codeHash)throw Error('Controller code does not match the tested build.');
 const c=new Contract(plan.controller,['function rateManager() view returns(address)','function isBurnEngine(address) view returns(bool)'],p);
 if(!same(await c.rateManager(),plan.manager))throw Error('Controller manager mismatch.');
 for(const engine of plan.engines)if(!await c.isBurnEngine(engine))throw Error('Controller registry mismatch.');
 return {p,signer};
}
async function scan(){
 const x=await context();next=null;const rows=[];
 for(const step of plan.steps){
  const c=new Contract(step.address,abi,x.p),owner=await c.owner(),target=step.action==='transferOwnership'?plan.controller:zero;
  const done=same(owner,target);if(!done&&!same(owner,plan.manager))throw Error('Unexpected owner on '+step.suite+' '+step.label);
  for(const [key,expected] of Object.entries(step.settings)){
   // Disabled fee bounds are immutable but their unused stored numbers need not match.
   if(['minFeeWei','maxFeeWei'].includes(key)&&step.settings.feeBoundsEnabled===false)continue;
   // Daily percentage is intentionally retained and may change.
   if(key==='dailyPoolBps')continue;
   const actual=await c[key]();if(typeof expected==='boolean'?actual!==expected:String(actual).toLowerCase()!==String(expected).toLowerCase())throw Error('Settings changed: '+step.suite+' '+step.label+' '+key+'. Stop for a new review.');
  }
  rows.push({step,done});if(!done&&!next)next=step;
 }
 $('#steps').replaceChildren(...rows.map(({step,done})=>{const li=document.createElement('li');li.textContent=(done?'Complete: ':'Pending: ')+step.suite+' · '+step.label+' · '+(step.action==='transferOwnership'?'transfer to drip controller':'renounce ownership');return li;}));
 $('#next').disabled=!next;
 show(next?'Next: '+next.suite+' · '+next.label+'\nContract: '+next.address+'\nAction: '+next.action+'\n'+(next.action==='transferOwnership'?'New owner: '+plan.controller+'\nOnly the daily drip remains adjustable.':'Ownership becomes permanently empty. These owner powers cannot be restored.'):'All ten Robinhood ownership steps are confirmed. Only daily drip control remains.');return x;
}
$('#check').onclick=async()=>{if(busy)return;busy=true;$('#next').disabled=true;try{if(!window.ethereum)throw Error('Use your desktop wallet browser.');await window.ethereum.request({method:'eth_requestAccounts'});await scan();}catch(e){show(e.shortMessage||e.message);}finally{busy=false;}};
$('#next').onclick=async()=>{
 if(busy||!next)return;busy=true;$('#next').disabled=true;
 try{const x=await scan(),step=next;if(!step)return;const c=new Contract(step.address,abi,x.signer);const description=step.suite+' '+step.label+'\n'+step.address+'\n'+(step.action==='transferOwnership'?'Permanently transfer ownership to the drip-only controller.':'Permanently renounce ownership. This cannot be undone.');if(!confirm(description+'\nContinue to your wallet?'))return;
  $('#next').disabled=true;show('Review this ownership transaction in your wallet.');const tx=step.action==='transferOwnership'?await c.transferOwnership(plan.controller):await c.renounceOwnership();show('Submitted: '+tx.hash+'\nWaiting for confirmation…');const receipt=await tx.wait();if(receipt.status!==1)throw Error('Transaction reverted.');await scan();
 }catch(e){show(e.shortMessage||e.message);next=null;$('#next').disabled=true;}finally{busy=false;}
};
