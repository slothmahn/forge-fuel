import {displayAmount} from './amounts.js?v=more-forge-polish-33';
import {referenceMarkup} from './usd-reference.js';

const format=(n,d=18)=>displayAmount(n,d,d===8?8:6);
const deadlineDate=n=>{const d=new Date(Number(n)*1000);return `<time datetime="${d.toISOString()}"><span>${new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(d)}</span><small>${new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(d)}</small></time>`;};
import {powerAt} from './v2-model.js';
const eligiblePower=(positions,deadline)=>positions.reduce((total,p)=>total+powerAt(p,deadline),0n);
export function poolEstimate(pool,positions,owned,now,launchTime){
  const deadline=BigInt(pool.deadline),total=eligiblePower(positions,deadline),wallet=eligiblePower(owned,deadline);
  const gross=pool.balance+(pool.i===3?pool.btcQuote:0n);
  const payout=total?(gross-gross*25n/10000n)*wallet/total:0n;
  const start=Number(pool.current)>1?Number(deadline)-pool.days*86400:Number(launchTime);
  const duration=Number(deadline)-start,progress=duration>0?Math.round(Math.max(0,Math.min(1,(now-start)/duration))*100):0;
  const share=total?Number(wallet*1000000n/total)/10000:0;
  return{wallet,total,payout,share,progress};
}
export function poolMarkup(x,connected,estimatesReady=true){
  const native=x.pools.slice(0,3).reduce((n,p)=>n+p.balance,0n),bitcoin=x.pools[3];
  let claimNative=0n,claimBtc=0n;for(const c of x.claims)c.pool===3?claimBtc+=c.value:claimNative+=c.value;
  const overview=`<div><span>IN CURRENT FORGE CYCLES</span><strong>${format(native)} ${x.n.unit}</strong>${referenceMarkup({NATIVE:native})}<small>Across the three Forge payout pools</small></div><div><span>288-DAY BITCOIN CURRENT CYCLE</span><strong>${format(bitcoin.balance,8)} ${x.n.btc}</strong>${referenceMarkup({BTC:bitcoin.balance})}<small>Open to every eligible MORE position</small></div><div><span>YOUR CLAIMABLE REWARDS</span><strong>${connected&&!estimatesReady?'Loading rewards…':connected?format(claimNative)+' '+x.n.unit+' · '+format(claimBtc,8)+' '+x.n.btc:'Connect wallet'}</strong>${connected&&!estimatesReady?'':connected?referenceMarkup({NATIVE:claimNative,BTC:claimBtc}):'<b>Connect wallet for USD estimate</b>'}<a href="#rewards" data-pool-rewards>Open Rewards to claim</a></div>`;
  const cards=x.pools.map(p=>{
    const btc=p.i===3,unit=btc?x.n.btc:x.n.unit,asset=btc?'BTC':'NATIVE',estimate=poolEstimate(p,x.positions,x.owned,x.now,x.m.launchTime);
    return `<article class="card pool-card pool-tone-${p.i}"><div class="pool-top"><span>CYCLE ${p.current}</span><span class="pool-live">LIVE · ${x.key==='rh'?'ROBINHOOD CHAIN':'PULSECHAIN'}</span></div><h3>${p.days}-Day ${btc?'Bitcoin ':''}Pool</h3><div class="pool-value">${format(p.balance,btc?8:18)} <small>${unit}</small></div>${referenceMarkup({[asset]:p.balance})}${btc&&p.native>0n?`<div class="bitcoin-pending">${format(p.native)} ${x.n.unit} awaiting Bitcoin conversion${referenceMarkup({NATIVE:p.native})}</div>`:''}<div class="pool-row"><span>Closes</span><strong>${deadlineDate(p.deadline)}</strong></div><div class="pool-row"><span>Your estimated share</span><strong>${connected&&!estimatesReady?'Loading your share…':connected?estimate.share.toLocaleString(undefined,{maximumFractionDigits:4})+'%':'Connect wallet'}</strong></div><div class="pool-row"><span>Estimated payout</span><strong>${connected&&!estimatesReady?'Loading estimate…':connected?format(estimate.payout,btc?8:18)+' '+unit+referenceMarkup({[asset]:estimate.payout}):'Connect wallet'}${connected&&estimatesReady&&btc&&p.native>0n?'<small>Includes quoted pending conversion</small>':''}</strong></div><div class="progress-track" role="progressbar" aria-label="${p.days}-day cycle elapsed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${estimate.progress}"><span style="width:${estimate.progress}%"></span></div><div class="pool-foot">${estimate.progress}% of cycle elapsed · estimate updates when refreshed</div>${btc?'<p class="field-help">Bitcoin is purchased during each entry. No separate conversion step is needed.</p>':''}</article>`;
  }).join('');
  return{overview,cards};
}
