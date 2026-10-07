import {Interface,AbiCoder,getCreateAddress,keccak256,ZeroAddress,toBeHex} from '../vendor/ethers-6.15.0.js';
export const OWNER='0x02A0d741FBaebC03A8f0d1A85670bf1CA8C15fA9';
export const NAMES=['MoreV4SpotQuote','MoreMultichainV3SpotQuote','MorePoolFeeQuote','MorePositionRewardVaultV2','MoreBitcoinRewardVaultV2','ForkBurnEngine','MoreFeeRouterNoPamp','MoreForgePositionV2','MoreMultichainSwapAdapter','MoreSettlementBatcherV2','MoreDailyBurnController','MoreForgeDeployerV2'];
export function buildPlan(chain,c,artifacts,nonce,timestamp){
 if(!['eth','avax'].includes(chain)||!Number.isSafeInteger(nonce)||nonce<0)throw Error('Invalid deployment identity');
 const helper=getCreateAddress({from:OWNER,nonce}),anchor=Math.floor((timestamp-17*3600)/86400)*86400+17*3600;
 const labels=['mainQuote','fuelQuote','bitcoinQuote','feeQuote','vault8','vault28','vault88','bitcoinVault','fuelBurner','moreBurner','feeRouter','position','fuelAdapter','moreAdapter','bitcoinAdapter','settlementBatcher','dripController'];
 const contracts=Object.fromEntries(labels.map((l,i)=>[l,getCreateAddress({from:helper,nonce:i+1})]));
 const templates=[],templateNames=[],creations=[],setup=[],records=[];
 const iface=name=>new Interface(artifacts[name].abi);
 function add(label,name,args){
  if(labels[creations.length]!==label)throw Error('Address order mismatch');
  let i=templateNames.indexOf(name);if(i<0){i=templates.length;templateNames.push(name);templates.push(artifacts[name].bytecode);}
  const constructorArgs=iface(name).encodeDeploy(args);
  if((artifacts[name].bytecode.length+constructorArgs.length-4)/2>49152||(artifacts[name].runtime.length-2)/2>24576)throw Error('Contract size exceeded');
  creations.push({templateIndex:i,constructorArgs,expectedAddress:contracts[label]});records.push({label,name,address:contracts[label],constructorArgs});
 }
 function call(label,name,fn,args=[]){setup.push({target:contracts[label],data:iface(name).encodeFunctionData(fn,args)});}
 const moreKey=[ZeroAddress,c.tokens[1],10000,200,ZeroAddress],empty=[ZeroAddress,ZeroAddress,0,0,ZeroAddress];
 add('mainQuote',chain==='eth'?'MoreV4SpotQuote':'MoreMultichainV3SpotQuote',chain==='eth'?[c.stateView,moreKey,ZeroAddress,c.tokens[1]]:[c.pools[1],c.native,c.tokens[1]]);
 add('fuelQuote','MoreMultichainV3SpotQuote',[c.pools[0],c.native,c.tokens[0]]);
 add('bitcoinQuote','MoreMultichainV3SpotQuote',[c.pools[2],c.native,c.tokens[2]]);
 add('feeQuote','MorePoolFeeQuote',[contracts.mainQuote,ZeroAddress]);
 for(const days of [8,28,88])add('vault'+days,'MorePositionRewardVaultV2',[contracts.position,anchor,days*86400]);
 add('bitcoinVault','MoreBitcoinRewardVaultV2',[contracts.position,c.tokens[2],contracts.bitcoinQuote,anchor,helper,c.cap]);
 for(const [i,key] of ['fuel','more'].entries())add(key+'Burner','ForkBurnEngine',[c.tokens[i],contracts[key==='fuel'?'fuelQuote':'mainQuote'],anchor,c.cap,600,helper]);
 add('feeRouter','MoreFeeRouterNoPamp',[[8,28,88].map(d=>contracts['vault'+d]),contracts.bitcoinVault,contracts.fuelBurner,contracts.moreBurner,OWNER].flat());
 add('position','MoreForgePositionV2',[c.tokens[1],contracts.feeQuote,contracts.feeRouter,helper,[10000,false,0,0]]);
 for(const [i,key] of ['fuel','more','bitcoin'].entries()){
  const route=chain==='eth'&&i===1?1:chain==='avax'&&i===2?3:0;
  add(key+'Adapter','MoreMultichainSwapAdapter',[contracts[key==='bitcoin'?'bitcoinVault':key+'Burner'],c.native,c.tokens[i],route===1?c.moreRouter:route===3?c.bitcoinRouter:c.router,ZeroAddress,route,c.fees[i],route===1?moreKey:empty]);
  call(key==='bitcoin'?'bitcoinVault':key+'Burner',key==='bitcoin'?'MoreBitcoinRewardVaultV2':'ForkBurnEngine','configureAdapter',[contracts[key+'Adapter']]);
 }
 add('settlementBatcher','MoreSettlementBatcherV2',[[8,28,88].map(d=>contracts['vault'+d]),contracts.bitcoinVault]);
 add('dripController','MoreDailyBurnController',[OWNER,[contracts.fuelBurner,contracts.moreBurner]]);
 for(const label of ['fuelBurner','moreBurner'])call(label,'ForkBurnEngine','transferOwnership',[contracts.dripController]);
 call('position','MoreForgePositionV2','setEntriesPaused',[false]);
 call('position','MoreForgePositionV2','renounceOwnership');
 call('bitcoinVault','MoreBitcoinRewardVaultV2','renounceOwnership');
 const planHash=keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','address','bytes[]','tuple(uint256 templateIndex,bytes constructorArgs,address expectedAddress)[]','tuple(address target,bytes data)[]'],[c.id,helper,templates,creations,setup]));
 const data=iface('MoreForgeDeployerV2').encodeFunctionData('deploy',[templates,creations,setup]);
 return {chain,chainId:c.id,owner:OWNER,nonce,helper,anchor,planHash,contracts,records,templates,creations,setup,transactions:[{from:OWNER,data:artifacts.MoreForgeDeployerV2.bytecode+iface('MoreForgeDeployerV2').encodeDeploy([OWNER,planHash]).slice(2),nonce:toBeHex(nonce),value:'0x0'},{from:OWNER,to:helper,data,nonce:toBeHex(nonce+1),value:'0x0'}]};
}
