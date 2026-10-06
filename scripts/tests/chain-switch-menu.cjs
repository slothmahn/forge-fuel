const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const helper=fs.readFileSync('assets/wallet-chain-switch.js','utf8').replace('export async','async');
const menu=fs.readFileSync('assets/chain-switch-menu.js','utf8').replace(/^import .*;\n/gm,'').replace('import.meta.url',"'https://thefuelforge.com/assets/chain-switch-menu.js'");
(async()=>{
 for(const [path,id] of [['/',4663n],['/pulsechain/',369n],['/ethereum/',1n],['/avalanche/',43114n]]){
  const events=[];let chain=999n;const provider={request:async r=>{events.push(r);if(r.method==='eth_chainId')return '0x'+chain.toString(16);if(r.method==='wallet_switchEthereumChain')chain=BigInt(r.params[0].chainId);}};
  const link={href:'https://thefuelforge.com'+path+'#rewards',closest:()=>({open:true}),addEventListener:(_,fn)=>link.click=fn};
  const context={URL,BigInt,Error,window:{forgeConnectedWalletProvider:provider},document:{querySelectorAll:()=>[link]},location:{assign:url=>events.push({navigation:url})},findWalletProvider:async()=>null};vm.createContext(context);vm.runInContext(helper+'\n'+menu,context);await link.click({button:0,preventDefault(){}});assert.equal(chain,id);assert.equal(new URL(events.at(-1).navigation).searchParams.get('chain'),String(id));assert.equal(new URL(events.at(-1).navigation).hash,'#rewards');assert.equal(context.window.forgeManualChainSwitch,false);
 }
 for(const fail of [4001,123]){let navigated=false,notified=false;const link={href:'https://thefuelforge.com/pulsechain/',closest:()=>({open:true}),addEventListener:(_,fn)=>link.click=fn};const context={URL,BigInt,Error,window:{forgeConnectedWalletProvider:{request:async r=>{if(r.method==='eth_chainId')return '0x1';throw Object.assign(Error('switch failed'),{code:fail});}},notify:()=>notified=true},document:{querySelectorAll:()=>[link]},location:{assign:()=>navigated=true},findWalletProvider:async()=>null};vm.createContext(context);vm.runInContext(helper+'\n'+menu,context);await link.click({button:0,preventDefault(){}});assert.equal(navigated,false);assert.equal(notified,true);assert.equal(context.window.forgeManualChainSwitch,false);}
 console.log('6 network-menu checks passed: all four networks switch before navigation, selected chain/hash survive, cancellation/failure stays on the current page.');
})().catch(e=>{console.error(e);process.exitCode=1;});
