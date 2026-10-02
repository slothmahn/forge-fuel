import {formatUnits} from './vendor/ethers-6.15.0.js';

// Format display amounts with integer arithmetic. Transaction values stay untouched.
export function displayAmount(raw,decimals=18,precision=6){
 const signed=BigInt(raw),value=signed<0n?-signed:signed;
 precision=Math.min(precision,decimals);
 const exact=formatUnits(value,decimals),fraction=exact.split('.')[1]||'';
 if(value>0n&&value<10n**BigInt(decimals)){
  const first=fraction.search(/[1-9]/);if(first>=0)precision=Math.min(decimals,Math.max(precision,first+3));
 }
 const factor=10n**BigInt(decimals-precision),rounded=(value+factor/2n)/factor,scale=10n**BigInt(precision);
 const integer=(rounded/scale).toLocaleString(),tail=(rounded%scale).toString().padStart(precision,'0').replace(/0+$/,'');
 const separator=new Intl.NumberFormat().formatToParts(1.1).find(p=>p.type==='decimal')?.value||'.';
 return (signed<0n?'-':'')+integer+(tail?separator+tail:'');
}
export function amountText(element,value,unit,precision=6,decimals=18,prefix=''){
 element.textContent=prefix+displayAmount(value,decimals,precision)+' '+unit;
 element.title='Exact amount: '+formatUnits(value,decimals)+' '+unit;
}
