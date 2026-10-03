import {displayAmount} from './amounts.js?v=more-forge-polish-33';
import {Interface,formatUnits,parseUnits} from './vendor/ethers-6.15.0.js';
import {referenceMarkup as fullReferenceMarkup} from './usd-reference.js?v=burn-layout-79';
const referenceMarkup=parts=>fullReferenceMarkup(parts).replace('class="usd-reference"','class="usd-reference" data-usd-compact');

export const burnAbi=[
 'function owner() view returns(address)','function dailyPoolBps() view returns(uint256)',
 'function maxSwapEth() view returns(uint256)','function maxSlippageBps() view returns(uint256)',
 'function executableAmount() view returns(uint256)','function currentInterval() view returns(uint256)',
 'function lastExecutedInterval() view returns(uint256)','function launchTime() view returns(uint256)',
 'function INTERVAL() view returns(uint256)','function setDailyPoolBps(uint256)',
 'function setMaxSwapEth(uint256)','function setMaxSlippageBps(uint256)','function execute() returns(uint256)',
 'event Executed(address indexed caller,uint256 intervals,uint256 grossEth,uint256 callerReward,uint256 swapEth,uint256 tokensBurned)'
];
const events=new Interface(burnAbi);
const errors=new Interface(['error NotStarted()','error NoElapsedIntervals()','error AmountTooSmall()',
 'error StaleOrInvalidQuote()','error InvalidConfiguration()','error InsufficientOutput(uint256,uint256)']);
