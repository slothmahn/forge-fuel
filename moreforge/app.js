'use strict';
const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
const f=(n,d=4)=>!Number.isFinite(n)?'—':new Intl.NumberFormat('en-US',{maximumFractionDigits:d}).format(Number(n.toPrecision(12)));
const money=n=>f(n,n>0&&n<1?6:2);
const config={rh:{name:'Robinhood',unit:'ETH',usd:NaN,btc:'cbBTC'},pls:{name:'PulseChain',unit:'PLS',usd:NaN,btc:'wBTC'},eth:{name:'Ethereum',unit:'ETH',usd:NaN,btc:'wBTC'},avax:{name:'Avalanche',unit:'AVAX',usd:NaN,btc:'BTC token · pending'}};
const poolWeights=[{days:8,bps:2688,balanceUsd:1500,left:3},{days:28,bps:2268,balanceUsd:2500,left:15},{days:88,bps:1764,balanceUsd:4500,left:35},{days:288,bps:1680,balanceUsd:6000,left:21,bitcoin:true}];
let bitcoinUsd=NaN;
const poolUnit=p=>p.bitcoin?selected().btc:selected().unit;
const poolPrice=p=>p.bitcoin?bitcoinUsd:selected().usd;
let moreUsd=NaN;
const sampleBalance='12000000', existingPower=5000000;
const livePricesReady=()=>[moreUsd,selected().usd,bitcoinUsd].every(n=>Number.isFinite(n)&&n>0);
const sampleClaims={rh:false,pls:false,eth:false};
let reviewingClaimChain=null;
let rates={MORE:1,FUEL:1,PAMP:1};
const selected=()=>config[$('#chain').value];
function values(){const raw=Number($('#amount').value);const days=Number($('#term').value);const valid=Number.isFinite(raw)&&raw>0&&raw<=Number(sampleBalance)&&Number.isInteger(days)&&days>=8&&days<=1000;const amount=valid?raw:0, term=Number.isFinite(days)?Math.max(8,Math.min(1000,Math.trunc(days))):8;const bigger=1+Math.min(amount/1000,1),longer=1+1.5*(term-8)/992,power=amount*bigger*longer,feeUsd=amount*moreUsd;return{amount,term,bigger,longer,power,feeUsd,fee:feeUsd/selected().usd,share:power/(existingPower+power),valid};}
function update(){const v=values(),c=selected();$('#burn-value').textContent=`${f(v.amount)} MORE ≈ $${money(v.feeUsd)}`;$('#native-fee').textContent=`≈ ${f(v.fee,8)} ${c.unit} · $${money(v.feeUsd)}`;$('#total-cost').textContent=`≈ $${money(v.feeUsd*2)} USD`;$('#multiplier').textContent=`${f(v.bigger*v.longer,3)}×`;$('#power').textContent=`${f(v.power)} power`;$('#power-ring').style.setProperty('--power-angle',`${v.valid?Math.min(1,v.bigger*v.longer/5)*360:0}deg`);$('#share').textContent=`${f(v.share*100,4)}%`;$('#amount-bonus').textContent=`${f(v.bigger,4)}×`;$('#term-bonus').textContent=`${f(v.longer,4)}×`;$$('[data-term]').forEach(b=>b.classList.toggle('active',Number(b.dataset.term)===v.term));$('#payouts').innerHTML=poolWeights.map(p=>{const eligible=v.term>=p.left,payout=eligible?(p.balanceUsd+v.feeUsd*p.bps/10000)*.9975*v.share:0;return `<div><b>${p.days} Day<small>Closes in ${p.left}d · sample</small></b><div><strong>${eligible?'≈ '+f(payout/poolPrice(p),8)+' '+poolUnit(p):'Term too short'}</strong><small>${eligible?'≈ $'+f(payout,2)+' USD':'Closes in '+p.left+' sample days'}</small></div></div>`}).join('');$('#build-form .primary-button').disabled=!v.valid||!livePricesReady();drawPools(v);drawTermEstimate(v);$('#hero-native').textContent='$'+c.unit;$('#hero-bitcoin').textContent=c.btc.includes('pending')?'BTC · pending':'$'+c.btc;$('.native-symbol').textContent=c.unit==='ETH'?'◇':c.unit==='PLS'?'⬡':'△';drawBurns();drawRewards();if(!livePricesReady())showMissingPrices();}
function claimAmounts(){
 const key=$('#chain').value,available=key in sampleClaims,claimed=sampleClaims[key]===true;
 const native=key==='pls'?[100000,200000,300000]:[.002,.003,.005];
 const amounts=available&&!claimed?[...native,.00002]:[0,0,0,0];
 return {key,available,claimed,amounts,native:amounts[0]+amounts[1]+amounts[2],bitcoin:amounts[3]};
}
function claimValue(r){return Number.isFinite(selected().usd)&&Number.isFinite(bitcoinUsd)?r.native*selected().usd+r.bitcoin*bitcoinUsd:NaN;}
function drawRewards(){
 const c=selected(),r=claimAmounts();
 $('#claim-totals').innerHTML=`<div><span>${c.unit} rewards</span><strong>${f(r.native,8)} ${c.unit}</strong><small>8-, 28- and 88-day pools</small></div><div><span>Bitcoin rewards</span><strong>${f(r.bitcoin,8)} ${r.available?c.btc:'Bitcoin · pending'}</strong><small>288-day pool</small></div>`;
 $('#claim-usd').textContent=r.available?(Number.isFinite(claimValue(r))?'≈ $'+money(claimValue(r))+' USD':'Waiting for live prices'):'Example not configured';
 $('#claim-cycles').innerHTML=poolWeights.map((p,i)=>`<div><span><b>${p.days}-Day ${p.bitcoin?'Bitcoin ':''}Pool</b><small>${r.available?(r.claimed?'Sample claimed':'Sample cycle settled'):'Future chain'}</small></span><strong>${f(r.amounts[i],8)} ${r.available?poolUnit(p):(p.bitcoin?'BTC':c.unit)}</strong></div>`).join('');
 $('#claim-open').disabled=!r.available||r.claimed;
 $('#claim-open').textContent=r.claimed?'Sample rewards claimed':'Preview claim';
 $('#claim-reset').hidden=!r.claimed;
 $('#claim-status').textContent=!r.available?'Avalanche rewards will be available once its markets and contracts are configured.':r.claimed?'Sample claim complete. Your available rewards are now zero.':'Four settled sample cycles · ready to claim together.';
}
$('#claim-open').onclick=()=>{
 const r=claimAmounts();if(!r.available||r.claimed)return;
 reviewingClaimChain=r.key;
 $('#claim-review-body').textContent=`Sample position #1 · ${selected().name}\n\n${f(r.native,8)} ${selected().unit} + ${f(r.bitcoin,8)} ${selected().btc}\n${Number.isFinite(claimValue(r))?'≈ $'+money(claimValue(r))+' USD at live market prices':'USD estimate waiting for live prices'}\n\nClaim rewards from the four settled sample cycles together.`;
 $('#claim-review').showModal();
};
$('#claim-confirm').onclick=()=>{
 if(reviewingClaimChain===$('#chain').value&&reviewingClaimChain in sampleClaims){sampleClaims[reviewingClaimChain]=true;drawRewards();}
 reviewingClaimChain=null;$('#claim-review').close();
};
$('.claim-dialog-close').onclick=()=>{reviewingClaimChain=null;$('#claim-review').close();};
$('#claim-reset').onclick=()=>{if($('#chain').value in sampleClaims)sampleClaims[$('#chain').value]=false;drawRewards();};
function burnIcon(symbol){return `assets/${symbol.toLowerCase()}-token.jpg`;}
function drawBurns(){
 const c=selected();
 $('#burn-overview').innerHTML=`<div class="burn-total"><span>${c.unit} IN BURN POOLS</span><strong>${f(1500/c.usd,6)} ${c.unit}</strong><small>≈ $1,500 USD · sample balance</small></div><div class="burn-flow"><span>Protocol fee</span><b>→</b><span>84% payout pools · 15% buy &amp; burn · 1% development</span><b>→</b><span>10-minute burn intervals</span></div>`;
 $('#burn-cards').innerHTML=['FUEL','MORE','PAMP'].map(symbol=>{
 const balance=500/c.usd,gross=balance*rates[symbol]/100/144;
 return `<article class="card burn-card"><div class="burn-heading"><img class="burn-token-icon" src="${burnIcon(symbol)}" alt="${symbol} logo" width="56" height="56"><div><small>${symbol} BURN POOL</small><h3>${symbol} Buy &amp; Burn</h3></div></div><div class="burn-settings"><span class="burn-share"><strong>5%</strong> of protocol fees</span><span class="burn-drip"><label for="drip-${symbol}" class="sr-only">${symbol} daily drip · preview operator setting</label><select id="drip-${symbol}" data-drip="${symbol}">${Array.from({length:10},(_,i)=>`<option value="${i+1}" ${rates[symbol]===i+1?'selected':''}>${i+1}% daily drip</option>`).join('')}</select></span></div><div class="burn-balance"><span>Burn Pool Balance · sample</span><strong>${f(balance,6)} ${c.unit}</strong><small>≈ $500 USD · sample value</small></div><div class="burn-row"><span>Next burn</span><strong>${f(gross,10)} ${c.unit}<small>≈ $${f(gross*c.usd,4)} USD · one sample interval</small></strong></div><div class="burn-row"><span>Caller reward (1.5%)</span><strong>${f(gross*.015,12)} ${c.unit}<small>≈ $${f(gross*.015*c.usd,6)} USD</small></strong></div><div class="burn-row"><span>Next interval</span><strong class="burn-preview-status">SIMULATED · 10 MIN</strong></div><div class="burn-row"><span>Total ${symbol} burned</span><strong>—<small>Available after deployment</small></strong></div><div class="burn-row"><span>Swap &amp; burn budget</span><strong>${f(gross*.985,10)} ${c.unit}<small>≈ $${f(gross*.985*c.usd,4)} USD</small></strong></div><div class="burn-actions"><button class="primary-button" data-burn="${symbol}">Preview burn</button><span>Contract not deployed</span></div></article>`;
 }).join('');
 $$('[data-drip]').forEach(e=>e.onchange=()=>{rates[e.dataset.drip]=Number(e.value);drawBurns()});
 $$('[data-burn]').forEach(e=>e.onclick=()=>show(`Buy & burn ${e.dataset.burn}`,`5% of every protocol fee funds this pool. The operator may set a 1–10% daily drip. Eligible callers receive the existing 1.5% execution incentive; the remainder swaps into ${e.dataset.burn} and goes to the burn address.\n\nSample only. No swap, burn or wallet request occurs.`));
}
function show(title,body){$('#review-title').textContent=title;$('#review-body').textContent=body;$('#review').showModal();}
$('#review-close').onclick=$('.dialog-close').onclick=()=>$('#review').close();
$('#build-form').onsubmit=e=>{e.preventDefault();const v=values();if(!v.valid||!livePricesReady())return;show('Review your MORE Forge position',`${f(v.amount)} MORE permanently burned (live market value $${money(v.feeUsd)}).\nSeparate protocol fee: ${f(v.fee,8)} ${selected().unit}, equal to $${money(v.feeUsd)}.\nCombined entry value: $${money(v.feeUsd*2)} before gas.\nReward term: ${v.term} days. Proposed power: ${f(v.power)}.\n\nThere is no principal refund. Fee routing is fixed at 84% payout pools, 1% development and 5% each for MORE/FUEL/PAMP buy & burn. The bonus formula is proposed. This demo never opens your wallet.`)};
$('#amount').oninput=()=>{let s=$('#amount').value.replace(/[^0-9.]/g,'');let[a,...b]=s.split('.');$('#amount').value=a+(b.length?'.'+b.join('').slice(0,18):'');update()};$('#term').oninput=update;$('#chain').onchange=()=>{moreUsd=NaN;bitcoinUsd=NaN;selected().usd=NaN;update();window.dispatchEvent(new Event('more-chain-change'));};$('#max-amount').onclick=()=>{$('#amount').value=sampleBalance;update()};$('#max-term').onclick=()=>{$('#term').value='1000';update()};$$('[data-term]').forEach(b=>b.onclick=()=>{$('#term').value=b.dataset.term;update()});
$$('[data-tab]').forEach(b=>b.onclick=()=>{$$('[data-tab]').forEach(t=>t.setAttribute('aria-selected',String(t===b)));$$('[role=tabpanel]').forEach(p=>p.hidden=p.id!==`panel-${b.dataset.tab}`);$('.hero').hidden=b.dataset.tab!=='build';$('.burn-summary').hidden=b.dataset.tab!=='build';history.replaceState(null,'','#'+b.dataset.tab);});
$('#bonus-examples').innerHTML=[100,500,1000,2000].map(n=>{const m=1+Math.min(n/1000,1);return `<tr><td>${f(n)} MORE</td><td>${f(m,4)}×</td><td>${f(n*m)} power</td><td>${f(n*m*2.5)} power</td></tr>`}).join('');
function drawTermEstimate(v){
 const c=selected();let nativeUsd=0,btcUsd=0;
 $('#term-estimate-title').textContent=`Estimated rewards over your ${f(v.term,0)}-day term`;
 $('#term-payouts').innerHTML=poolWeights.map(p=>{
  const result=MoreForgeEstimates.termReward({term:v.term,firstDeadline:p.left,cycleDays:p.days,fundingUsd:p.balanceUsd,feeUsd:v.feeUsd,allocationBps:p.bps,share:v.share,valid:v.valid});
  if(p.bitcoin)btcUsd+=result.usd;else nativeUsd+=result.usd;
  return `<div><b>${p.days} Day<small>${result.count} eligible ${result.count===1?'deadline':'deadlines'}</small></b><div><strong>≈ ${f(result.usd/poolPrice(p),8)} ${poolUnit(p)}</strong><small>≈ $${f(result.usd,2)} USD</small></div></div>`;
 }).join('');
 $('#term-native-total').textContent=`≈ ${f(nativeUsd/c.usd,8)} ${c.unit}`;
 $('#term-bitcoin-total').textContent=`+ ${f(btcUsd/bitcoinUsd,8)} ${c.btc}`;
 $('#term-usd-total').textContent=`≈ $${f(nativeUsd+btcUsd,2)} USD combined`;
 $('#detail-burned').textContent=`${f(v.amount)} MORE`;
 $('#detail-term').textContent=`${f(v.term,0)} days`;
 $('#sample-calculation-prices').textContent=`Live market prices: MORE $${f(moreUsd,10)}; ${c.unit} $${f(c.usd,8)}; ${c.btc} $${f(bitcoinUsd,2)}. These are the same quotes used in the header. Pool funding, deadlines and existing power remain simulated.`;
}
update();
if(['#pools','#burns','#rewards'].includes(location.hash))$(`[data-tab="${location.hash.slice(1)}"]`).click();

