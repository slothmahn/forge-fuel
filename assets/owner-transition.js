import {Contract,keccak256} from '../moreforge/vendor/ethers-6.15.0.js';
export const ZERO_OWNER='0x0000000000000000000000000000000000000000';
const same=(a,b)=>typeof a==='string'&&typeof b==='string'&&a.toLowerCase()===b.toLowerCase();
export function expectedOwner(actual,label,m){
 const t=m.ownershipTransition;
 if(same(actual,m.owner))return actual;
 if(t?.renounce?.includes(label)&&same(actual,ZERO_OWNER))return actual;
 if(t?.burners?.includes(label)&&same(actual,t.controller))return actual;
 throw Error('Unexpected contract owner: '+label);
}
export function burnControl(actual,account,m){
 if(same(actual,account))return 'owner';
 const t=m.ownershipTransition;
 return t&&same(actual,t.controller)&&same(account,t.manager)?'drip':'';
}
export async function verifyDripController(provider,m){
 const t=m.ownershipTransition;if(!t)return;
 if(keccak256(await provider.getCode(t.controller))!==t.codeHash)throw Error('Drip controller code mismatch.');
 const c=new Contract(t.controller,['function rateManager() view returns(address)','function isBurnEngine(address) view returns(bool)'],provider);
 if(!same(await c.rateManager(),t.manager))throw Error('Drip manager mismatch.');
 const checks=await Promise.all(t.burners.map(k=>c.isBurnEngine(m.contracts[k])));
 if(checks.some(v=>!v))throw Error('Drip controller registry mismatch.');
}
export async function setBurnDrip(signer,m,engine,bps){
 const burner=new Contract(engine,['function owner() view returns(address)','function setDailyPoolBps(uint256)'],signer),owner=await burner.owner(),account=await signer.getAddress(),mode=burnControl(owner,account,m);
 if(!mode)throw Error('This wallet cannot change the drip.');
 if(mode==='owner')return burner.setDailyPoolBps(bps);
 await verifyDripController(signer.provider,m);
 return new Contract(m.ownershipTransition.controller,['function setDailyPoolBps(address,uint256)'],signer).setDailyPoolBps(engine,bps);
}
