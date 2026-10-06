import {loadFuelMarketPrices} from '../assets/fuel-market-prices.js';
// Same shared loader as the live Fuel Forge sites. Market prices never set fees.
const pairs={fuel:'0x2431dfc276af9c5c3bb5a091d2be19cf518e2467',bitcoin:'0x5ca009013f6b898d134b6798b336a4592f3b4af2'};
const price=n=>n>0?'$'+new Intl.NumberFormat('en-US',{minimumFractionDigits:n>=1?2:0,maximumFractionDigits:n>=1?2:10}).format(n):'Unavailable';
let pending;
function refresh(){if(pending)return pending;pending=loadFuelMarketPrices({chain:'avalanche',pairs,onUpdate(quotes,state){
for(const key of Object.keys(pairs))document.getElementById(`avax-${key}-price`).textContent=quotes[key]?price(quotes[key].price):state.loading?'Loading…':'Unavailable';
const ref=quotes.bitcoin||quotes.fuel;document.getElementById('avax-native-price').textContent=ref?price(ref.price/ref.native):state.loading?'Loading…':'Unavailable';
const checked=Object.values(quotes).map(q=>q.checkedAt);
document.getElementById('avax-price-status').textContent=(state.loading?'Refreshing market references':state.failed?'Price service delayed · showing available references':'DexScreener market references')+(checked.length?' · checked '+new Date(Math.min(...checked)).toLocaleTimeString():'')+'. These prices do not set on-chain fees.';
}}).finally(()=>{pending=null});return pending;}
refresh();document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