function drawPools(v){
 const c=selected(),nativeUsd=poolWeights.filter(p=>!p.bitcoin).reduce((n,p)=>n+p.balanceUsd,0);
 $('#pool-overview').innerHTML=`<div><span>IN CURRENT FORGE CYCLES</span><strong>${f(nativeUsd/c.usd,6)} ${c.unit}</strong><b>≈ $${f(nativeUsd,2)} USD · sample</b><small>Across the 8-, 28- and 88-day pools</small></div><div><span>288-DAY BITCOIN CYCLE</span><strong>${f(6000/bitcoinUsd,8)} ${c.btc}</strong><b>≈ $6,000 USD · sample</b><small>Open to every eligible MORE position</small></div><div><span>YOUR PREVIEW POSITION</span><strong>${f(v.power)} power</strong><b>${f(v.share*100,4)}% estimated share after entry</b><small>${f(v.term,0)}-day term · simulated position</small></div>`;
 $('#pool-cards').innerHTML=poolWeights.map((p,i)=>{
 const eligible=v.valid&&v.term>=p.left,payout=eligible?(p.balanceUsd+v.feeUsd*p.bps/10000)*.9975*v.share:0,progress=(p.days-p.left)/p.days*100;
 return `<article class="card pool-card pool-tone-${i}"><div class="pool-top"><span>SAMPLE CYCLE</span><span class="pool-live">PREVIEW · ${c.name.toUpperCase()}</span></div><h3>${p.days}-Day ${p.bitcoin?'Bitcoin ':''}Pool</h3><div class="pool-value">${f(p.balanceUsd/poolPrice(p),8)} <small>${poolUnit(p)}</small></div><div class="pool-usd">≈ $${f(p.balanceUsd,2)} USD · sample balance</div><div class="pool-row"><span>Closes</span><strong>In ${p.left} days · sample</strong></div><div class="pool-row"><span>Your estimated share</span><strong>${eligible?f(v.share*100,4)+'%':v.valid?'Term ends before deadline':'Enter a valid burn'}</strong></div><div class="pool-row"><span>Estimated payout</span><strong>${f(payout/poolPrice(p),8)} ${poolUnit(p)}<small>≈ $${f(payout,2)} USD</small></strong></div><div class="progress-track" role="progressbar" aria-label="${p.days}-day sample cycle elapsed" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress.toFixed(1)}"><span style="width:${progress}%"></span></div><div class="pool-foot">${f(progress,1)}% of sample cycle elapsed · ${f(p.bps/100,2)}% of protocol fees</div></article>`;
 }).join('');
}

