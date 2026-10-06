const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const source=fs.readFileSync('ethereum/ethereum-live.js','utf8');
const sendSource=source.slice(source.indexOf('async function send('),source.indexOf("$('#wallet-button').onclick"));
async function fixture({chain='0x1',accounts=['0xowner'],simulationError=false,status=1,allowance=0n}={}){
 const calls=[],context={same:(a,b)=>a?.toLowerCase()===b?.toLowerCase(),account:'0xowner',signer:{},injected:{request:async p=>p.method==='eth_chainId'?chain:accounts},message:t=>calls.push(['message',t]),fuel:{allowance:async()=>allowance},Error};
 const method=async(...args)=>{calls.push(['send',...args]);return {hash:'0xtest',wait:async()=>({status})};};method.staticCall=async(...args)=>{calls.push(['simulate',...args]);if(simulationError)throw Error('guard rejected');};
 const contract={connect:()=>({approve:method,mint:method})};context.fuel.connect=contract.connect;
 vm.createContext(context);vm.runInContext(sendSource+';globalThis.testSend=send;globalThis.testApprove=approve;',context);
 return {calls,send:(...args)=>context.testSend(contract,...args),approve:(...args)=>context.testApprove(...args)};
}
(async()=>{
 let f=await fixture();await f.send('mint',[2n],17n);assert.deepEqual(f.calls.filter(c=>c[0]!=='message').map(c=>c[0]),['simulate','send']);assert.equal(f.calls.find(c=>c[0]==='send').at(-1).value,17n);
 f=await fixture({chain:'0xa86a'});await assert.rejects(f.send('mint',[1n],1n),/Ethereum/);assert.equal(f.calls.length,0);
 f=await fixture({accounts:['0xother']});await assert.rejects(f.send('mint',[1n],1n),/Wallet changed/);assert.equal(f.calls.length,0);
 f=await fixture({simulationError:true});await assert.rejects(f.send('mint',[1n],1n),/guard rejected/);assert.equal(f.calls.filter(c=>c[0]==='send').length,0);
 f=await fixture({status:0});await assert.rejects(f.send('mint',[1n],1n),/did not succeed/);
 f=await fixture({allowance:0n});await f.approve('0xspender',123n);assert.equal(f.calls.find(c=>c[0]==='send')[2],123n);
 f=await fixture({allowance:123n});await f.approve('0xspender',123n);assert.equal(f.calls.length,0);
 const config=JSON.parse(fs.readFileSync('ethereum/contracts.json'));const manifest=JSON.parse(fs.readFileSync('ethereum-launch-smaller/launch-package.json'));assert.deepEqual(config.addresses,manifest.addresses);assert.equal(config.launchTime,1791306000);
 console.log('8 checks passed: matching deployed addresses, exact transaction value and approval, sufficient allowance, simulation failure, wrong chain, changed account, failed receipt.');
})().catch(e=>{console.error(e);process.exitCode=1;});
