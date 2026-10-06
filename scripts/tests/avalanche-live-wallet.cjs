const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('avalanche/avalanche-live.js','utf8');
const sendSource=source.slice(source.indexOf('async function send('),source.indexOf("$('#wallet-button').onclick"));
async function fixture({chain='0xa86a',accounts=['0xowner'],simulationError=false,status=1,allowance=0n}={}){
 const calls=[],context={same:(a,b)=>a?.toLowerCase()===b?.toLowerCase(),account:'0xowner',signer:{},injected:{request:async p=>p.method==='eth_chainId'?chain:accounts},message:t=>calls.push(['message',t]),fuel:{allowance:async()=>allowance},Error};
 const method=async(...args)=>{calls.push(['send',...args]);return {hash:'0xtest',wait:async()=>({status})};};method.staticCall=async(...args)=>{calls.push(['simulate',...args]);if(simulationError)throw Error('guard rejected');};
 const contract={connect:()=>({approve:method,mint:method})};context.fuel.connect=contract.connect;
 vm.createContext(context);vm.runInContext(sendSource+';globalThis.testSend=send;globalThis.testApprove=approve;',context);
 return {calls,send:(...args)=>context.testSend(contract,...args),approve:(...args)=>context.testApprove(...args)};
}
(async()=>{
 let f=await fixture();await f.send('mint',[2n],17n);assert.deepEqual(f.calls.filter(c=>c[0]!=='message').map(c=>c[0]),['simulate','send']);assert.equal(f.calls.find(c=>c[0]==='send').at(-1).value,17n);
 f=await fixture({chain:'0x1'});await assert.rejects(f.send('mint',[1n],1n),/Avalanche/);assert.equal(f.calls.length,0);
 f=await fixture({accounts:['0xother']});await assert.rejects(f.send('mint',[1n],1n),/Wallet changed/);assert.equal(f.calls.length,0);
 f=await fixture({simulationError:true});await assert.rejects(f.send('mint',[1n],1n),/guard rejected/);assert.equal(f.calls.filter(c=>c[0]==='send').length,0);
 f=await fixture({status:0});await assert.rejects(f.send('mint',[1n],1n),/did not succeed/);
 f=await fixture({allowance:0n});await f.approve('0xspender',123n);assert.equal(f.calls.find(c=>c[0]==='send')[2],123n);
 f=await fixture({allowance:123n});await f.approve('0xspender',123n);assert.equal(f.calls.length,0);
 const connectSource=source.slice(source.indexOf('async function connect('),source.indexOf('function resetWallet('));
 for(const unknown of [false,true]){const requests=[];const provider={request:async p=>{requests.push(p);if(p.method==='eth_chainId')return '0x1';if(p.method==='wallet_switchEthereumChain'&&unknown)throw Object.assign(Error('missing chain'),{code:4902});}};const ctx={window:{},rememberWalletProvider:()=>{},findWalletProvider:async()=>({provider}),BrowserProvider:class{async getSigner(){return{getAddress:async()=> '0xowner'}}},resetWallet:()=>{},text:()=>{},refresh:async()=>{},BigInt,Error};vm.createContext(ctx);vm.runInContext(connectSource+';globalThis.runConnect=connect;',ctx);await ctx.runConnect();assert.equal(requests.find(r=>r.method==='wallet_switchEthereumChain').params[0].chainId,'0xa86a');assert.equal(requests.some(r=>r.method==='wallet_addEthereumChain'),unknown);if(unknown)assert.equal(requests.find(r=>r.method==='wallet_addEthereumChain').params[0].nativeCurrency.symbol,'AVAX');}
 const config=JSON.parse(fs.readFileSync('avalanche/contracts.json'));const manifest=JSON.parse(fs.readFileSync('avalanche-launch/launch-package.json'));assert.deepEqual(config.addresses,manifest.addresses);assert.equal(config.launchTime,1791306000);
 console.log('10 checks passed (including network switch and missing-chain setup): matching deployed addresses, exact transaction value and approval, sufficient allowance, simulation failure, wrong chain, changed account, failed receipt.');
})().catch(e=>{console.error(e);process.exitCode=1;});
