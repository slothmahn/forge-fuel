import {Contract,formatUnits} from './vendor/ethers-6.15.0.js';
export const bitcoinAbi=[
 'function nativeCycleBalance(uint256) view returns(uint256)',
 'function cycles(uint256) view returns(uint256 cursor,uint256 upperTokenId,uint256 totalPower,uint256 participantPool,uint256 claimed,uint256 callerPaid,bool started,bool settled)',
 'function referenceQuote() view returns(address)',
 'function MAX_QUOTE_AGE() view returns(uint256)',
 'function CONVERSION_SLIPPAGE_BPS() view returns(uint256)',
 'function convertCycle(uint256,uint256) returns(uint256)'
];
const quoteAbi=['function quote(uint256) view returns(uint256,uint256)'];
const same=(a,b)=>a?.toLowerCase()===b?.toLowerCase();
export async function prepareBitcoinConversion(x,cycle,from,requested){
 const vault=new Contract(x.m.vaults[3],bitcoinAbi,x.r);
 // A spot quote timestamps itself at the block it is read from. Pin every read
 // and the simulation to one block so a newer quote cannot look future-dated.
 const block=await x.r.getBlock('latest');
 if(!block||!Number.isInteger(block.number))throw Error('Unable to read the current chain block. Refresh and retry.');
 const snapshot={blockTag:block.number};
 const [available,state,quoteAddress,maxAge,slippage]=await Promise.all([
  vault.nativeCycleBalance(cycle,snapshot),vault.cycles(cycle,snapshot),vault.referenceQuote(snapshot),vault.MAX_QUOTE_AGE(snapshot),vault.CONVERSION_SLIPPAGE_BPS(snapshot)
 ]);
 const amount=requested??available;
 if(amount<=0n)throw Error('No '+x.n.unit+' is waiting to convert in this cycle.');
 if(available<amount)throw Error('Pool funding changed. Refresh and review the remaining amount.');
 if(state.started)throw Error('This cycle has already started settlement. Refresh the pool.');
 const [quoted,updatedAt]=await new Contract(quoteAddress,quoteAbi,x.r).quote(amount,snapshot);
 if(quoted<=0n||updatedAt>BigInt(block.timestamp)||BigInt(block.timestamp)-updatedAt>maxAge)throw Error('The Bitcoin conversion quote is unavailable or expired. Refresh and retry.');
 const minimum=quoted*(10000n-slippage)/10000n;
 if(minimum<=0n)throw Error('More funding is needed for a Bitcoin conversion.');
 // The deployed adapter and output checks must also succeed before presenting a review.
 let estimated;try{estimated=await vault.convertCycle.staticCall(cycle,amount,{from,...snapshot});}catch(e){if(e.code==='CALL_EXCEPTION')throw Error('The pool’s swap check failed. Refresh and retry before converting.');throw e;}
 if(estimated<minimum)throw Error('The conversion cannot meet the contract’s current minimum output.');
 return{vault,cycle,amount,estimated,minimum,slippage};
}
export function installBitcoinConversion({context,account,isBusy,action}){
 const $=s=>document.querySelector(s),dialog=$('#bitcoin-review');
 let reviewed=null,checking=false,generation=0,note='',noteContext;
 const report=text=>{note=text;const el=$('#bitcoin-convert-status');if(el)el.textContent=text;};
 function close(){reviewed=null;generation++;dialog.close();}
 $('#bitcoin-cancel').onclick=$('#bitcoin-close').onclick=close;
 dialog.addEventListener('cancel',()=>{reviewed=null;generation++;});
 function disable(){const x=context(),button=$('#bitcoin-convert'),p=x?.pools?.[3];if(button)button.disabled=isBusy()||checking||!account()||!x?.ready||!p||p.native<=0n;}
 async function open(){
  const x=context(),who=account(),p=x?.pools?.[3];if(checking||isBusy()||!x?.ready||!who||!p)return;
  const id=++generation;checking=true;disable();report('Checking the conversion quote…');
  try{
   const v=await prepareBitcoinConversion(x,p.current,who);
   if(id!==generation||context()!==x||!same(account(),who))return;
   reviewed={...v,x,who};$('#bitcoin-review-title').textContent='Convert pool funds to '+x.n.btc;
   $('#bitcoin-review-body').textContent=`Convert ${formatUnits(v.amount,18)} ${x.n.unit} reserved in Bitcoin cycle ${v.cycle} into ${x.n.btc}. Estimated output: ${formatUnits(v.estimated,8)} ${x.n.btc}. Current contract minimum: ${formatUnits(v.minimum,8)} ${x.n.btc}.\n\nThe contract checks the live quote again when the transaction executes, with a ${Number(v.slippage)/100}% quote slippage limit. Output can change.\n\nThe pool supplies the ${x.n.unit}; your wallet pays only gas. There is no conversion caller reward. Bitcoin remains in this cycle’s pool and becomes claimable after settlement. This does not settle the cycle or send Bitcoin to your wallet.`;
   report('Review the pool conversion before confirming in your wallet.');dialog.showModal();
  }catch(e){if(id===generation&&context()===x)report(e.shortMessage||e.message||'Conversion could not be verified. Refresh and retry.');}
  finally{checking=false;disable();}
 }
 $('#bitcoin-confirm').onclick=async()=>{
  const v=reviewed;if(!v||context()!==v.x||!same(account(),v.who)){close();return;}
  close();report('Waiting for conversion confirmation…');
  const receipt=await action('Converting pool funds to '+v.x.n.btc,async signer=>{
   if(context()!==v.x||!same(await signer.getAddress(),v.who))throw Error('Wallet changed. Review the conversion again.');
   const fresh=await prepareBitcoinConversion(v.x,v.cycle,v.who,v.amount);
   return fresh.vault.connect(signer).convertCycle(v.cycle,v.amount);
  });
  if(context()===v.x)report(receipt?'Conversion confirmed. Bitcoin is held in cycle '+v.cycle+' until settlement.':'Conversion not confirmed. Refresh the pool to check its balance.');
 };
 function update(){
  const x=context();if(noteContext!==x){noteContext=x;note='';generation++;if(dialog.open)close();}
  if(reviewed&&!same(account(),reviewed.who))close();
  const button=$('#bitcoin-convert');if(button){button.onclick=open;if(note)report(note);disable();}
 }
 return{update,disable};
}
