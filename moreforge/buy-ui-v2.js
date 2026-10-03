import {fitAmountInputs} from './input-sizing.js?v=more-forge-polish-33';
import {displayAmount,amountText} from './amounts.js?v=more-forge-polish-33';
import {Contract,parseUnits,formatUnits} from './vendor/ethers-6.15.0.js';
import {quotePurchase,minimumReceived,purchaseTransaction,receivedMore} from './swaps.js';
import {setReference,refreshReferences,clearReferences} from './usd-reference.js';

export function installBuy({context,account,isBusy,marketPrices,action,tab,status}){
  const $=s=>document.querySelector(s);let quote=null,review=null,request=0,identity='',timer;
  const text=(s,t)=>$(s).textContent=t,units=n=>formatUnits(n,18);
  const display=n=>displayAmount(n,18,8);
  const err=e=>e.shortMessage||e.message||String(e);
  function valid(q=quote){const x=context();return q&&x?.ready&&q.context===x&&q.wallet===(account()||'').toLowerCase()&&Date.now()-q.at<60000;}
  function disable(){const x=context();for(const id of ['#buy-amount','#buy-slippage','#buy-refresh'])$(id).disabled=isBusy()||!x?.ready;$('#buy-submit').disabled=isBusy()||!account()||!valid()||!quote.affordable;$('#buy-half').disabled=isBusy()||!account()||!x?.ready;$('#buy-use').disabled=isBusy()||!x?.ready||!$('#buy-use').dataset.amount||Number($('#buy-use').dataset.amount)<=0;}
  function clear(message='Enter an amount to see your purchase.'){
    quote=null;review=null;request++;$('#buy-review').close();clearReferences($('#panel-buy'));
    for(const s of ['#buy-output','#buy-minimum','#buy-impact','#buy-entry-fee','#buy-gas']){text(s,'—');$(s).removeAttribute('title');}text('#buy-status',message);disable();
  }
  function update(){const x=context(),id=(x?.key||'')+':'+(account()||'').toLowerCase();
    if(id!==identity){identity=id;clear(x?.ready?'Enter an amount to see your purchase.':'Purchases are not available on this chain yet.');$('#buy-result').hidden=true;}
    const unit=x?.n.unit||($('#chain').value==='pls'?'PLS':'ETH');text('#buy-native-unit',unit);if(!account()){text('#buy-balance','Connect wallet to see your balance');$('#buy-balance').removeAttribute('title');}text('#buy-unit-label',unit+' to spend');text('#buy-chain',x?.key==='pls'?'PulseChain · MORE / WPLS':'Robinhood · MORE / WETH');
    disable();
  }
  async function preview(){fitAmountInputs();clearTimeout(timer);clear('Getting a live swap quote…');const x=context(),id=request,wallet=(account()||'').toLowerCase();if(!x?.ready){text('#buy-status','Purchases are not available on this chain yet.');return;}
    try{
      const raw=$('#buy-amount').value;if(!/^\d+(?:\.\d{0,18})?$/.test(raw))throw Error('Enter an amount with up to 18 decimals.');const amount=parseUnits(raw,18);if(amount<=0n)throw Error('Enter a positive purchase amount.');const bps=Number($('#buy-slippage').value);
      const [out,spot,balance,fees]=await Promise.all([quotePurchase(x.key,x.r,amount),new Contract(x.m.contracts.mainQuote,['function quote(uint256) view returns(uint256,uint256)'],x.r).quote(10n**18n),wallet?x.r.getBalance(wallet):0n,x.r.getFeeData()]);
      const min=minimumReceived(out,bps);const policy=x.feePolicy;let entryFee=out*10n**18n/spot[0];if(policy){entryFee=entryFee*BigInt(policy.bps)/10000n;if(policy.bounds)entryFee=entryFee<BigInt(policy.min)?BigInt(policy.min):entryFee>BigInt(policy.max)?BigInt(policy.max):entryFee;}let gas=null,gasCost=0n;
      if(wallet){const tx=purchaseTransaction(x.key,amount,min,wallet,(await x.r.getBlock('latest')).timestamp+600);gas=await x.r.estimateGas({...tx,from:wallet});gasCost=gas*120n/100n*(fees.maxFeePerGas||fees.gasPrice||0n);}
      if(id!==request||context()!==x||wallet!==(account()||'').toLowerCase())return;
      const spotOutput=amount*spot[0]/10n**18n;const impact=spotOutput>out?Number((spotOutput-out)*1000000n/spotOutput)/10000:0;
      quote={context:x,wallet,amount,out,min,bps,entryFee,gas,gasCost,balance,affordable:!wallet||balance>=amount+gasCost,at:Date.now()};
      amountText($('#buy-output'),out,'MORE',6,18,'≈ ');amountText($('#buy-minimum'),min,'MORE',6,18,'≈ ');text('#buy-impact',impact.toFixed(3)+'%');text('#buy-entry-fee','≈ '+display(entryFee)+' '+x.n.unit);text('#buy-gas',gas?'≈ '+display(gasCost)+' '+x.n.unit:'Connect wallet for gas estimate');text('#buy-balance',wallet?'Wallet balance: '+displayAmount(balance,18,6)+' '+x.n.unit:'Connect wallet to see your balance');$('#buy-balance').title=wallet?'Exact balance: '+units(balance)+' '+x.n.unit:'';
      for(const [id,parts] of [['#buy-spend-usd',{NATIVE:amount}],['#buy-output-usd',{MORE:out}],['#buy-minimum-usd',{MORE:min}],['#buy-entry-usd',{NATIVE:entryFee}]])setReference($(id),parts);if(gas)setReference($('#buy-gas-usd'),{NATIVE:gasCost});refreshReferences(document,marketPrices());
      text('#buy-status',!wallet?'Connect wallet to review your purchase.':!quote.affordable?'Insufficient '+x.n.unit+' for this purchase and estimated gas.':balance<amount+gasCost+entryFee?'Quote ready. Your remaining '+x.n.unit+' may not cover a later position’s protocol fee.':'Quote ready. Buying sends MORE to your wallet; it does not burn it.');disable();
    }catch(e){if(id===request){clear(err(e));}}
  }
  function schedule(){clear();clearTimeout(timer);if($('#buy-amount').value)timer=setTimeout(preview,400);}
  $('#buy-amount').oninput=$('#buy-slippage').onchange=schedule;
  $('#buy-refresh').onclick=preview;
  $('#buy-half').onclick=async()=>{const x=context(),wallet=account();if(!x||!wallet)return;try{const balance=await x.r.getBalance(wallet);if(context()!==x||account()!==wallet)return;$('#buy-amount').value=units(balance/2n);await preview();}catch(e){text('#buy-status',err(e));}};
  $('#buy-form').onsubmit=async e=>{e.preventDefault();if(!valid()){await preview();text('#buy-status','Quote refreshed. Review your purchase again.');return;}review={...quote};const q=review,x=q.context;text('#buy-review-body',`Spend ${units(q.amount)} ${x.n.unit} to buy an estimated ${units(q.out)} MORE on ${x.key==='rh'?'Robinhood':'PulseChain'}. Minimum received: ${units(q.min)} MORE (${q.bps/100}% slippage). Estimated gas: ${display(q.gasCost)} ${x.n.unit}. MORE goes to ${account()}. This purchase does not create a Forge position or burn any MORE. A later position requires a separate protocol fee and wallet confirmation. V2 entry availability is shown on Build power.`);$('#buy-review').showModal();};
  $('#buy-cancel').onclick=$('#buy-close').onclick=()=>{$('#buy-review').close();review=null;};
  $('#buy-confirm').onclick=async()=>{const q=review;if(!q)return;$('#buy-review').close();review=null;
    if(!valid(q)){clear('Quote expired or wallet changed. Refresh and review your purchase again.');return;}
    const receipt=await action('Buying MORE',async signer=>{
      const who=(await signer.getAddress()).toLowerCase();if(context()!==q.context||who!==q.wallet)throw Error('Wallet or chain changed. Review your purchase again.');
      // Never silently widen the reviewed minimum. If this simulation fails, no buy is sent.
      const deadline=(await q.context.r.getBlock('latest')).timestamp+600;
      const tx=purchaseTransaction(q.context.key,q.amount,q.min,who,deadline);const gas=await signer.estimateGas(tx);
      if(!valid(q)||context()!==q.context||(account()||'').toLowerCase()!==who)throw Error('Quote expired or wallet changed. Refresh and review again.');
      const network=await signer.provider.getNetwork();if(Number(network.chainId)!==q.context.n.id)throw Error('Wallet chain changed.');
      return signer.sendTransaction({...tx,gasLimit:gas*120n/100n});
    });
    if(receipt&&context()===q.context&&(account()||'').toLowerCase()===q.wallet){const received=receivedMore(q.context.key,receipt,q.wallet);quote=null;review=null;request++;disable();text('#buy-status','Purchase confirmed. MORE is now in your wallet.');$('#buy-result').hidden=false;text('#buy-received',displayAmount(received,18,6)+' MORE received');$('#buy-received').title='Exact amount: '+units(received)+' MORE';setReference($('#buy-received-usd'),{MORE:received});refreshReferences(document,marketPrices());$('#buy-use').dataset.amount=units(received);$('#buy-use').disabled=received===0n;}
    else if(context()===q.context){quote=null;disable();text('#buy-status','Purchase was not confirmed. Refresh the quote before trying again.');}
  };
  $('#buy-use').onclick=()=>{if(!$('#buy-use').dataset.amount)return;$('#amount').value=$('#buy-use').dataset.amount;$('#boost').value='0';$('#amount').dispatchEvent(new Event('input'));tab('build');$('#build-form').scrollIntoView({behavior:'smooth',block:'start'});};
  setInterval(()=>{if(!$('#panel-buy').hidden&&!isBusy()){if(quote&&!valid()){quote=null;disable();text('#buy-status','Quote expired. Refresh for a new price.');}}},1000);
  update();return{update,disable};
}
