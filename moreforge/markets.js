'use strict';
// Same public DexScreener pair references used by Fuel Forge; no wallet calls.
(()=>{
 const networks={
  rh:{chain:'robinhood',native:'ETH',btc:'cbBTC',pairs:{FUEL:'0xff40c99525ffa6b6cf79ecbe370ef7c887d68f69',MORE:'0xd77dcda732a762ec8b04ee44a1c7370602759d2372037a5008135ab9f60305ef',PAMP:'0xc774a953079b7411f313a2d23ecacafb19682b6e',BTC:'0xd30e44aae604b42a63f6f9a8109fd0408f35b9fb'}},
  pls:{chain:'pulsechain',native:'PLS',btc:'wBTC',pairs:{FUEL:'0x0bB20331f424e59612668f3294A23CAa83CC06ef',MORE:'0x3D3B080A1Ec1AFc121a27AE4cBad17A14E80f7B5',PAMP:'0x5A6ed52a40983BDE815Cffe445F2175E80456F6B',BTC:'0x8c52470a05eEB2fCe4905688Ec59bFDd32E71D07'}},
  eth:{chain:'ethereum',native:'ETH',btc:'wBTC',pairs:{MORE:'0x745f836a293544db638a897e14b455f64c4147129a27b1959d910c49a326f94a',BTC:'0x4585fe77225b41b697c938b018e2ac67ac5a20c0'}}
 };
 const strip=document.createElement('div');strip.className='market-strip';strip.setAttribute('aria-label','Chain token market prices');document.querySelector('.preview-notice').after(strip);
 let requestId=0;const cache={};
 const price=n=>Number.isFinite(n)&&n>0?(n<1?'$'+n.toPrecision(6).replace(/0+$/,'').replace(/\.$/,''):'$'+n.toLocaleString('en-US',{maximumFractionDigits:2})):'Unavailable';
 function render(key,quotes={},status='Checking DexScreener…'){
  const network=networks[key];
  window.dispatchEvent(new CustomEvent('more-market-prices',{detail:{key,quotes}}));
  if(!network){strip.innerHTML='<small>AVAX · future chain. Token markets are not configured.</small>';return;}
  const entries=[['FUEL','FUEL'],['MORE','MORE'],[network.native,'NATIVE'],[network.btc,'BTC'],...(key==='rh'||key==='pls'?[['PAMP','PAMP']]:[])];
  strip.innerHTML=entries.map(([symbol,id])=>{
   const pair=network.pairs[id==='NATIVE'?'BTC':id];
   return pair?`<a href="https://dexscreener.com/${network.chain}/${pair}" target="_blank" rel="noopener noreferrer"><b>${symbol}</b><span>${quotes[id]===undefined?(status.startsWith('Checking')?'Checking…':'Unavailable'):price(quotes[id])}</span></a>`:`<span><b>${symbol}</b> Market pending</span>`;
  }).join('')+`<div class="market-status"><span>${status}</span><button class="refresh-prices" type="button">Refresh prices</button></div><p class="market-note">Live market prices power the calculator. Pool balances, deadlines and position power remain simulated. Fees shown are estimates; execution requires an on-chain quote.</p>`;
  strip.querySelector('.refresh-prices').onclick=()=>refresh(true);
 }
 async function refresh(force=false){
  const id=++requestId,key=document.querySelector('#chain').value,network=networks[key];
  if(!network){render(key);return;}
  if(!force&&cache[key]&&Date.now()-cache[key].time<60000){render(key,cache[key].quotes,cache[key].status);return;}
  render(key,{},'Checking DexScreener…');
  const results=await Promise.allSettled(Object.entries(network.pairs).map(async([symbol,pair])=>{
   const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),8000);
   try{
    const response=await fetch(`https://api.dexscreener.com/latest/dex/pairs/${network.chain}/${pair}`,{signal:controller.signal});if(!response.ok)throw Error('Price service unavailable');
    const data=await response.json(),quote=data.pairs?.find(p=>p.chainId===network.chain&&p.pairAddress.toLowerCase()===pair.toLowerCase());
    const usd=Number(quote?.priceUsd),native=Number(quote?.priceNative);if(!(Number.isFinite(usd)&&usd>0&&Number.isFinite(native)&&native>0))throw Error('Quote unavailable');
    return {symbol,usd,native};
   }finally{clearTimeout(timer);}
  }));
  const quotes={};for(const result of results)if(result.status==='fulfilled'){const q=result.value;quotes[q.symbol]=q.usd;if(q.symbol==='BTC')quotes.NATIVE=q.usd/q.native;}
  const complete=results.every(r=>r.status==='fulfilled');
  const status=`DexScreener · checked ${new Date().toLocaleTimeString()}${complete?'':' · some prices unavailable'}`;
  cache[key]={time:Date.now(),quotes,status};if(id===requestId&&document.querySelector('#chain').value===key)render(key,quotes,status);
 }
 window.addEventListener('more-chain-change',()=>refresh());
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 setInterval(()=>{if(!document.hidden)refresh();},60000);refresh();
})();
