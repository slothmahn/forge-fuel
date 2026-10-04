const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const session = fs.readFileSync('assets/wallet-session.js','utf8').replaceAll('export ', '');
async function discover(providers, stored = '') {
 const listeners = {}; const calls = [];
 const wallets = providers.map(({id,accounts,fail})=>({id,request:async({method})=>{calls.push(method);if(fail)throw Error('locked');return accounts;}}));
 const window={addEventListener:(type,fn)=>listeners[type]=fn,dispatchEvent:event=>{if(event.type==='eip6963:requestProvider')wallets.forEach(provider=>listeners['eip6963:announceProvider']({detail:{provider,info:{rdns:provider.id}}}));}};
 const context=vm.createContext({window,localStorage:{getItem:()=>stored,setItem(){}},Event:class{constructor(type){this.type=type;}},setTimeout:fn=>fn()});
 vm.runInContext(session,context);
 return {found:await vm.runInContext('findWalletProvider(true)',context),calls};
}
(async()=>{
 let result=await discover([{id:'first',accounts:[]},{id:'chosen',accounts:['0xabc']}]);
 assert.equal(result.found.provider.id,'chosen');assert(result.calls.every(method=>method==='eth_accounts'));
 result=await discover([{id:'first',accounts:['0xaaa']},{id:'chosen',accounts:['0xbbb']}],'chosen');assert.equal(result.found.provider.id,'chosen');
 result=await discover([{id:'locked',fail:true},{id:'unapproved',accounts:[]}]);assert.equal(result.found,null);
 result=await discover([]);assert.equal(result.found,null);
 for(const [file,expected] of [['assets/mainnet-white-paper-v1.js',4663n],['assets/pulse-mainnet.js',369n]]){
  const source=fs.readFileSync(file,'utf8');const code=source.slice(source.indexOf('const fuelWalletListeners='),source.indexOf('async function vf(){'));
  for(const chain of [expected,1n]){
   const calls=[], labels={};const publicProvider={public:true};const ctx={Z:{publicProvider},fuelPublicReadsAllowed:false,window:{location:{reload(){}},forgeRouteWalletChain(){}},gd:class{async getSigner(){calls.push('signer');return {authorized:true}}},N:x=>x,Jd:x=>x,Y:(key,value)=>labels[key]=value,J:()=>({}),rememberWalletProvider(){},pf(){},ff(){}};
   vm.createContext(ctx);vm.runInContext(code,ctx);
   await ctx.attachFuelWallet({request:async({method})=>{calls.push(method);assert.equal(method,'eth_chainId');return '0x'+chain.toString(16)},on(){}},['0xabc']);
   assert.equal(ctx.Z.address,'0xabc');assert.equal(ctx.Z.provider,publicProvider);
   assert.equal(Boolean(ctx.Z.signer),chain===expected);
   if(chain!==expected)assert.match(labels['#connect'],/^Switch to /);
  }
 }
 console.log('Wallet restoration: authorized selection, saved preference, locked/no-wallet handling, both-chain signer gates and public reads passed.');
})().catch(error=>{console.error(error);process.exitCode=1});