export function burnFailure(e){
 let name;try{name=errors.parseError(e.data||e.info?.error?.data)?.name;}catch{}
 if(name==='StaleOrInvalidQuote'||name==='InsufficientOutput')return {label:'Price check paused',note:'The swap quote or output check failed. Refresh and retry when the quote is valid.'};
 if(name==='AmountTooSmall')return {label:'Amount too small',note:'More funding is needed before this burn can execute.'};
 if(name==='NotStarted')return {label:'Not started',note:'Burns become available after the launch time.'};
 if(name==='NoElapsedIntervals')return {label:'Waiting for next interval',note:''};
 if(name==='InvalidConfiguration')return {label:'Burn configuration unavailable',note:'The contract rejected the burn configuration.'};
 return {label:'Execution check unavailable',note:'The burn could not be verified. Refresh before trying again.'};
}
export async function readBurn(b,provider,address,from,now){
 const [balance,available,cap,rate,owner,interval,last,slippage,launch,seconds]=await Promise.all([
  provider.getBalance(address),b.executableAmount(),b.maxSwapEth(),b.dailyPoolBps(),b.owner(),
  b.currentInterval(),b.lastExecutedInterval(),b.maxSlippageBps(),b.launchTime(),b.INTERVAL()
 ]);
 const amount=available<cap?available:cap,pending=interval>last?interval-last:0n;
 let state={label:'Waiting for funding',note:''},ready=false;
 if(BigInt(now)<launch)state={label:'Not started',note:''};
 else if(pending===0n)state={label:'Waiting for next interval',note:''};
 else if(amount>0n){try{await b.execute.staticCall({from});ready=true;state={label:'READY',note:''};}catch(e){state=burnFailure(e);}}
 return {balance,amount,cap,rate,owner,pending,slippage,ready,...state,launch:Number(launch),next:Number(launch+(interval+1n)*seconds)};
}
export function ownerSetting(field,raw){
 if(field==='cap'){
  if(!/^\d+(?:\.\d{0,18})?$/.test(raw))throw Error('Enter a positive execution cap with up to 18 decimals.');
  const value=parseUnits(raw,18);if(value<=0n)throw Error('The execution cap must be greater than zero.');return value;
 }
 if(!/^\d+(?:\.\d{0,2})?$/.test(raw))throw Error('Enter a percentage with up to two decimal places.');
 const value=parseUnits(raw,2),min=field==='drip'?100n:0n;
 if(!['drip','slippage'].includes(field)||value<min||value>1000n)throw Error(field==='drip'?'Daily drip must be from 1% to 10%.':'Slippage must be from 0% to 10%.');return value;
}
const amount=n=>displayAmount(n,18,8);
const localDate=n=>new Intl.DateTimeFormat(undefined,{dateStyle:'medium'}).format(new Date(n*1000));
const localTime=n=>new Intl.DateTimeFormat(undefined,{hour:'numeric',minute:'2-digit',timeZoneName:'short'}).format(new Date(n*1000));
export function burnMarkup(x,rows,account){
 const total=rows.reduce((n,p)=>n+p.balance,0n);
 const overview=`<div class="burn-total"><span>${x.n.unit} IN BURN POOLS</span><strong>${amount(total)} ${x.n.unit}</strong>${referenceMarkup({NATIVE:total})}</div><div class="burn-flow"><span>Protocol fee</span><b aria-hidden="true">→</b><span>8/28/88-day rewards · Bitcoin · burns</span><b aria-hidden="true">→</b><span>10-minute burn intervals</span></div>`;
 const cards=rows.map((p,i)=>{
  const prestart=p.label==='Not started'&&Number.isFinite(p.launch);
  const tok=['FUEL','MORE','PAMP'][i],owner=account?.toLowerCase()===p.owner.toLowerCase(),reward=p.amount*150n/10000n;
  return `<article class="card burn-card burn-${tok.toLowerCase()}" data-burn-address="${x.m.burners[i]}"><div class="burn-heading"><img class="burn-token-icon" src="assets/${tok.toLowerCase()}-token.jpg" alt="${tok}" width="54" height="54"><div><small>${tok} BURN POOL</small><h3>${tok} Buy &amp; Burn</h3></div></div><div class="burn-settings"><span class="burn-share">5% of protocol fees</span><span class="burn-drip">${Number(p.rate)/100}% daily drip</span></div><div class="burn-balance"><span>Burn Pool Balance</span><strong>${amount(p.balance)} ${x.n.unit}</strong>${referenceMarkup({NATIVE:p.balance})}</div><div class="burn-row"><span>Next burn</span><strong>${amount(p.amount)} ${x.n.unit}<small>${prestart?'First interval ends at '+localTime(p.next):p.pending.toLocaleString()+' interval'+(p.pending===1n?'':'s')+' elapsed'}</small>${referenceMarkup({NATIVE:p.amount})}</strong></div><div class="burn-row"><span>Caller reward (1.5%)</span><strong>${amount(reward)} ${x.n.unit}${referenceMarkup({NATIVE:reward})}</strong></div><div class="burn-row"><span>${prestart?'Burn clock starts':'Next interval'}</span><strong class="burn-readiness ${p.ready?'is-ready':''}">${p.ready?'<i aria-hidden="true"></i> ':''}${prestart?localTime(p.launch)+'<small>'+localDate(p.launch)+'</small>':p.label}${!p.ready&&p.label==='Waiting for next interval'?'<small>'+localTime(p.next)+'</small>':''}</strong></div><div class="burn-row"><span>Total ${tok} burned</span><strong data-burn-total="${i}">Loading burn history…</strong></div>${p.note?'<p class="burn-check-note">'+p.note+'</p>':''}<div class="burn-actions"><button class="primary-button" data-ready="${p.ready}" data-execute="${i}" ${p.ready&&account?'':'disabled'}>Execute burn</button><a href="${x.n.explorer}/address/${x.m.burners[i]}" target="_blank" rel="noopener noreferrer">View burner contract ↗</a></div>${owner?`<details class="owner-burn-settings"><summary>Owner burn settings</summary><div class="owner-burn-fields"><label>Maximum ${x.n.unit} per execution<input inputmode="decimal" data-burn-setting="${i}-cap" value="${formatUnits(p.cap,18)}"></label><button type="button" data-save-burn="${i}-cap">Save cap</button><label>Daily drip (%)<input type="number" min="1" max="10" step="0.01" data-burn-setting="${i}-drip" value="${Number(p.rate)/100}"></label><button type="button" data-save-burn="${i}-drip">Save drip</button><label>Maximum slippage (%)<input type="number" min="0" max="10" step="0.01" data-burn-setting="${i}-slippage" value="${Number(p.slippage)/100}"></label><button type="button" data-save-burn="${i}-slippage">Save slippage</button></div><p>Owner wallet only. Protocol-fee funding remains fixed at 5%.</p></details>`:''}</article>`;
 }).join('');return {overview,cards};
}
// Confirmed event totals are cached; a recent tail is reread on every refresh.
// Never report zero for an unsuccessful history read or mix totals across chains.
export async function burnTotal(provider,address,chain,start,head,storage){
 if(!Number.isSafeInteger(start)||!Number.isSafeInteger(head)||head<start)throw Error('Burn history block range unavailable');
 const key=`more-forge:burn-total:v1:${chain}:${address.toLowerCase()}:${start}`,confirmed=Math.max(start-1,head-64);
 let saved={block:start-1,total:0n};
 try{const v=JSON.parse(storage?.getItem(key));if(v&&Number.isSafeInteger(v.block)&&v.block>=start-1&&v.block<=confirmed&&/^\d+$/.test(v.total))saved={block:v.block,total:BigInt(v.total)};}catch{}
 const sum=logs=>logs.reduce((n,l)=>n+events.parseLog(l).args.tokensBurned,0n);
 async function scan(from,to){try{return sum(await provider.getLogs({address,topics:[events.getEvent('Executed').topicHash],fromBlock:from,toBlock:to}));}catch(e){if(to-from<64)throw e;const mid=Math.floor((from+to)/2);return await scan(from,mid)+await scan(mid+1,to);}}
 for(let from=saved.block+1;from<=confirmed;from+=2000){const to=Math.min(confirmed,from+1999);saved.total+=await scan(from,to);saved.block=to;try{storage?.setItem(key,JSON.stringify({block:saved.block,total:String(saved.total)}));}catch{}}
 return saved.total+(confirmed<head?await scan(Math.max(start,confirmed+1),head):0n);
}
