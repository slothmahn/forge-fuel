import {Contract,formatUnits} from './vendor/ethers-6.15.0.js';
import {amount,positionAbi} from './v2-model.js?v=53';
const same=(a,b)=>Boolean(a&&b&&a.toLowerCase()===b.toLowerCase());
export function feeSettings(values){
 if(!/^\d+(?:\.\d{1,2})?$/.test(values.percent))throw Error('Enter a fee percentage from 0.01 to 100, with at most two decimals.');
 const bps=BigInt(values.percent.replace('.',''))*10n**BigInt(2-(values.percent.split('.')[1]||'').length);
 if(bps<1n||bps>10000n)throw Error('Fee percentage must be from 0.01% to 100%.');
 const min=amount(values.minimum,'Minimum fee'),max=amount(values.maximum,'Maximum fee');
 if(min>max)throw Error('Minimum fee cannot exceed maximum fee.');
 if(values.bounds&&min===0n)throw Error('Minimum fee must be positive when limits are enabled.');
 return {bps,bounds:values.bounds,min,max};
}
const policyKey=p=>[p.bps,p.bounds,p.min,p.max].join(':');
export function installFeeSettings({context,account,isBusy,action,status}){
 const panel=document.querySelector('#owner-fees'),form=document.querySelector('#owner-fee-form'),dialog=document.querySelector('#owner-fee-review'),confirm=document.querySelector('#owner-fee-confirm'),message=document.querySelector('#owner-fee-status');
 let stamp='',review=null;
 function eligible(x=context()){return Boolean(x?.forgeReady&&x.dataLoaded&&same(account(),x.owner));}
 function close(){review=null;dialog.close();}
 dialog.querySelectorAll('.dialog-close,.review-cancel').forEach(b=>b.onclick=close);
 dialog.addEventListener('close',()=>{review=null;});
 function render(){
  const x=context(),ok=eligible(x);panel.hidden=!ok;
  if(!ok){stamp='';if(dialog.open)close();return;}
  const key=[x.key,x.m.position,account(),policyKey(x.feePolicy)].join(':');
  if(stamp!==key){stamp=key;form.elements.percent.value=String(Number(x.feePolicy.bps)/100);form.elements.minimum.value=formatUnits(x.feePolicy.min,18);form.elements.maximum.value=formatUnits(x.feePolicy.max,18);form.elements.bounds.checked=x.feePolicy.bounds;message.textContent='Current settings read from the blockchain.';if(dialog.open)close();}
  panel.querySelectorAll('[data-fee-unit]').forEach(e=>e.textContent=x.n.unit);
  panel.querySelectorAll('input,button').forEach(e=>e.disabled=isBusy());
  confirm.disabled=isBusy()||!review;
 }
 form.onsubmit=e=>{e.preventDefault();if(!eligible()||isBusy())return;try{
  const x=context(),p=feeSettings({percent:form.elements.percent.value,minimum:form.elements.minimum.value,maximum:form.elements.maximum.value,bounds:form.elements.bounds.checked});
  if(policyKey(p)===policyKey(x.feePolicy))throw Error('These settings already match the current policy.');
  review={x,who:account(),p,old:policyKey(x.feePolicy)};
  document.querySelector('#owner-fee-review-body').textContent=`${x.key==='rh'?'Robinhood Chain':'PulseChain'}\nFee: ${Number(p.bps)/100}% of quoted locked-principal value.\nMinimum: ${formatUnits(p.min,18)} ${x.n.unit}\nMaximum: ${formatUnits(p.max,18)} ${x.n.unit}\nLimits: ${p.bounds?'enabled':'disabled — the percentage applies without a minimum or maximum'}.\n\nThis updates fees for new entries. Existing positions are unchanged.`;
  confirm.disabled=false;dialog.showModal();message.textContent='';
 }catch(err){message.textContent=err.message;}};
 confirm.onclick=async()=>{
  const v=review;if(!v||!eligible(v.x)||context()!==v.x||!same(account(),v.who)||isBusy())return;close();
  const receipt=await action('Updating position fee',async signer=>{
   if(context()!==v.x||!same(account(),v.who)||!same(await signer.getAddress(),v.who))throw Error('Wallet or selected chain changed. Review again.');
   const p=new Contract(v.x.m.position,positionAbi,signer);
   const [owner,bps,bounds,min,max]=await Promise.all([p.owner(),p.feeBps(),p.feeBoundsEnabled(),p.minFeeWei(),p.maxFeeWei()]);
   if(!same(owner,v.who))throw Error('Only the current contract owner can update fees.');
   if(policyKey({bps,bounds,min,max})!==v.old)throw Error('The fee policy changed. Refresh and review again.');
   if(context()!==v.x||!same(account(),v.who))throw Error('Wallet or selected chain changed. Review again.');
   return p.setFeePolicy(v.p.bps,v.p.bounds,v.p.min,v.p.max);
  });
  if(receipt&&context()===v.x)message.textContent='Fee settings confirmed. Entry quotes now use the updated policy.';
 };
 return {render};
}
