import {Interface,keccak256} from '../vendor/ethers-6.15.0.js';
const same=(a,b)=>String(a).toLowerCase()===String(b).toLowerCase();
function assert(ok,message){if(!ok)throw Error(message);}
export function maskedRuntime(code,artifact){
 let hex=code.toLowerCase().slice(2);
 for(const entries of Object.values(artifact.immutableReferences))for(const {start,length} of entries)hex=hex.slice(0,start*2)+'0'.repeat(length*2)+hex.slice((start+length)*2);
 return '0x'+hex;
}
export async function verifyDeployment(plan,artifacts,rpc,hashes){
 const read=async(address,name,method,args=[])=>{const i=new Interface(artifacts[name].abi);return i.decodeFunctionResult(method,await rpc('eth_call',[{to:address,data:i.encodeFunctionData(method,args)},'latest']));};
 const receipts=[];
 for(let n=0;n<2;n++){
  assert(hashes[n],'Both deployment confirmations are required');
  const [r,t]=await Promise.all([rpc('eth_getTransactionReceipt',[hashes[n]]),rpc('eth_getTransactionByHash',[hashes[n]])]);
  assert(r&&t&&BigInt(r.status)===1n,'Deployment is pending or reverted');
  const expected=plan.transactions[n];
  assert(same(t.from,plan.owner)&&BigInt(t.nonce)===BigInt(expected.nonce)&&same(t.input||t.data,expected.data)&&BigInt(t.value)===0n,'Deployment transaction differs from the reviewed plan');
  assert(n===0?!t.to:same(t.to,plan.helper),'Unexpected deployment destination');
  if(n===0)assert(same(r.contractAddress,plan.helper),'Helper address mismatch');
  receipts.push(r);
 }
 const all=[{address:plan.helper,contract:'MoreForgeDeployerV2'},...plan.sizes];
 await Promise.all(all.map(async({address,contract})=>{
  const code=await rpc('eth_getCode',[address,'latest']),a=artifacts[contract];
  assert(code!=='0x'&&code.length===a.runtime.length,'Missing or incorrect runtime: '+contract);
  assert(keccak256(maskedRuntime(code,a))===keccak256(maskedRuntime(a.runtime,a)),'Runtime mismatch: '+contract);
 }));
 const [helperOwner]=await read(plan.helper,'MoreForgeDeployerV2','owner');
 const [commit]=await read(plan.helper,'MoreForgeDeployerV2','planHash');
 const [executed]=await read(plan.helper,'MoreForgeDeployerV2','executed');
 assert(same(helperOwner,plan.owner)&&same(commit,plan.planHash)&&executed,'Helper commitment verification failed');
 const c=plan.contracts;
 const ownables=[[c.position,'MoreForgePositionV2'],[c.bitcoinVault,'MoreBitcoinRewardVaultV2'],...[c.fuelBurner,c.moreBurner,c.pampBurner].map(a=>[a,'ForkBurnEngine'])];
 for(const [a,name] of ownables)assert(same((await read(a,name,'owner'))[0],plan.owner),'Owner mismatch');
 for(const [method,value] of [['more',plan.more],['priceOracle',c.feeQuote],['feeReceiver',c.feeRouter]])assert(same((await read(c.position,'MoreForgePositionV2',method))[0],value),'Position wiring mismatch: '+method);
 for(const [method,value] of [['feeBps',10000n],['minFeeWei',BigInt(plan.minFeeWei)],['maxFeeWei',BigInt(plan.maxFeeWei)]])assert((await read(c.position,'MoreForgePositionV2',method))[0]===value,'Fee policy mismatch');
 assert((await read(c.position,'MoreForgePositionV2','feeBoundsEnabled'))[0],'Fee bounds are disabled');
 const vaults=[c.vault8,c.vault28,c.vault88,c.bitcoinVault];
 for(let n=0;n<4;n++){
  const name=n===3?'MoreBitcoinRewardVaultV2':'MorePositionRewardVaultV2';
  assert(same((await read(vaults[n],name,'positions'))[0],c.position),'Vault position mismatch');
  assert((await read(vaults[n],name,'launchTime'))[0]===BigInt(plan.anchor),'Cycle anchor mismatch');
  assert((await read(vaults[n],name,'cycleDuration'))[0]===BigInt([8,28,88,288][n]*86400),'Cycle duration mismatch');
  assert(same((await read(c.settlementBatcher,'MoreSettlementBatcherV2',n===3?'bitcoin':'vaults',n===3?[]:[n]))[0],vaults[n]),'Settlement helper mismatch');
 }
 assert(same((await read(c.bitcoinVault,'MoreBitcoinRewardVaultV2','rewardToken'))[0],plan.bitcoinToken),'Bitcoin token mismatch');
 const controllers=[c.fuelBurner,c.moreBurner,c.pampBurner,c.bitcoinVault];
 for(let n=0;n<4;n++){
  assert(same((await read(controllers[n],n===3?'MoreBitcoinRewardVaultV2':'ForkBurnEngine','adapter'))[0],c['adapter'+n]),'Adapter mismatch');
  assert(same((await read(c['adapter'+n],'ForkSwapAdapter','controller'))[0],controllers[n]),'Adapter controller mismatch');
 }
 const fields=['eightDayVault','twentyEightDayVault','eightyEightDayVault','bitcoinVault','fuelBurner','moreBurner','pampBurner','development'];
 const expected=[...vaults,...controllers.slice(0,3),plan.owner];
 for(let n=0;n<fields.length;n++)assert(same((await read(c.feeRouter,'MoreFeeRouter',fields[n]))[0],expected[n]),'Fee recipient mismatch');
 const paused=(await read(c.position,'MoreForgePositionV2','entriesPaused'))[0];
 return {receipts,paused,manifest:{version:2,status:'deployed',entriesEnabled:false,chainId:plan.chainId,owner:plan.owner,more:plan.more,bitcoinToken:plan.bitcoinToken,position:c.position,helper:c.settlementBatcher,contracts:c,vaults,burners:controllers.slice(0,3),launchTime:plan.anchor,siteOpeningTime:1,deploymentBlock:Number(BigInt(receipts[1].blockNumber)),feeBps:10000,feeBoundsEnabled:true,minFeeWei:plan.minFeeWei,maxFeeWei:plan.maxFeeWei}};
}
