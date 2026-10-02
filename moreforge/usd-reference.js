import {formatUnits} from './vendor/ethers-6.15.0.js';

const assets={MORE:{attribute:'data-usd-more',decimals:18},NATIVE:{attribute:'data-usd-native',decimals:18},BTC:{attribute:'data-usd-btc',decimals:8}};
export function referenceValue(parts,prices){
  let total=0;
  for(const [key,amount] of Object.entries(parts)){
    const asset=assets[key];if(!asset)return null;
    const quantity=Number(formatUnits(amount,asset.decimals));
    if(!Number.isFinite(quantity)||quantity<0)return null;
    if(quantity===0)continue;
    const price=Number(prices[key]);if(!Number.isFinite(price)||price<=0)return null;
    total+=quantity*price;
  }
  return Number.isFinite(total)?total:null;
}
export function referenceText(value){
  if(value===null)return 'USD reference unavailable';
  if(value>0&&value<0.000001)return '< $0.000001 USD reference';
  return '≈ '+value.toLocaleString(undefined,{style:'currency',currency:'USD',minimumFractionDigits:2,maximumFractionDigits:value>0&&value<0.01?6:2})+' USD reference';
}
export function referenceMarkup(parts){
  const attributes=Object.entries(parts).map(([key,amount])=>{
    if(!assets[key])throw Error('Unknown reference asset');
    return assets[key].attribute+'="'+BigInt(amount).toString()+'"';
  }).join(' ');
  return '<small class="usd-reference" '+attributes+'>USD reference unavailable</small>';
}
export function setReference(element,parts){
  for(const asset of Object.values(assets))element.removeAttribute(asset.attribute);
  for(const [key,amount] of Object.entries(parts))element.setAttribute(assets[key].attribute,BigInt(amount).toString());
}
export function refreshReferences(root,prices){
  for(const element of root.querySelectorAll('[data-usd-more],[data-usd-native],[data-usd-btc]')){
    const parts={};for(const [key,asset] of Object.entries(assets))if(element.hasAttribute(asset.attribute))parts[key]=element.getAttribute(asset.attribute);
    element.textContent=referenceText(referenceValue(parts,prices));
  }
}
export function clearReferences(root){
  for(const element of root.querySelectorAll('[data-usd-more],[data-usd-native],[data-usd-btc]')){
    for(const asset of Object.values(assets))element.removeAttribute(asset.attribute);
    element.textContent='—';
  }
}