function showMissingPrices(){
 const message=$('#chain').value==='avax'?'Live markets not configured':'Waiting for live prices';
 $('#burn-value').textContent=`${f(values().amount)} MORE · ${message}`;
 $('#native-fee').textContent=message;$('#total-cost').textContent=message;
 $('#term-native-total').textContent=message;$('#term-bitcoin-total').textContent='';$('#term-usd-total').textContent='';
 $('#sample-calculation-prices').textContent='Live price estimates are unavailable until MORE, the native coin and Bitcoin quotes are received for this chain. No sample-price fallback is used.';
 ['#term-payouts','#payouts'].forEach(id=>$(id).innerHTML=poolWeights.map(p=>`<div><b>${p.days} Day</b><div><strong>${message}</strong></div></div>`).join(''));
 $$('#pool-cards .pool-value, #pool-cards .pool-usd, #pool-cards .pool-row:last-of-type strong').forEach(e=>e.textContent=message);
 $$('#pool-overview>div:not(:last-child) strong').forEach(e=>e.textContent=message);
 $$('#burn-cards .burn-balance strong, #burn-cards .burn-row:not(:nth-last-of-type(3)) strong, .burn-total>strong').forEach(e=>{if(e.textContent.includes('—'))e.textContent=message});
}
window.addEventListener('more-market-prices',e=>{
 if(e.detail.key!==$('#chain').value)return;
 moreUsd=e.detail.quotes.MORE??NaN;bitcoinUsd=e.detail.quotes.BTC??NaN;selected().usd=e.detail.quotes.NATIVE??NaN;update();
});
