import {Interface,AbiCoder,getCreateAddress,keccak256,ZeroAddress,toBeHex} from '../vendor/ethers-6.15.0.js';
export const OWNER='0x02A0d741FBaebC03A8f0d1A85670bf1CA8C15fA9';
const bytes=hex=>(hex.length-2)/2;
function assert(ok,message='Deployment plan check failed'){if(!ok)throw Error(message);}
const eqAddress=(a,b)=>assert(a.toLowerCase()===b.toLowerCase(),'Address prediction mismatch');
export async function buildPlan(chain,c,artifacts,startNonce,timestamp,call){
 assert(['rh','pls'].includes(chain),'Unsupported deployment chain');
 assert(Number.isSafeInteger(startNonce)&&startNonce>=0,'Invalid owner nonce');
 const owner=OWNER,helper=getCreateAddress({from:owner,nonce:startNonce});
 let anchor=Math.floor(timestamp/86400)*86400+17*3600;
 if(anchor<=timestamp)anchor+=86400;
 const artifact=name=>({abi:artifacts[name].abi,bytecode:{object:artifacts[name].bytecode},deployedBytecode:{object:artifacts[name].runtime}});
 const iface=name=>new Interface(artifacts[name].abi);
 const initCode=(name,args)=>artifact(name).bytecode.object+iface(name).encodeDeploy(args).slice(2);
 async function read(target,signature,args=[]){const i=new Interface(['function '+signature]),f=i.fragments[0];return i.decodeFunctionResult(f,await call(target,i.encodeFunctionData(f,args)));}
const templates = [], templateNames = [], creations = [], setup = [], contracts = {}, sizes = [];
const nextAddress = (offset = 0) => getCreateAddress({from:helper, nonce:creations.length + 1 + offset});
function deploy(name, args, label) {
  const expectedAddress = nextAddress();
  const code = initCode(name,args);
  const runtimeBytes = bytes(artifact(name).deployedBytecode.object);
  assert(bytes(code) <= 49152, `${label} creation code too large`);
  assert(runtimeBytes <= 24576, `${label} runtime too large`);
  let templateIndex = templateNames.indexOf(name);
  if (templateIndex === -1) { templateIndex = templates.length; templates.push(artifact(name).bytecode.object); templateNames.push(name); }
  creations.push({templateIndex, constructorArgs:iface(name).encodeDeploy(args), expectedAddress}); contracts[label] = expectedAddress;
  sizes.push({label, contract:name, address:expectedAddress, initBytes:bytes(code), runtimeBytes});
  return expectedAddress;
}
function configure(target, name, method, args) { setup.push({target,data:iface(name).encodeFunctionData(method,args)}); }
const v4Key = [c.native,c.tokens[1],10000,200,c.hook || ZeroAddress];
const emptyKey = [ZeroAddress,ZeroAddress,0,0,ZeroAddress];
const mainQuote = chain === 'rh'
  ? deploy('MoreV4SpotQuote',['0xF3334192D15450CdD385c8B70e03f9A6bD9E673b',v4Key,c.native,c.tokens[1]],'mainQuote')
  : deploy('MoreV2SpotQuote',[c.pools[1],c.native,c.tokens[1]],'mainQuote');
const feeQuote = deploy('MorePoolFeeQuote',[mainQuote,ZeroAddress],'feeQuote');
const quotes = [];
for (let i=0;i<4;i++) {
  quotes.push(chain === 'pls'
    ? deploy('PulseV2RouterQuote',[c.router,c.pools[i],c.native,c.tokens[i]],`executionQuote${i}`)
    : i===1 ? mainQuote : deploy('MoreV3SpotQuote',[c.pools[i],c.native,c.tokens[i]],`executionQuote${i}`));
}
const predictedPosition = nextAddress(8);
const vaults = [8,28,88].map(days => deploy('MorePositionRewardVaultV2',[predictedPosition,anchor,days*86400],`vault${days}`));
const btcCap = chain==='rh' ? 5n*10n**17n : 1000000n*10n**18n;
const bitcoin = deploy('MoreBitcoinRewardVaultV2',[predictedPosition,c.tokens[3],quotes[3],anchor,helper,btcCap],'bitcoinVault');
const burnCap = chain==='rh' ? 10n**15n : 100000n*10n**18n;
const burners = c.tokens.slice(0,3).map((token,i) => deploy('ForkBurnEngine',[token,quotes[i],anchor,burnCap,600,helper],['fuelBurner','moreBurner','pampBurner'][i]));
const router = deploy('MoreFeeRouter',[...vaults,bitcoin,...burners,owner],'feeRouter');
const feeConfig = [10000,true,chain==='rh' ? 10n**15n : 200000n*10n**18n,chain==='rh' ? 10n**18n : 200000000n*10n**18n];
const position = deploy('MoreForgePositionV2',[c.tokens[1],feeQuote,router,helper,feeConfig],'position');
eqAddress(position,predictedPosition);
async function adapterArgs(controller, i) {
  const v4 = chain==='rh' && i===1;
  const fee = chain==='pls' || v4 ? 0 : (await read(c.pools[i],'fee() view returns(uint24)'))[0];
  return [controller,c.native,c.tokens[i],v4?c.moreRouter:c.router,v4?'0x000000000022D473030F116dDEE9F6B43aC78BA3':ZeroAddress,v4?1:chain==='pls'?2:0,fee,v4?v4Key:emptyKey];
}
const controllers = [...burners,bitcoin], adapters = [];
for (let i=0;i<4;i++) {
  adapters.push(deploy('ForkSwapAdapter',await adapterArgs(controllers[i],i),`adapter${i}`));
  configure(controllers[i], i===3?'MoreBitcoinRewardVaultV2':'ForkBurnEngine','configureAdapter',[adapters[i]]);
}
const batcher = deploy('MoreSettlementBatcherV2',[vaults,bitcoin],'settlementBatcher');
for (const [target,name] of [[position,'MoreForgePositionV2'],[bitcoin,'MoreBitcoinRewardVaultV2'],...burners.map(b=>[b,'ForkBurnEngine'])]) {
  configure(target,name,'transferOwnership',[owner]);
}
const planHash = keccak256(AbiCoder.defaultAbiCoder().encode(['uint256','address','bytes[]','tuple(uint256 templateIndex,bytes constructorArgs,address expectedAddress)[]','tuple(address target,bytes data)[]'],[c.id,helper,templates,creations,setup]));
const helperCode = initCode('MoreForgeDeployerV2',[owner,planHash]);
const batchData = iface('MoreForgeDeployerV2').encodeFunctionData('deploy',[templates,creations,setup]);
return {version:2,chain,chainId:c.id,owner,startNonce,helper,planHash,anchor,entriesPaused:true,contracts,templates,templateNames,creations,setup,transactions:[{from:owner,data:helperCode,nonce:toBeHex(startNonce),gas:toBeHex(815000),value:'0x0'},{from:owner,to:helper,data:batchData,nonce:toBeHex(startNonce+1),gas:toBeHex(chain==='rh'?21673774:21847671),value:'0x0'}],sizes};
}
