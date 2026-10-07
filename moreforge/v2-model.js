import {parseUnits,isAddress} from './vendor/ethers-6.15.0.js';
export const DAY=86400n,MAX=2n**256n-1n;
export const positionAbi=[
 'function name() view returns(string)','function owner() view returns(address)','function more() view returns(address)',
 'function priceOracle() view returns(address)','function feeReceiver() view returns(address)','function dayDuration() view returns(uint256)',
 'function requiredFee(uint256) view returns(uint256)','function previewPower(uint256,uint256,uint256) pure returns(uint256)',
 'function createPosition(uint256,uint256,uint256) payable returns(uint256)','function nextTokenId() view returns(uint256)',
 'function positions(uint256) view returns(uint256 principal,uint256 initialPower,uint256 createdAt,uint256 maturity,uint256 closedAt,address beneficiary)',
 'function rewardOwner(uint256) view returns(address)','function ownerOf(uint256) view returns(address)',
 'function currentPrincipal(uint256) view returns(uint256)','function withdraw(uint256)','function finalizeExpired(uint256)',
 'function safeTransferFrom(address,address,uint256)','function entriesPaused() view returns(bool)',
 'function feeBps() view returns(uint256)','function feeBoundsEnabled() view returns(bool)',
 'function setFeePolicy(uint256,bool,uint256,uint256)',
 'function minFeeWei() view returns(uint256)','function maxFeeWei() view returns(uint256)'
];
export function amount(raw,label){
 if(!/^\d+(?:\.\d{0,18})?$/.test(raw))throw Error(`${label}: enter a number with up to 18 decimals.`);
 const n=parseUnits(raw,18);if(n>MAX)throw Error(`${label} is too large.`);return n;
}
export function inputs(principal,burn,days){
 const locked=amount(principal,'Principal'),burned=amount(burn,'Optional burn'),term=Number(days);
 if(locked<=0n||locked>MAX/1000n)throw Error('Enter a positive principal within the contract limit.');
 if(!Number.isInteger(term)||term<8||term>1000)throw Error('Choose a lock duration from 8 to 1,000 days.');
 if(burned>locked*3n)throw Error('Optional burn cannot exceed 3× the locked principal.');
 return{principal:locked,burned,days:term,total:locked+burned,power:locked+locked*BigInt(term-8)/992n+burned};
}
export function remaining(original,maturity,timestamp){
 const late=BigInt(timestamp)-maturity;
 if(late<=7n*DAY)return original;
 if(late>=14n*DAY)return 0n;
 return original*(14n*DAY-late)/(7n*DAY);
}
export function powerAt(p,when){
 const t=BigInt(when);
 if(t<=p.created||(p.closed!==0n&&p.closed<t))return 0n;
 return remaining(p.power,p.maturity,t);
}
export function feeForValue(value,policy){
 if(value<=0n)throw Error('A positive on-chain MORE quote is required.');
 let fee=value*BigInt(policy.bps)/10000n;
 if(policy.bounds)fee=fee<BigInt(policy.min)?BigInt(policy.min):fee>BigInt(policy.max)?BigInt(policy.max):fee;
 if(fee<=0n)throw Error('Fee quote is too small.');return fee;
}
export function validateManifest(m,legacy){
 if(m?.version!==2||m.status!=='deployed')throw Error('V2 deployment is not available.');
 if(m.chainId!==legacy.chainId)throw Error('V2 deployment chain mismatch.');
 if(m.more?.toLowerCase()!==legacy.more.toLowerCase()||m.bitcoinToken?.toLowerCase()!==legacy.bitcoinToken.toLowerCase())throw Error('V2 token identity mismatch.');
 const addresses=[m.position,m.helper,m.more,m.bitcoinToken,m.owner,m.contracts?.feeQuote,m.contracts?.feeRouter,m.contracts?.mainQuote,...(m.vaults||[]),...(m.burners||[])];
 if(m.vaults?.length!==4||m.burners?.length!==(m.noPamp?2:3)||addresses.some(a=>!isAddress(a)||/^0x0{40}$/i.test(a)))throw Error('Incomplete V2 deployment manifest.');
 const old=new Set([legacy.position,legacy.helper,...legacy.vaults,...legacy.burners].map(a=>a.toLowerCase()));
 if([m.position,m.helper,...m.vaults,...m.burners].some(a=>old.has(a.toLowerCase())))throw Error('V1 contracts cannot be used by the V2 interface.');
 if(!Number.isSafeInteger(m.launchTime)||m.launchTime<=0||m.launchTime%86400!==17*3600)throw Error('Invalid fixed-UTC cycle anchor.');
 if(!Number.isSafeInteger(m.siteOpeningTime)||m.siteOpeningTime<=0)throw Error('Missing entry opening time.');
 if(!Number.isSafeInteger(m.deploymentBlock)||m.deploymentBlock<=0)throw Error('Missing V2 deployment block.');
}
export async function readV2Positions(position,next,options){
 const result=[];
 // Lifecycle fields are mutable. Refresh them rather than caching closedAt/beneficiary.
 for(let start=1n;start<next;start+=25n){
  const ids=[];for(let id=start;id<next&&id<start+25n;id++)ids.push(id);
  result.push(...await Promise.all(ids.map(async id=>{
   const [p,owner]=await Promise.all([position.positions(id,options),position.rewardOwner(id,options)]);
   return{id,principal:p.principal,power:p.initialPower,created:p.createdAt,maturity:p.maturity,closed:p.closedAt,owner};
  })));
 }
 return result;
}
export async function readV2Claims(v,record,owned,launch,options){
 const candidates=[];
 record.ids.forEach((cycle,j)=>{
  if(!record.states[j].settled)return;
  const deadline=BigInt(launch)+cycle*BigInt(record.pool.days)*DAY;
  for(const p of owned)if(powerAt(p,deadline)>0n)candidates.push({pool:record.pool.i,cycle,id:p.id});
 });
 const claims=[];
 for(let start=0;start<candidates.length;start+=40){
  const batch=candidates.slice(start,start+40),values=await Promise.all(batch.map(c=>v.claimable(c.cycle,c.id,options)));
  batch.forEach((c,i)=>{if(values[i]>0n)claims.push({...c,value:values[i]});});
 }
 return claims;
}
